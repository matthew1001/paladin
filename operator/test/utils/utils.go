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

package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/util/jsonpath"

	"github.com/google/uuid"
	"github.com/hyperledger/firefly-signer/pkg/abi"
	"github.com/kaleido-io/paladin/toolkit/pkg/ptxapi"
	"github.com/kaleido-io/paladin/toolkit/pkg/rpcclient"
	"github.com/kaleido-io/paladin/toolkit/pkg/tktypes"
	"github.com/onsi/ginkgo/v2" //nolint:golint,revive
)

const (
	prometheusOperatorVersion = "v0.72.0"
	prometheusOperatorURL     = "https://github.com/prometheus-operator/prometheus-operator/" +
		"releases/download/%s/bundle.yaml"

	certmanagerVersion = "v1.14.4"
	certmanagerURLTmpl = "https://github.com/jetstack/cert-manager/releases/download/%s/cert-manager.yaml"
)

func warnError(err error) {
	fmt.Fprintf(ginkgo.GinkgoWriter, "warning: %v\n", err)
}

// InstallPrometheusOperator installs the prometheus Operator to be used to export the enabled metrics.
func InstallPrometheusOperator() error {
	UninstallPrometheusOperator() // in case of a CTRL+C on prev test
	url := fmt.Sprintf(prometheusOperatorURL, prometheusOperatorVersion)
	cmd := exec.Command("kubectl", "create", "-f", url)
	_, err := Run(cmd)
	return err
}

// Run executes the provided command within this context
func Run(cmd *exec.Cmd) ([]byte, error) {
	dir, _ := GetProjectDir()
	cmd.Dir = dir

	if err := os.Chdir(cmd.Dir); err != nil {
		fmt.Fprintf(ginkgo.GinkgoWriter, "chdir dir: %s\n", err)
	}

	cmd.Env = append(os.Environ(), "GO111MODULE=on")
	command := strings.Join(cmd.Args, " ")
	fmt.Fprintf(ginkgo.GinkgoWriter, "running: %s\n", command)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return output, fmt.Errorf("%s failed with error: (%v) %s", command, err, string(output))
	}

	return output, nil
}

// UninstallPrometheusOperator uninstalls the prometheus
func UninstallPrometheusOperator() {
	url := fmt.Sprintf(prometheusOperatorURL, prometheusOperatorVersion)
	cmd := exec.Command("kubectl", "delete", "-f", url)
	if _, err := Run(cmd); err != nil {
		warnError(err)
	}
}

// UninstallCertManager uninstalls the cert manager
func UninstallCertManager() {
	url := fmt.Sprintf(certmanagerURLTmpl, certmanagerVersion)
	cmd := exec.Command("kubectl", "delete", "-f", url)
	if _, err := Run(cmd); err != nil {
		warnError(err)
	}
}

// InstallCertManager installs the cert manager bundle.
func InstallCertManager() error {
	UninstallCertManager() // in case of a CTRL+C on prev test
	url := fmt.Sprintf(certmanagerURLTmpl, certmanagerVersion)
	cmd := exec.Command("kubectl", "apply", "-f", url)
	if _, err := Run(cmd); err != nil {
		return err
	}
	// Wait for cert-manager-webhook to be ready, which can take time if cert-manager
	// was re-installed after uninstalling on a cluster.
	cmd = exec.Command("kubectl", "wait", "deployment.apps/cert-manager-webhook",
		"--for", "condition=Available",
		"--namespace", "cert-manager",
		"--timeout", "5m",
	)

	_, err := Run(cmd)
	return err
}

// LoadImageToKindCluster loads a local docker image to the kind cluster
func LoadImageToKindClusterWithName(name string) error {
	cluster := "paladin"
	if v, ok := os.LookupEnv("CLUSTER_NAME"); ok {
		cluster = v
	}
	kindOptions := []string{"load", "docker-image", name, "--name", cluster}
	cmd := exec.Command("kind", kindOptions...)
	_, err := Run(cmd)
	return err
}

// GetNonEmptyLines converts given command output string into individual objects
// according to line breakers, and ignores the empty elements in it.
func GetNonEmptyLines(output string) []string {
	var res []string
	elements := strings.Split(output, "\n")
	for _, element := range elements {
		if element != "" {
			res = append(res, element)
		}
	}

	return res
}

// GetProjectDir will return the directory where the project is
func GetProjectDir() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return wd, err
	}
	wd = strings.Replace(wd, "/test/e2e", "", -1)
	return wd, nil
}

func KubectlApplyJSON(jsonFile string) error {
	cmd := exec.Command("kubectl", "apply", "-f", "-")
	cmd.Stdin = strings.NewReader(jsonFile)
	_, err := Run(cmd)
	return err
}

type TestDeployer struct {
	RPC  rpcclient.Client
	From string
}

func (td *TestDeployer) DeploySmartContractBytecode(ctx context.Context, buildJSON string, params any) (receipt *ptxapi.TransactionReceipt, err error) {
	type buildDefinition struct {
		Bytecode tktypes.HexBytes `json:"bytecode"`
		ABI      abi.ABI          `json:"abi"`
	}
	var build buildDefinition
	if err := json.Unmarshal([]byte(buildJSON), &build); err != nil {
		return nil, err
	}
	data, err := json.Marshal(params)
	if err != nil {
		return nil, err
	}

	txIn := &ptxapi.TransactionInput{
		Transaction: ptxapi.Transaction{
			Type: ptxapi.TransactionTypePublic.Enum(),
			From: td.From,
			Data: data,
		},
		ABI:      build.ABI,
		Bytecode: build.Bytecode,
	}

	startTime := time.Now()
	var txID uuid.UUID
	if err = td.RPC.CallRPC(ctx, &txID, "ptx_sendTransaction", txIn); err != nil {
		return nil, err
	}

	for {
		if err = td.RPC.CallRPC(ctx, &receipt, "ptx_getTransactionReceipt", txID); err != nil {
			return nil, err
		}
		if receipt != nil {
			return receipt, nil
		}
		fmt.Printf("... waiting for receipt TX=%s (%s)\n", txID, time.Since(startTime))
	}
}

func StrToUnstructured(objStr string) (unstructured.Unstructured, error) {
	obj := unstructured.Unstructured{}
	objBytes, err := json.Marshal(objStr)
	if err != nil {
		return unstructured.Unstructured{}, err
	}
	if err := obj.UnmarshalJSON(objBytes); err != nil {
		return unstructured.Unstructured{}, err
	}
	return obj, nil

}

// GetJSONPath evaluates a JSONPath expression against the provided JSON data.
// It returns the results as a slice of strings.
func GetJSONPath(jsonData []byte, jsonPath string) ([]string, error) {
	// Unmarshal the JSON data into an interface{}
	var obj interface{}
	if err := json.Unmarshal(jsonData, &obj); err != nil {
		return nil, fmt.Errorf("error unmarshalling JSON data: %v", err)
	}

	// Create a new JSONPath object
	jp := jsonpath.New("jsonpath")
	if err := jp.Parse(jsonPath); err != nil {
		return nil, fmt.Errorf("error parsing JSONPath expression '%s': %v", jsonPath, err)
	}

	// Find the results
	results, err := jp.FindResults(obj)
	if err != nil {
		return nil, fmt.Errorf("error evaluating JSONPath expression '%s': %v", jsonPath, err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("no results found for JSONPath expression '%s'", jsonPath)
	}

	// Collect the results into a slice of strings
	var values []string
	for _, result := range results {
		for _, r := range result {
			switch v := r.Interface().(type) {
			case string:
				values = append(values, v)
			case fmt.Stringer:
				values = append(values, v.String())
			default:
				// Convert other types to string
				values = append(values, fmt.Sprintf("%v", v))
			}
		}
	}

	return values, nil
}

func GetJSONPathString(jsonData []byte, jsonPath string) (string, error) {
	values, err := GetJSONPath(jsonData, jsonPath)
	if err != nil {
		return "", err
	}
	if len(values) == 0 {
		return "", fmt.Errorf("no results found for JSONPath expression: %s", jsonPath)
	}
	if len(values) > 1 {
		return "", fmt.Errorf("multiple results found for JSONPath expression: %s", jsonPath)
	}
	return values[0], nil
}
