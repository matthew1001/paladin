import hre from 'hardhat';
import { IdentityRegistry } from '../typechain-types/IdentityRegistry';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from 'chai';
import { getEvent } from './utils';

describe.only('Identity Registry', () => {

  let identityRegistry: IdentityRegistry;

  let rootAccount: SignerWithAddress;
  let accountA: SignerWithAddress;
  let accountB: SignerWithAddress;
  let accountAA: SignerWithAddress;
  let accountAB: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  let node_A_Hash: string;
  let node_B_Hash: string;
  let node_A_A_Hash: string;
  let node_A_B_Hash: string;

  before(async () => {
    [rootAccount, accountA, accountB, accountAA, accountAB, otherAccount] = await hre.ethers.getSigners();
    const IdentityRegistry = await hre.ethers.getContractFactory('IdentityRegistry');
    identityRegistry = await IdentityRegistry.connect(rootAccount).deploy();
    await identityRegistry.waitForDeployment();
  });

  it('Root Identity', async () => {
    // Root identity is established as part of the smart contract deployment, name 'root' owned by rootAccount
    const rootIdentity = await identityRegistry.getRootIdentity();
    expect(rootIdentity.parent).to.equal(hre.ethers.ZeroHash);
    expect(rootIdentity.children.length).to.equal(0);
    expect(rootIdentity.name).to.equal('root');
    expect(rootIdentity.owner).to.equal(rootAccount);
  });

  it('Register identities', async () => {
    // Owner of root identity registers child identity "node-A" and sets the ownership to accountA
    const transaction1 = await identityRegistry.connect(rootAccount).registerIdentity(hre.ethers.ZeroHash, 'node-A', accountA);
    const event1 = await getEvent(transaction1);
    expect(event1?.fragment.name).to.equal('IdentityRegistered');
    expect(event1?.args[0]).to.equal(hre.ethers.ZeroHash);
    expect(event1?.args[2]).to.equal('node-A');
    expect(event1?.args[3]).to.equal(accountA);
    node_A_Hash = event1?.args[1];

    // Owner of root identity registers child identity "node-B" and sets the ownership to accountB
    const transaction2 = await identityRegistry.connect(rootAccount).registerIdentity(hre.ethers.ZeroHash, 'node-B', accountB);
    const event2 = await getEvent(transaction2);
    expect(event2?.fragment.name).to.equal('IdentityRegistered');
    expect(event2?.args[0]).to.equal(hre.ethers.ZeroHash);
    expect(event2?.args[2]).to.equal('node-B');
    expect(event2?.args[3]).to.equal(accountB);
    node_B_Hash = event2?.args[1];
  });

  it('Register nested identities', async () => {
    // Owner of identity "node-A" registers child identity "node-A-A"
    const transaction1 = await identityRegistry.connect(accountA).registerIdentity(node_A_Hash, 'node-A-A', accountAA);
    const event1 = await getEvent(transaction1);
    expect(event1?.fragment.name).to.equal('IdentityRegistered');
    expect(event1?.args[0]).to.equal(node_A_Hash);
    expect(event1?.args[2]).to.equal('node-A-A');
    expect(event1?.args[3]).to.equal(accountAA);
    node_A_A_Hash = event1?.args[1];

    // Owner of root identity registers child identity "node-A-A" as a child of identity "node-A"
    const transaction2 = await identityRegistry.connect(accountA).registerIdentity(node_A_Hash, 'node-A-B', accountAB.address);
    const event2 = await getEvent(transaction2);
    expect(event2?.fragment.name).to.equal('IdentityRegistered');
    expect(event2?.args[0]).to.equal(node_A_Hash);
    expect(event2?.args[2]).to.equal('node-A-B');
    expect(event2?.args[3]).to.equal(accountAB);
    node_A_B_Hash = event2?.args[1];

  });

  it('Traverse identity hierarchy', async () => {
    // Root node must have node-A and node-B as children
    const rootIdentity = await identityRegistry.getRootIdentity();
    expect(rootIdentity.children.length).to.equal(2);
    expect(rootIdentity.children[0]).to.equal(node_A_Hash);
    expect(rootIdentity.children[1]).to.equal(node_B_Hash);

    // Node-A must have node-A-A and node-A-B as children, and the root node as parent
    const node_A = await identityRegistry.getIdentity(rootIdentity.children[0]);
    expect(node_A.name).to.equal('node-A');
    expect(node_A.parent).to.equal(hre.ethers.ZeroHash);
    expect(node_A.children.length).to.equal(2);
    expect(node_A.children[0]).to.equal(node_A_A_Hash);
    expect(node_A.children[1]).to.equal(node_A_B_Hash);

    // Node-B must have no children and the root node as parent
    const node_B = await identityRegistry.getIdentity(rootIdentity.children[1]);
    expect(node_B.name).to.equal('node-B');
    expect(node_B.parent).to.equal(hre.ethers.ZeroHash);
    expect(node_B.children.length).to.equal(0);

    // Node-A-A must have no children and node-A as parent
    const node_A_A = await identityRegistry.getIdentity(node_A.children[0]);
    expect(node_A_A.name).to.equal('node-A-A');
    expect(node_A_A.parent).to.equal(node_A_Hash);
    expect(node_A_A.children.length).to.equal(0);

    // Node-A-B must have no children and node-A as parent
    const node_A_B = await identityRegistry.getIdentity(node_A.children[1]);
    expect(node_A_B.name).to.equal('node-A-B');
    expect(node_A_B.parent).to.equal(node_A_Hash);
    expect(node_A_B.children.length).to.equal(0);
  });

  it('Permission checking for root node', async () => {
    // Only the owner of the identity should be allowed to add child identities
    await expect(identityRegistry.connect(otherAccount).registerIdentity(hre.ethers.ZeroHash, 'node-X', otherAccount)).to.be.revertedWith('Forbidden')
  });

  it('Permission checking for node-A and node-B', async () => {
    // Attempt to register an identity on node-A owned by accountA using otherAccount
    await expect(identityRegistry.connect(otherAccount).registerIdentity(node_A_Hash, 'node-X', otherAccount)).to.be.revertedWith('Forbidden');

    // Attempt to register an identity on node-B owned by accountB using otherAccount
    await expect(identityRegistry.connect(otherAccount).registerIdentity(node_B_Hash, 'node-X', otherAccount)).to.be.revertedWith('Forbidden');
  });

  it('Permission checking for node-A-A and node-A-B', async () => {
    // Attempt to register an identity on node-A-A owned by accountAA using otherAccount
    await expect(identityRegistry.connect(otherAccount).registerIdentity(node_A_A_Hash, 'node-X', otherAccount)).to.be.revertedWith('Forbidden');

    // Attempt to register an identity on node-A-A owned by accountAB using otherAccount
    await expect(identityRegistry.connect(otherAccount).registerIdentity(node_A_B_Hash, 'node-X', otherAccount)).to.be.revertedWith('Forbidden');
  });

  it('Root node owner should only be allowed to add direct children', async () => {
    // Attempt to register grand-child identity
    await expect(identityRegistry.connect(otherAccount).registerIdentity(node_A_Hash, 'node-X', otherAccount)).to.be.revertedWith('Forbidden');
  });

  it('Should not allow registration of identities with empty string', async () => {
    // Attempt to register an identity with name set to empty string
    await expect(identityRegistry.connect(rootAccount).registerIdentity(hre.ethers.ZeroHash, '', otherAccount)).to.be.revertedWith('Name cannot be empty')
  });

  it('Set properties on root and node-A', async () => {
    // Set property key="key-root-1" value="value-root-1" on root node using owner rootAccount
    await expect(identityRegistry.connect(rootAccount).setIdentityProperty(hre.ethers.ZeroHash, 'key-root-1', 'value-root-1'))
      .to.emit(identityRegistry, 'PropertySet')
      .withArgs(hre.ethers.ZeroHash, 'key-root-1', 'value-root-1');

    // Set property key="key-root-2" value="value-root-2" on root node using owner rootAccount
    await expect(identityRegistry.connect(rootAccount).setIdentityProperty(hre.ethers.ZeroHash, 'key-root-2', 'value-root-2'))
      .to.emit(identityRegistry, 'PropertySet')
      .withArgs(hre.ethers.ZeroHash, 'key-root-2', 'value-root-2');

    // Set property key="key-node-A-1" value="value-node-A-1" on node-A using owner accountA
    await expect(identityRegistry.connect(accountA).setIdentityProperty(node_A_Hash, 'key-node-A-1', 'value-node-A-1'))
      .to.emit(identityRegistry, 'PropertySet')
      .withArgs(node_A_Hash, 'key-node-A-1', 'value-node-A-1');

    // Set property key="key-node-A-2" value="value-node-A-2" on node-A using owner accountA
    await expect(identityRegistry.connect(accountA).setIdentityProperty(node_A_Hash, 'key-node-A-2', 'value-node-A-2'))
      .to.emit(identityRegistry, 'PropertySet')
      .withArgs(node_A_Hash, 'key-node-A-2', 'value-node-A-2');
  });

  it('Lookup property values by key', async () => {
    // Property key="key-root-1" must have value="value-root-1" on root node
    const transaction1 = await identityRegistry.getIdentityPropertyValueByName(hre.ethers.ZeroHash, 'key-root-1');
    expect(transaction1).to.equal('value-root-1');

    // Property key="key-root-2" must have value="value-root-2" on root node
    const transaction2 = await identityRegistry.getIdentityPropertyValueByName(hre.ethers.ZeroHash, 'key-root-2');
    expect(transaction2).to.equal('value-root-2');

    // Property key="key-node-A-1" must have value="value-node-A-1" on node-A
    const transaction3 = await identityRegistry.getIdentityPropertyValueByName(node_A_Hash, 'key-node-A-1');
    expect(transaction3).to.equal('value-node-A-1');

    // Property key="key-node-A-2" must have value="value-node-A-2" on node-A
    const transaction4 = await identityRegistry.getIdentityPropertyValueByName(node_A_Hash, 'key-node-A-2');
    expect(transaction4).to.equal('value-node-A-2');
  });

  it('List properties', async () => {
    // Get property key hashes for root node
    const transaction1 = await identityRegistry.listIdentityPropertyHashes(hre.ethers.ZeroHash);
    expect(transaction1.length).to.equal(2);

    // Get property key="key-root-1" using retreived key hash
    const transaction2 = await identityRegistry.getIdentityPropertyByHash(hre.ethers.ZeroHash, transaction1[0]);
    expect(transaction2[0]).to.equal('key-root-1');
    expect(transaction2[1]).to.equal('value-root-1');

    // Get property key="key-root-2" using retreived key hash
    const transaction3 = await identityRegistry.getIdentityPropertyByHash(hre.ethers.ZeroHash, transaction1[1]);
    expect(transaction3[0]).to.equal('key-root-2');
    expect(transaction3[1]).to.equal('value-root-2');

    // Get property key hashes for node-A
    const transaction4 = await identityRegistry.listIdentityPropertyHashes(node_A_Hash);
    expect(transaction4.length).to.equal(2);

    // Get property key="key-node-A-1" using retreived key hash
    const transaction5 = await identityRegistry.getIdentityPropertyByHash(node_A_Hash, transaction4[0]);
    expect(transaction5[0]).to.equal('key-node-A-1');
    expect(transaction5[1]).to.equal('value-node-A-1');

    // Get property key="key-node-A-2" using retreived key hash
    const transaction6 = await identityRegistry.getIdentityPropertyByHash(node_A_Hash, transaction4[1]);
    expect(transaction6[0]).to.equal('key-node-A-2');
    expect(transaction6[1]).to.equal('value-node-A-2');
  });

  it('Check only identity owner can set properties', async () => {
    // Attempt to set property on root node owned by rootAccount using otherAccount
    await expect(identityRegistry.connect(otherAccount).setIdentityProperty(hre.ethers.ZeroHash, 'key-x', 'value-x'))
      .to.be.revertedWith('Forbidden');

    // Attempt to set property on node B owned by accountB using otherAccount
    await expect(identityRegistry.connect(otherAccount).setIdentityProperty(node_B_Hash, 'key-x', 'value-x'))
      .to.be.revertedWith('Forbidden');
  });

  it('Should allow properties to be updated', async () => {
    // Update property key="key-root-1" setting value="updated" on root node using rootAccount
    await expect(identityRegistry.connect(rootAccount).setIdentityProperty(hre.ethers.ZeroHash, 'key-root-1', 'updated'))
      .to.emit(identityRegistry, 'PropertySet')
      .withArgs(hre.ethers.ZeroHash, 'key-root-1', 'updated');

    // Check value is updated
    const transaction2 = await identityRegistry.getIdentityPropertyValueByName(hre.ethers.ZeroHash, 'key-root-1');
    expect(transaction2).to.equal('updated');
  });

  it('Properties should be available to all identities', async () => {
    // Access property in root node from otherAccount
    const transaction1 = await identityRegistry.connect(otherAccount).getIdentityPropertyValueByName(hre.ethers.ZeroHash, 'key-root-1');
    expect(transaction1).to.equal('updated');

    // Access property in node-A node from otherAccount
    const transaction2 = await identityRegistry.connect(otherAccount).getIdentityPropertyValueByName(node_A_Hash, 'key-node-A-1');
    expect(transaction2).to.equal('value-node-A-1');
  });

  it('Should not allow empty string key properties', async () => {
    // Attempt to set a property on root node with key="" using rootAccount
    await expect(identityRegistry.connect(rootAccount).setIdentityProperty(hre.ethers.ZeroHash, '', 'value'))
      .to.be.revertedWith('Key cannot be empty');
  });

  it('Ensure there siblings have unique names', async () => {
    // Attempt to register a new child node with repeated name
    await expect(identityRegistry.connect(rootAccount).registerIdentity(hre.ethers.ZeroHash, 'node-A', otherAccount))
    .to.be.revertedWith('Name already taken');
  });

});
