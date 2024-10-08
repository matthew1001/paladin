/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package e2e

import (
	"context"
	"fmt"
	"os/exec"
	"time"

	_ "embed"

	"github.com/kaleido-io/paladin/config/pkg/pldconf"
	"github.com/kaleido-io/paladin/operator/test/utils"
	"github.com/kaleido-io/paladin/toolkit/pkg/log"
	"github.com/kaleido-io/paladin/toolkit/pkg/ptxapi"
	"github.com/kaleido-io/paladin/toolkit/pkg/query"
	"github.com/kaleido-io/paladin/toolkit/pkg/rpcclient"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

const disableCleanup = true

const namespace = "paladin-e2e" // if changed, must also change the JSON

//go:embed e2e_single_node_besugenesis.json
var e2eSingleNodeBesuGenesisJSON string

//go:embed e2e_single_node_besu.json
var e2eSingleNodeBesuJSON string

//go:embed e2e_single_node_paladin_psql_nodomains.json
var e2eSingleNodePaladinPSQLNoDomainsJSON string

//go:embed abis/PenteFactory.json
var penteFactoryBuild string

//go:embed abis/NotoFactory.json
var notoFactoryBuild string

func startPaladinOperator() {
	var controllerPodName string
	var err error
	log.SetLevel("debug")

	// projectImage stores the name of the image used in the example
	var projectImage = "paladin-operator:latest"

	var clusterName = "paladin"

	By("building the manager(Operator) image")
	cmd := exec.Command("make", "docker-build", fmt.Sprintf("IMG=%s", projectImage))
	_, err = utils.Run(cmd)
	ExpectWithOffset(0, err).NotTo(HaveOccurred())

	By("ensuring the kind cluster is up")
	cmd = exec.Command("make", "kind-start",
		fmt.Sprintf("CLUSTER_NAME=%s", clusterName),
	)
	_, err = utils.Run(cmd)
	ExpectWithOffset(0, err).NotTo(HaveOccurred())

	By("ensuring the latest built images are available in the kind cluster")
	cmd = exec.Command("make", "kind-promote",
		fmt.Sprintf("IMG=%s", projectImage),
		fmt.Sprintf("CLUSTER_NAME=%s", clusterName),
	)
	_, err = utils.Run(cmd)
	ExpectWithOffset(0, err).NotTo(HaveOccurred())

	By("ensuring the latest CRDs are applied with kustomize before doing a helm install")
	cmd = exec.Command("make", "install-crds")
	_, err = utils.Run(cmd)
	ExpectWithOffset(0, err).NotTo(HaveOccurred())

	By("installing via Helm")
	cmd = exec.Command("make", "helm-install",
		fmt.Sprintf("IMG=%s", projectImage),
		fmt.Sprintf("NAMESPACE=%s", namespace),
	)
	_, err = utils.Run(cmd)
	ExpectWithOffset(0, err).NotTo(HaveOccurred())

	By("validating that the controller-manager pod is running as expected")
	verifyControllerUp := func() error {
		// Get pod name

		cmd = exec.Command("kubectl", "get",
			"pods", "-l", "app.kubernetes.io/name=paladin-operator",
			"-o", "go-template={{ range .items }}"+
				"{{ if not .metadata.deletionTimestamp }}"+
				"{{ .metadata.name }}"+
				"{{ \"\\n\" }}{{ end }}{{ end }}",
			"-n", namespace,
		)

		podOutput, err := utils.Run(cmd)
		ExpectWithOffset(1, err).NotTo(HaveOccurred())
		podNames := utils.GetNonEmptyLines(string(podOutput))
		if len(podNames) != 1 {
			return fmt.Errorf("expect 1 controller pods running, but got %d", len(podNames))
		}
		controllerPodName = podNames[0]
		ExpectWithOffset(1, controllerPodName).Should(ContainSubstring("paladin-operator"))

		// Validate pod status
		cmd = exec.Command("kubectl", "get",
			"pods", controllerPodName, "-o", "jsonpath={.status.phase}",
			"-n", namespace,
		)
		status, err := utils.Run(cmd)
		ExpectWithOffset(1, err).NotTo(HaveOccurred())
		if string(status) != "Running" {
			return fmt.Errorf("controller pod in %s status", status)
		}
		return nil
	}
	EventuallyWithOffset(0, verifyControllerUp, time.Minute, time.Second).Should(Succeed())
}

func verifyStatusUpdate(namespace, kind, name, expectedPhase string, expectedConditions []string) {
	cmd := exec.Command("kubectl", "get", kind, name, "-n", namespace, "-o", "json")
	output, err := utils.Run(cmd)
	ExpectWithOffset(1, err).NotTo(HaveOccurred())

	// Check the phase
	phaseSlice, err := utils.GetJSONPath(output, "{.status.phase}")
	ExpectWithOffset(1, err).NotTo(HaveOccurred())
	ExpectWithOffset(1, len(phaseSlice)).Should(Equal(1), "Expected exactly one phase")
	phase := phaseSlice[0]
	ExpectWithOffset(1, phase).Should(Equal(expectedPhase))

	// Check the conditions
	conditions, err := utils.GetJSONPath(output, "{.status.conditions[*].type}")
	ExpectWithOffset(1, err).NotTo(HaveOccurred())
	ExpectWithOffset(1, conditions).Should(ConsistOf(expectedConditions))
}

var _ = Describe("controller", Ordered, func() {
	BeforeAll(func() {
		By("installing prometheus operator")
		Expect(utils.InstallPrometheusOperator()).To(Succeed())

		By("installing the cert-manager")
		Expect(utils.InstallCertManager()).To(Succeed())

		By("creating manager namespace")
		cmd := exec.Command("kubectl", "create", "ns", namespace)
		_, _ = utils.Run(cmd)

		startPaladinOperator()
	})

	AfterAll(func() {
		if !disableCleanup {
			By("uninstalling the Prometheus manager bundle")
			utils.UninstallPrometheusOperator()

			By("uninstalling the cert-manager bundle")
			utils.UninstallCertManager()

			By("removing manager namespace")
			cmd := exec.Command("kubectl", "delete", "ns", namespace)
			_, _ = utils.Run(cmd)
		}
	})

	Context("Paladin Single Node", func() {
		It("start up the node", func() {
			ctx := context.Background()

			By("creating a genesis CR with a single validator")
			err := utils.KubectlApplyJSON(e2eSingleNodeBesuGenesisJSON)
			ExpectWithOffset(1, err).NotTo(HaveOccurred())

			// verify the CR status is updated
			GenCR, err := utils.StrToUnstructured(e2eSingleNodeBesuGenesisJSON)
			ExpectWithOffset(1, err).NotTo(HaveOccurred())
			verifyStatusUpdate(GenCR.GetNamespace(), GenCR.GetKind(), GenCR.GetName(), "Completed", []string{
				"ConfigMap",
			})

			By("creating a Besu node CR")
			err = utils.KubectlApplyJSON(e2eSingleNodeBesuJSON)
			ExpectWithOffset(1, err).NotTo(HaveOccurred())

			// verify the CR status is updated
			BesuCR, err := utils.StrToUnstructured(e2eSingleNodeBesuJSON)
			ExpectWithOffset(1, err).NotTo(HaveOccurred())
			verifyStatusUpdate(BesuCR.GetNamespace(), BesuCR.GetKind(), BesuCR.GetName(), "Completed", []string{
				"StatefulSet",
				"GenesisAvailable",
				"Service",
				"PodDisruptionBudget",
				"PersistentVolumeClaim",
			})

			By("creating a Paladin node CR")
			err = utils.KubectlApplyJSON(e2eSingleNodePaladinPSQLNoDomainsJSON)
			ExpectWithOffset(1, err).NotTo(HaveOccurred())

			// verify the CR status is updated
			PaladinCR, err := utils.StrToUnstructured(e2eSingleNodePaladinPSQLNoDomainsJSON)
			ExpectWithOffset(1, err).NotTo(HaveOccurred())
			verifyStatusUpdate(PaladinCR.GetNamespace(), PaladinCR.GetKind(), PaladinCR.GetName(), "Completed", []string{
				"StatefulSet",
				"ConfigMap",
				"Service",
				"PersistentVolumeClaim",
				"PodDisruptionBudget",
			})

			rpc, err := rpcclient.NewHTTPClient(ctx, &pldconf.HTTPClientConfig{
				URL: "http://127.0.0.1:31548",
			})
			ExpectWithOffset(1, err).NotTo(HaveOccurred())

			By("waiting for Paladin node to be ready")
			EventuallyWithOffset(1, func() error {
				var txs []*ptxapi.Transaction
				return rpc.CallRPC(ctx, &txs, "ptx_queryPendingTransactions", query.NewQueryBuilder().Limit(1).Query(), false)
			}, time.Minute, 100*time.Millisecond).Should(Succeed())

			deployer := utils.TestDeployer{RPC: rpc, From: "deployerKey"}

			By("deploying the pente factory")
			_, err = deployer.DeploySmartContractBytecode(ctx, penteFactoryBuild, []any{})
			ExpectWithOffset(1, err).NotTo(HaveOccurred())
			// penteFactoryAddr := receipt.ContractAddress
			// By("recording pente factory deployed at " + penteFactoryAddr.String())

			By("deploying the noto factory")
			_, err = deployer.DeploySmartContractBytecode(ctx, notoFactoryBuild, []any{})
			ExpectWithOffset(1, err).NotTo(HaveOccurred())
			// notoFactoryAddr := receipt.ContractAddress
			// By("recording noto factory deployed at " + notoFactoryAddr.String())

		})
	})
})
