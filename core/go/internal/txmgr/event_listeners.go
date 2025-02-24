/*
 * Copyright © 2025 Kaleido, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package txmgr

import (
	"context"
	"sync"

	"github.com/google/uuid"
	"github.com/kaleido-io/paladin/core/internal/components"
	"github.com/kaleido-io/paladin/core/internal/filters"
	"github.com/kaleido-io/paladin/core/internal/msgs"
	"github.com/kaleido-io/paladin/core/pkg/blockindexer"
	"github.com/kaleido-io/paladin/core/pkg/persistence"
	"github.com/kaleido-io/paladin/toolkit/pkg/i18n"
	"github.com/kaleido-io/paladin/toolkit/pkg/log"
	"github.com/kaleido-io/paladin/toolkit/pkg/pldapi"
	"github.com/kaleido-io/paladin/toolkit/pkg/tktypes"
)

type persistedEventListener struct {
	Name    string            `gorm:"column:name"`
	Created tktypes.Timestamp `gorm:"column:created"`
	Started *bool             `gorm:"column:started"`
	Filters tktypes.RawJSON   `gorm:"column:filters"`
	Options tktypes.RawJSON   `gorm:"column:options"`
}

var eventListenerFilters = filters.FieldMap{
	"name":    filters.StringField("name"),
	"created": filters.TimestampField("created"),
}

func (persistedEventListener) TableName() string {
	return "event_listeners"
}

type persistedEventCheckpoint struct {
	Listener string            `gorm:"column:listener"`
	Sequence uint64            `gorm:"column:sequence"`
	Time     tktypes.Timestamp `gorm:"column:time"`
}

func (persistedEventCheckpoint) TableName() string {
	return "event_listener_checkpoints"
}

// TODO Define EventListener

func (tm *txManager) CreateEventListener(ctx context.Context, spec *pldapi.EventListener) error {

	log.L(ctx).Infof("Creating event listener '%s'", spec.Name)
	// Need to figure out this validation
	// if err := tm.validateListenerSpec(ctx, spec); err != nil {
	// 	return err
	// }

	started := (spec.Started == nil /* default is true */) || *spec.Started
	dbSpec := &persistedEventListener{
		Name:    spec.Name,
		Started: &started,
		Created: tktypes.TimestampNow(),
		Filters: tktypes.JSONString(&spec.Filters),
		Options: tktypes.JSONString(&spec.Options),
	}
	if insertErr := tm.p.DB().
		WithContext(ctx).
		Create(dbSpec).
		Error; insertErr != nil {

		log.L(ctx).Errorf("Failed to create event listener '%s': %s", spec.Name, insertErr)

		// Check for a simple duplicate object
		// if existing := tm.GetEventListener(ctx, spec.Name); existing != nil {
		// 	return i18n.NewError(ctx, msgs.MsgTxMgrDuplicateReceiptListenerName, spec.Name)
		// }

		// Otherwise return the error
		return insertErr
	}

	// Load the created listener now - we do not expect (or attempt to reconcile) a post-validation failure to load
	l, err := tm.loadEventListener(ctx, spec)
	if err == nil && *l.spec.Started {
		err = l.start()
	}

	return nil
}

func (tm *txManager) loadEventListener(ctx context.Context, spec *pldapi.EventListener) (*eventListener, error) {

	// TODO figure out spec in a sec
	// spec, err := tm.mapListener(ctx, pl)
	// if err != nil {
	// 	return nil, err
	// }

	l := &eventListener{
		tm:           tm,
		spec:         spec,
		newReceivers: make(chan bool, 1),
		newEvents:    make(chan bool, 1),
	}

	tm.eventListenerLock.Lock()
	defer tm.eventListenerLock.Unlock()
	if tm.eventListeners[spec.Name] != nil {
		// TODO update message
		return nil, i18n.NewError(ctx, msgs.MsgTxMgrReceiptListenerDupLoad, spec.Name)
	}
	tm.eventListeners[spec.Name] = l
	return l, nil
}

func (tm *txManager) AddEventReceiver(ctx context.Context, name string, r components.EventReceiver) (components.ReceiverCloser, error) {
	tm.eventListenerLock.Lock()
	defer tm.eventListenerLock.Unlock()

	l := tm.eventListeners[name]
	if l == nil {
		return nil, i18n.NewError(ctx, msgs.MsgTxMgrReceiptListenerNotLoaded, name)
	}

	return l.addReceiver(r), nil
}

type eventListener struct {
	tm *txManager

	ctx       context.Context
	cancelCtx context.CancelFunc

	spec        *pldapi.EventListener
	eventStream *blockindexer.EventStream

	newEvents chan bool

	nextBatchID  uint64
	newReceivers chan bool
	receiverLock sync.Mutex
	receivers    []*registeredEventReceiver
	done         chan struct{}
}

type registeredEventReceiver struct {
	id uuid.UUID
	l  *eventListener
	components.EventReceiver
}

func (l *eventListener) start() error {
	eventSources := blockindexer.EventSources{}
	for _, filter := range l.spec.Filters {
		eventSources = append(eventSources, blockindexer.EventStreamSource{
			ABI:     filter.ABI,
			Address: filter.Address,
		})
	}

	eventStream := &blockindexer.EventStream{
		Name:    l.spec.Name,
		Type:    blockindexer.EventStreamTypeExternal.Enum(),
		Sources: eventSources,
	}

	iES := &blockindexer.InternalEventStream{
		Type:       blockindexer.IESTypeEventStream,
		Definition: eventStream,
		Handler:    l.handleEventBatch,
	}

	// Once the event stream is created it's already started....
	// NOTX??
	var err error
	l.eventStream, err = l.tm.blockIndexer.AddEventStream(l.ctx, l.tm.p.NOTX(), iES)
	return err
}

func (rr *registeredEventReceiver) Close() {
	// Need to stop the event stream in the blockindexer
	rr.l.removeReceiver(rr.id)
}

// Add Receiver func
func (l *eventListener) addReceiver(r components.EventReceiver) components.ReceiverCloser {
	l.receiverLock.Lock()
	defer l.receiverLock.Unlock()

	registered := &registeredEventReceiver{
		id:            uuid.New(),
		l:             l,
		EventReceiver: r,
	}
	l.receivers = append(l.receivers, registered)

	select {
	case l.newReceivers <- true:
	default:
	}

	return registered
}

// TODO probably some common code with the receipt receiver
func (l *eventListener) removeReceiver(rid uuid.UUID) {
	l.receiverLock.Lock()
	defer l.receiverLock.Unlock()

	if len(l.receivers) > 0 {
		newReceivers := make([]*registeredEventReceiver, 0, len(l.receivers)-1)
		for _, existing := range l.receivers {
			if existing.id != rid {
				newReceivers = append(newReceivers, existing)
			}
		}
		l.receivers = newReceivers
	}
}

// Round robin next receiver
func (l *eventListener) nextReceiver(b *blockindexer.EventDeliveryBatch) (r components.EventReceiver, err error) {

	for {
		l.receiverLock.Lock()
		if len(l.receivers) > 0 {
			r = l.receivers[int(l.nextBatchID)%len(l.receivers)]
		}
		l.receiverLock.Unlock()

		if r != nil {
			return r, nil
		}

		select {
		case <-l.newReceivers:
		case <-l.ctx.Done():
			return nil, i18n.NewError(l.ctx, msgs.MsgContextCanceled)
		}
	}
}

func (l *eventListener) handleEventBatch(ctx context.Context, dbTX persistence.DBTX, batch *blockindexer.EventDeliveryBatch) error {
	// THIS BLOCKS THE WHOLE EVENT STREAM

	// We need to call the receivers if any...
	// Wait for an ack back
	// If we get an ack, we can commit the checkpoint to the event stream that has called us!
	l.nextBatchID++
	r, err := l.nextReceiver(batch)
	if err != nil {
		return err
	}

	log.L(l.ctx).Infof("Delivering event batch %d from stream %s (events=%d)", l.nextBatchID, batch.StreamID, len(batch.Events))
	err = r.DeliverEventBatch(l.ctx, l.nextBatchID, batch.Events)
	log.L(l.ctx).Infof("Delivered receipt batch %d (err=%v)", l.nextBatchID, err)
	return err
}
