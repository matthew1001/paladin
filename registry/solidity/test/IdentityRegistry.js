
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

const IdentityRegistryContract = artifacts.require('IdentityRegistry');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Test design
 * -----------
 * 
 * The following node hierarchy is registered:
 * 
 *    root              (owned by accounts[0])
 *    ├── node-A        (owned by accounts[1])
 *    │   ├── node-A-A  (owned by accounts[3])
 *    │   └── node-A-B  (owned by accounts[4])
 *    └── node-B        (owned by accounts[2])
 * 
 * The following properties are set:
 * 
 *   root      key=key-root-1, value=value-root-1/updated
 *             key=key-root-2, value=value-root-2        
 *
 *   node-A    key=key-node-A-1, value=value-node-A-1
 *             key=key-node-A-2, value=value-node-A-2
 */

contract('IdentityRegistry', accounts => {

  let identityRegistryContract;
  let node_A_Hash;
  let node_B_Hash;
  let node_A_A_Hash;
  let node_A_B_Hash;

  before(async () => {
    // Create smart contract instance
    identityRegistryContract = await IdentityRegistryContract.new({ from: accounts[0] });
  });

  it('Root identity', async () => {
    // Root identity is established as part of the smart contract deployment, name "root" owned by accounts[0]
    const rootIdentity = await identityRegistryContract.getRootIdentity();
    assert(rootIdentity.children.length === 0);
    assert(rootIdentity.parent === ZERO_ADDRESS);
    assert(rootIdentity.name === 'root');
    assert(rootIdentity.owner === accounts[0]);
  });

  it('Register identities', async () => {
    // Owner of root identity registers child identity "node-A" and sets the ownership to accounts[1]
    const transaction1 = await identityRegistryContract.registerIdentity(ZERO_ADDRESS, 'node-A', accounts[1], { from: accounts[0] });
    const logEntry1 = transaction1.logs[0];
    assert(logEntry1.event === 'IdentityRegistered');
    assert(logEntry1.args[0] === ZERO_ADDRESS);
    assert(logEntry1.args[2] === 'node-A');
    assert(logEntry1.args[3] === accounts[1]);
    node_A_Hash = logEntry1.args[1];

    // Owner of root identity registers child identity "node-B" and sets the ownership to accounts[2]
    const transaction2 = await identityRegistryContract.registerIdentity(ZERO_ADDRESS, 'node-B', accounts[2], { from: accounts[0] });
    const logEntry2 = transaction2.logs[0];
    assert(logEntry2.event === 'IdentityRegistered');
    assert(logEntry2.args[0] === ZERO_ADDRESS);
    assert(logEntry2.args[2] === 'node-B');
    assert(logEntry2.args[3] === accounts[2]);
    node_B_Hash = logEntry2.args[1];
  });

  it('Register nested identities', async () => {
    // Owner of identity "node-A" registers child identity "node-A-A"
    const transaction1 = await identityRegistryContract.registerIdentity(node_A_Hash, 'node-A-A', accounts[3], { from: accounts[1] });
    const logEntry1 = transaction1.logs[0];
    assert(logEntry1.event === 'IdentityRegistered');
    assert(logEntry1.args[0] === node_A_Hash);
    assert(logEntry1.args[2] === 'node-A-A');
    assert(logEntry1.args[3] === accounts[3]);
    node_A_A_Hash = logEntry1.args[1];

    // Owner of root identity registers child identity "node-A-A" as a child of identity "node-A"
    const transaction2 = await identityRegistryContract.registerIdentity(node_A_Hash, 'node-A-B', accounts[4], { from: accounts[1] });
    const logEntry2 = transaction2.logs[0];
    assert(logEntry2.event === 'IdentityRegistered');
    assert(logEntry2.args[0] === node_A_Hash);
    assert(logEntry2.args[2] === 'node-A-B');
    assert(logEntry2.args[3] === accounts[4]);
    node_A_B_Hash = logEntry2.args[1];
  });

  it('Traverse identity hierarchy', async () => {
    // Root node must have node-A and node-B as children
    const rootIdentity = await identityRegistryContract.getRootIdentity();
    assert(rootIdentity.children.length === 2);
    assert(rootIdentity.children[0] === node_A_Hash);
    assert(rootIdentity.children[1] === node_B_Hash);

    // Node-A must have node-A-A and node-A-B as children, and the root node as parent
    const node_A = await identityRegistryContract.getIdentity(rootIdentity.children[0]);
    assert(node_A.name === 'node-A');
    assert(node_A.parent === ZERO_ADDRESS);
    assert(node_A.children.length === 2);
    assert(node_A.children[0] === node_A_A_Hash);
    assert(node_A.children[1] === node_A_B_Hash);

    // Node-B must have no children and the root node as parent
    const node_B = await identityRegistryContract.getIdentity(rootIdentity.children[1]);
    assert(node_B.name === 'node-B');
    assert(node_B.parent === ZERO_ADDRESS);
    assert(node_B.children.length === 0);

    // Node-A-A must have no children and node-A as parent
    const node_A_A = await identityRegistryContract.getIdentity(node_A.children[0]);
    assert(node_A_A.name === 'node-A-A');
    assert(node_A_A.parent === node_A_Hash);
    assert(node_A_A.children.length === 0);

    // Node-A-B must have no children and node-A as parent
    const node_A_B = await identityRegistryContract.getIdentity(node_A.children[1]);
    assert(node_A_B.name === 'node-A-B');
    assert(node_A_B.parent === node_A_Hash);
    assert(node_A_B.children.length === 0);
  });

  it('Permission checking for root node', async () => {
    // Only the owner of the identity should be allowed to add child identities
    let errorReason;
    try {
      await identityRegistryContract.registerIdentity(ZERO_ADDRESS, 'node-X', accounts[5], { from: accounts[5] });
    } catch (err) {
      errorReason = err.reason;
    }
    assert(errorReason === 'Forbidden');
  });

  it('Permission checking for node-A and node-B', async () => {
    // Attempt to register an identity on node-A owned by account[1] using account[5]
    let errorReason;
    try {
      await identityRegistryContract.registerIdentity(node_A_Hash, 'node-X', accounts[5], { from: accounts[5] });
    } catch (err) {
      errorReason = err.reason;
    }
    assert(errorReason === 'Forbidden');

    // Attempt to register an identity on node-B owned by account[2] using account[5]
    try {
      await identityRegistryContract.registerIdentity(node_B_Hash, 'node-X', accounts[5], { from: accounts[5] });
    } catch (err) {
      errorReason = err.reason;
    }
    assert(errorReason === 'Forbidden');
  });

  it('Permission checking for node-A-A and node-A-B', async () => {
    // Attempt to register an identity on node-A-A owned by account[3] using account[5]
    let errorReason;
    try {
      await identityRegistryContract.registerIdentity(node_A_A_Hash, 'node-X', accounts[5], { from: accounts[5] });
    } catch (err) {
      errorReason = err.reason;
    }
    assert(errorReason === 'Forbidden');

    // Attempt to register an identity on node-A-A owned by account[4] using account[5]
    try {
      await identityRegistryContract.registerIdentity(node_A_B_Hash, 'node-X', accounts[5], { from: accounts[5] });
    } catch (err) {
      errorReason = err.reason;
    }
    assert(errorReason === 'Forbidden');
  });

  it('Root node owner should only be allowed to add direct children', async () => {
    // Attempt to register grand-child identity
    let errorReason;
    try {
      await identityRegistryContract.registerIdentity(node_A_Hash, 'node-X', accounts[5], { from: accounts[0] });
    } catch (err) {
      errorReason = err.reason;
    }
    assert(errorReason === 'Forbidden');
  });

  it('Should not allow registration of identities with empty string', async () => {
    // Attempt to register an identity with name set to empty string
    let errorReason;
    try {
      await identityRegistryContract.registerIdentity(ZERO_ADDRESS, '', accounts[0], { from: accounts[0] });
    } catch (err) {
      errorReason = err.reason;
    }
    assert(errorReason === 'Name cannot be empty');
  });

  it('Set properties on root and node-A', async () => {
    // Set property key="key-root-1" value="value-root-1" on root node using owner account[0]
    const transaction1 = await identityRegistryContract.setIdentityProperty(ZERO_ADDRESS, 'key-root-1', 'value-root-1', { from: accounts[0] });
    const logEntry1 = transaction1.logs[0];
    assert(logEntry1.event === 'PropertySet');
    assert(logEntry1.args[0] === ZERO_ADDRESS);
    assert(logEntry1.args[1] === 'key-root-1');
    assert(logEntry1.args[2] === 'value-root-1');

    // Set property key="key-root-2" value="value-root-2" on root node using owner account[0]
    const transaction2 = await identityRegistryContract.setIdentityProperty(ZERO_ADDRESS, 'key-root-2', 'value-root-2', { from: accounts[0] });
    const logEntry2 = transaction2.logs[0];
    assert(logEntry2.event === 'PropertySet');
    assert(logEntry2.args[0] === ZERO_ADDRESS);
    assert(logEntry2.args[1] === 'key-root-2');
    assert(logEntry2.args[2] === 'value-root-2');

    // Set property key="key-node-A-1" value="value-node-A-1" on node-A using owner account[1]
    const transaction3 = await identityRegistryContract.setIdentityProperty(node_A_Hash, 'key-node-A-1', 'value-node-A-1', { from: accounts[1] });
    const logEntry3 = transaction3.logs[0];
    assert(logEntry3.event === 'PropertySet');
    assert(logEntry3.args[0] === node_A_Hash);
    assert(logEntry3.args[1] === 'key-node-A-1');
    assert(logEntry3.args[2] === 'value-node-A-1');

    // Set property key="key-node-A-2" value="value-node-A-2" on node-A using owner account[1]
    const transaction4 = await identityRegistryContract.setIdentityProperty(node_A_Hash, 'key-node-A-2', 'value-node-A-2', { from: accounts[1] });
    const logEntry4 = transaction4.logs[0];
    assert(logEntry4.event === 'PropertySet');
    assert(logEntry4.args[0] === node_A_Hash);
    assert(logEntry4.args[1] === 'key-node-A-2');
    assert(logEntry4.args[2] === 'value-node-A-2');
  });

  it('Lookup property values by key', async () => {
    // Property key="key-root-1" must have value="value-root-1" on root node
    const transaction1 = await identityRegistryContract.getIdentityPropertyValueByName(ZERO_ADDRESS, 'key-root-1', { from: accounts[0] });
    assert(transaction1 === 'value-root-1');

    // Property key="key-root-2" must have value="value-root-2" on root node
    const transaction2 = await identityRegistryContract.getIdentityPropertyValueByName(ZERO_ADDRESS, 'key-root-2', { from: accounts[0] });
    assert(transaction2 === 'value-root-2');

    // Property key="key-node-A-1" must have value="value-node-A-1" on node-A
    const transaction3 = await identityRegistryContract.getIdentityPropertyValueByName(node_A_Hash, 'key-node-A-1', { from: accounts[1] });
    assert(transaction3 === 'value-node-A-1');

    // Property key="key-node-A-2" must have value="value-node-A-2" on node-A
    const transaction4 = await identityRegistryContract.getIdentityPropertyValueByName(node_A_Hash, 'key-node-A-2', { from: accounts[1] });
    assert(transaction4 === 'value-node-A-2');
  });

  it('List properties', async () => {
    // Get property key hashes for root node
    const transaction1 = await identityRegistryContract.listIdentityPropertyHashes(ZERO_ADDRESS, { from: accounts[0] });
    assert(transaction1.length === 2);

    // Get property key="key-root-1" using retreived key hash
    const transaction2 = await identityRegistryContract.getIdentityPropertyByHash(ZERO_ADDRESS, transaction1[0], { from: accounts[0] });
    assert(transaction2[0] === 'key-root-1');
    assert(transaction2[1] === 'value-root-1');

    // Get property key="key-root-2" using retreived key hash
    const transaction3 = await identityRegistryContract.getIdentityPropertyByHash(ZERO_ADDRESS, transaction1[1], { from: accounts[0] });
    assert(transaction3[0] === 'key-root-2');
    assert(transaction3[1] === 'value-root-2');

    // Get property key hashes for node-A
    const transaction4 = await identityRegistryContract.listIdentityPropertyHashes(node_A_Hash, { from: accounts[1] });
    assert(transaction4.length === 2);

    // Get property key="key-node-A-1" using retreived key hash
    const transaction5 = await identityRegistryContract.getIdentityPropertyByHash(node_A_Hash, transaction4[0], { from: accounts[1] });
    assert(transaction5[0] === 'key-node-A-1');
    assert(transaction5[1] === 'value-node-A-1');

    // Get property key="key-node-A-2" using retreived key hash
    const transaction6 = await identityRegistryContract.getIdentityPropertyByHash(node_A_Hash, transaction4[1], { from: accounts[1] });
    assert(transaction6[0] === 'key-node-A-2');
    assert(transaction6[1] === 'value-node-A-2');
  });

  it('Check only identity owner can set properties', async () => {
    // Attempt to set property on root node owned by account[0] using accounts[5]
    let errorReason;
    try {
      await identityRegistryContract.setIdentityProperty(ZERO_ADDRESS, 'key-x', 'value-x', { from: accounts[5] });
    } catch (err) {
      errorReason = err.reason;
    }
    assert(errorReason === 'Forbidden');

    // Attempt to set property on node B owned by account[2] using accounts[5]
    try {
      await identityRegistryContract.setIdentityProperty(node_B_Hash, 'key-X', 'value-x', { from: accounts[5] });
    } catch (err) {
      errorReason = err.reason;
    }
    assert(errorReason === 'Forbidden');
  });

  it('Should allow properties to be updated', async () => {
    // Update property key="key-root-1" setting value="updated" on root node using accounts[0]
    const transaction1 = await identityRegistryContract.setIdentityProperty(ZERO_ADDRESS, 'key-root-1', 'updated', { from: accounts[0] });
    const logEntry1 = transaction1.logs[0];
    assert(logEntry1.event === 'PropertySet');
    assert(logEntry1.args[0] === ZERO_ADDRESS);
    assert(logEntry1.args[1] === 'key-root-1');
    assert(logEntry1.args[2] === 'updated');

    // Check value is updated
    const transaction2 = await identityRegistryContract.getIdentityPropertyValueByName(ZERO_ADDRESS, 'key-root-1', { from: accounts[0] });
    assert(transaction2 === 'updated');
  });

  it('Properties should be available to all identities', async () => {
    // Access property in root node from accounts[5]
    const transaction1 = await identityRegistryContract.getIdentityPropertyValueByName(ZERO_ADDRESS, 'key-root-1', { from: accounts[5] });
    assert(transaction1 === 'updated');

    // Access property in node-A node from accounts[5]
    const transaction2 = await identityRegistryContract.getIdentityPropertyValueByName(node_A_Hash, 'key-node-A-1', { from: accounts[5] });
    assert(transaction2 === 'value-node-A-1');

  });

  it('Should not allow empty string key properties', async () => {
    // Attempt to set a property on root node with key="" using accounts[0]
    let errorReason;
    try {
      const transaction1 = await identityRegistryContract.setIdentityProperty(ZERO_ADDRESS, '', 'value', { from: accounts[0] });
    } catch (err) {
      errorReason = err.reason;
    }
    assert(errorReason === 'Key cannot be empty');
  });

});
