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

package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/google/uuid"
	"github.com/kaleido-io/paladin/config/pkg/pldconf"
	"github.com/kaleido-io/paladin/core/internal/componentmgr"
	"github.com/kaleido-io/paladin/core/internal/plugins"
	"github.com/kaleido-io/paladin/domains/zeto/pkg/zeto"
	"github.com/kaleido-io/paladin/registries/static/pkg/static"
	"github.com/kaleido-io/paladin/toolkit/pkg/log"
	"github.com/kaleido-io/paladin/toolkit/pkg/plugintk"
	"github.com/kaleido-io/paladin/transports/grpc/pkg/grpc"
	"github.com/spf13/cobra"
)

var nodeID string
var nodeName string
var confFile string

func init() {
	startCmd.Flags().StringVarP(&nodeID, "node-id", "i", "", "uuid for node")
	startCmd.Flags().StringVarP(&nodeName, "node-name", "n", "", "readable name for node")
	startCmd.Flags().StringVarP(&confFile, "conf", "c", "", "path to config file")
}

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start the go lang components for a node",
	Long:  `Runs the core golang component, including any specified golang based plugins`,
	Run: func(cmd *cobra.Command, args []string) {
		ctx := context.Background()
		i := newInstanceForManualTesting(ctx, nodeID, nodeName)
		<-i.ctx.Done()
		i.cleanup()
	},
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() {
	rootCmd := &cobra.Command{Use: "app"}
	rootCmd.AddCommand(startCmd)
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		// Exit with a non-zero status code
		os.Exit(1)
	}
}

type manualTestInstance struct {
	grpcTarget string
	id         uuid.UUID
	name       string // useful for debugging and logging
	conf       *pldconf.PaladinConfig
	ctx        context.Context
	cleanup    func()
}

func newInstanceForManualTesting(ctx context.Context, nodeID string, nodeName string) *manualTestInstance {

	f, err := os.CreateTemp("", "component-test.*.sock")
	if err != nil {
		panic(err)
	}

	grpcTarget := f.Name()

	err = f.Close()
	if err != nil {
		panic(err)
	}

	err = os.Remove(grpcTarget)
	if err != nil {
		panic(err)
	}

	conf := readConfig(ctx, confFile)
	i := &manualTestInstance{
		grpcTarget: grpcTarget,
		id:         uuid.MustParse(nodeID),
		name:       nodeName,
		conf:       &conf,
	}
	i.ctx = log.WithLogField(context.Background(), "node-id", nodeID)
	i.ctx = log.WithLogField(i.ctx, "node-name", nodeName)

	var pl plugins.UnitTestPluginLoader

	cm := componentmgr.NewComponentManager(i.ctx, i.grpcTarget, i.id, i.conf)
	// Start it up
	err = cm.Init()
	if err != nil {
		panic(err)
	}

	err = cm.StartComponents()
	if err != nil {
		panic(err)
	}

	err = cm.StartManagers()
	if err != nil {
		panic(err)
	}

	loaderMap := map[string]plugintk.Plugin{
		"zeto":      NewZetoPlugin(i.ctx),
		"grpc":      grpc.NewPlugin(i.ctx),
		"registry1": static.NewPlugin(i.ctx),
	}
	pc := cm.PluginManager()
	pl, err = plugins.NewUnitTestPluginLoader(pc.GRPCTargetURL(), pc.LoaderID().String(), loaderMap)
	if err != nil {
		panic(err)
	}
	go pl.Run()

	err = cm.CompleteStart()
	if err != nil {
		panic(err)
	}

	i.cleanup = func() {
		pl.Stop()
		cm.Stop()
	}

	return i

}

func NewZetoPlugin(ctx context.Context) plugintk.PluginBase {
	return plugintk.NewDomain(func(callbacks plugintk.DomainCallbacks) plugintk.DomainAPI {
		return zeto.New(callbacks)
	})
}

func readConfig(ctx context.Context, confFilePath string) pldconf.PaladinConfig {

	var conf *pldconf.PaladinConfig
	err := pldconf.ReadAndParseYAMLFile(ctx, confFilePath, &conf)
	if err != nil {
		panic(err)
	}
	return *conf

}
