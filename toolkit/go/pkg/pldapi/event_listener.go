// Copyright © 2024 Kaleido, Inc.
//
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package pldapi

import (
	"github.com/hyperledger/firefly-signer/pkg/abi"
	"github.com/kaleido-io/paladin/toolkit/pkg/tktypes"
)

type EventListener struct {
	Name    string            `docstruct:"EventListener" json:"name"`
	Created tktypes.Timestamp `docstruct:"EventListener" json:"created"`
	Started *bool             `docstruct:"EventListener" json:"started"`
	// Need to figure if there are Paladin events and not just blockindexer events
	// For example a domain emitting their own Paladin event for a business tx!
	Filters []EventListenerFilter `docstruct:"EventListener" json:"filters"`
	Options EventListenerOptions  `docstruct:"EventListener" json:"options"`
}

type EventListenerOptions struct {
	BatchSize    *int    `json:"batchSize,omitempty"`
	BatchTimeout *string `json:"batchTimeout,omitempty"`
}

type EventListenerFilter struct {
	ABI     abi.ABI             `json:"abi,omitempty"`
	Address *tktypes.EthAddress `json:"address,omitempty"` // optional
}
