/*
 * Copyright © 2024 Kaleido, Inc.
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
//nolint
package main

import "C"
import (
	"context"

	"github.com/hyperledger/firefly-common/pkg/log"

	"github.com/kaleido-io/paladin/kata/test/plugins/transport/B/pkg/provider"
)

func BuildInfo() string {
	return provider.BuildInfo()
}

//func InitializeTransportProvider(socketAddress string, listenerDestination string) error {

//export InitializeTransportProvider
func InitializeTransportProvider(socketAddress *C.char, listenerDestination *C.char) {
	ctx := context.Background()
	log.L(ctx).Info("InitializeTransportProvider")
	log.L(ctx).Infof("Socket address = %s, listener destinatino = %s", C.GoString(socketAddress), C.GoString(listenerDestination))

	err := provider.InitializeTransportProvider(C.GoString(socketAddress), C.GoString(listenerDestination))
	if err != nil {
		log.L(ctx).Errorf("Error initializing transport provider: %s", err)
	}
}

func main() {}
