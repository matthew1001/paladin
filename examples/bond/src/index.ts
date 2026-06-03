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
import PaladinClient, {
  INotoDomainReceipt,
  NotoBalanceOfResult,
  NotoFactory,
  PenteFactory,
  TransactionType,
} from "@lfdecentralizedtrust/paladin-sdk";
import {
  checkDeploy,
  checkReceipt,
  DEFAULT_POLL_TIMEOUT,
} from "paladin-example-common";
import { newBondTracker } from "./helpers/bondtracker";
import { nodeConnections } from "paladin-example-common";
import bondTrackerPublicJson from "./abis/BondTrackerPublic.json";

const logger = console;

async function main(): Promise<boolean> {
  // --- Initialization from Imported Config ---
  if (nodeConnections.length < 3) {
    logger.error(
      "The environment config must provide at least 3 nodes for this scenario.",
    );
    return false;
  }

  logger.log(
    "Initializing Paladin clients from the environment configuration...",
  );
  const clients = nodeConnections.map(
    (node) => new PaladinClient(node.clientOptions),
  );
  const [paladin1] = clients;

  const bondIssuer = paladin1.getVerifiers("issuer@pnode1")[0];
  const allowedInvestor = paladin1.getVerifiers("bankA@pnode2")[0];

  logger.log("Creating issuer privacy group");
  const penteFactory = new PenteFactory(paladin1, "pente");
  const issuerCustodianGroup = await penteFactory
    .newPrivacyGroup({
      members: [bondIssuer],
      evmVersion: "shanghai",
      externalCallsEnabled: true,
    })
    .waitForDeploy(DEFAULT_POLL_TIMEOUT);
  if (!checkDeploy(issuerCustodianGroup)) return false;

  logger.log("Deploying Noto cash token...");
  const notoFactory = new NotoFactory(paladin1, "noto");
  const notoCash = await notoFactory
    .newNoto(bondIssuer, {
      name: "BOND",
      symbol: "BOND",
      notary: bondIssuer,
      notaryMode: "basic",
    })
    .waitForDeploy(DEFAULT_POLL_TIMEOUT);
  if (!checkDeploy(notoCash)) return false;

  // Deploy the public bond tracker on the base ledger (controlled by the privacy group)
  logger.log("Creating public bond tracker...");
  const issueDate = Math.floor(Date.now() / 1000);
  const maturityDate = issueDate + 60 * 60 * 24;
  let txID = await paladin1.ptx.sendTransaction({
    type: TransactionType.PUBLIC,
    abi: bondTrackerPublicJson.abi,
    bytecode: bondTrackerPublicJson.bytecode,
    function: "",
    from: bondIssuer.lookup,
    data: {
      owner: issuerCustodianGroup.address,
      issueDate_: issueDate,
      maturityDate_: maturityDate,
      currencyToken_: notoCash.address,
      faceValue_: 1,
    },
  });
  let receipt = await paladin1.pollForReceipt(txID, DEFAULT_POLL_TIMEOUT);
  if (receipt?.contractAddress === undefined) {
    logger.error("Failed!");
    return false;
  }
  logger.log(`Success! address: ${receipt.contractAddress}`);
  const bondTrackerPublicAddress = receipt.contractAddress;

  // Deploy private bond tracker to the issuer/custodian privacy group
  logger.log("Creating private bond tracker...");
  const bondTracker = await newBondTracker(issuerCustodianGroup, bondIssuer, {
    name: "BOND",
    symbol: "BOND",
    custodian: await bondIssuer.address(),
    publicTracker: bondTrackerPublicAddress,
  });
  if (!checkDeploy(bondTracker)) return false;

  // Deploy Noto token to represent bond

  logger.log("Deploying Noto bond token...");
  const notoBond = await notoFactory
    .newNoto(bondIssuer, {
      name: "BOND",
      symbol: "BOND",
      notary: bondIssuer,
      notaryMode: "hooks",
      options: {
        hooks: {
          privateGroup: issuerCustodianGroup,
          publicAddress: issuerCustodianGroup.address,
          privateAddress: bondTracker.address,
        },
      },
    })
    .waitForDeploy(DEFAULT_POLL_TIMEOUT);
  if (!checkDeploy(notoBond)) return false;

  // Add allowed investors
  const investorList = await bondTracker.investorList(bondIssuer);
  logger.log("Adding allowed investor...");
  receipt = await investorList
    .using(paladin1)
    .addInvestor(bondIssuer, { addr: await allowedInvestor.address() })
    .waitForReceipt(DEFAULT_POLL_TIMEOUT);
  if (!checkReceipt(receipt)) return false;

  logger.log("Success!");
  return true;
}

if (require.main === module) {
  main()
    .then((success: boolean) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error("Exiting with uncaught error");
      console.error(err);
      process.exit(1);
    });
}
