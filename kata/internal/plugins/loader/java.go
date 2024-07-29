// Copyright © 2024 Kaleido, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
// the License. You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
// SPDX-License-Identifier: Apache-2.0

package loader

import (
	"context"

	"github.com/google/uuid"
	"github.com/hyperledger/firefly-common/pkg/log"
	"github.com/kaleido-io/paladin/kata/internal/commsbus"
	pbPlugin "github.com/kaleido-io/paladin/kata/pkg/proto/plugin"
)

// functions specific to loading plugins that are built as go plugin shared libraries
type javaPluginLoader struct {
}

func (g *javaProviderBinding) BuildInfo(ctx context.Context) (string, error) {

	return "build info for java", nil
}

func (g *javaProviderBinding) InitializeTransportProvider(ctx context.Context, socketAddress string, providerListenerDestination string) error {

	return nil
}

type javaProviderBinding struct {
}

func (_ *javaPluginLoader) Load(ctx context.Context, providerConfig Config, commsBus commsbus.CommsBus) (ProviderBinding, error) {

	log.L(ctx).Infof("Loading java provider %s", providerConfig.Path)
	// Send a message to the portara server to load the java plugin
	err := commsBus.Broker().SendMessage(ctx, commsbus.Message{
		ID:          uuid.New().String(),
		Destination: "io.kaleido.kata.pluginLoader",
		Body: &pbPlugin.LoadJavaProviderRequest{
			JarPath:           providerConfig.Path,
			ProviderClassName: "com.kaleido.io.paladin.kata.test.plugins.transport.B",
		},
	})
	if err != nil {
		log.L(ctx).Errorf("Failed to send message to load java provider: %v", err)
		return nil, err
	}
	binding := &javaProviderBinding{}

	return binding, nil
}
