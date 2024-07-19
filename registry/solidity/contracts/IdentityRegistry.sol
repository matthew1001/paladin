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

pragma solidity ^0.8.13;

contract IdentityRegistry {

    struct Identity {
        bytes32 parent;
        bytes32[] children;
        string name;
        address owner;
    }

    struct Property {
        string name;
        string value;
    }

    event IdentityRegistered (
        bytes32 parentIndentityHash,
        bytes32 identityHash,
        string name,
        address owner
    );

    event PropertySet (
        bytes32 identityHash,
        string key,
        string value
    );

    mapping(bytes32 => Identity) private identities;

    mapping(bytes32 => bytes32[]) propertyKeys;

    mapping(bytes32 => mapping(bytes32 => Property)) private properties;

    constructor() {
        identities[0] = Identity(0, new bytes32[](0), "root", msg.sender);
    }

    function hasOwnership(bytes32 identityHash, address account) private view returns (bool) {
        while(identities[identityHash].parent != 0 && identities[identityHash].owner != account) {
            identityHash = identities[identityHash].parent;
        }
        return identities[identityHash].owner == account;
    }

    function registerIdentity(bytes32 parentIdentityHash, string memory name, address owner) public {
        require(bytes(name).length != 0, "Name cannot be empty");
        require(hasOwnership(parentIdentityHash, msg.sender), "Forbidden");
        bytes32 hash = keccak256(abi.encodePacked(parentIdentityHash, keccak256(abi.encodePacked(name))));
        identities[hash] = Identity(parentIdentityHash, new bytes32[](0), name, owner);
        identities[parentIdentityHash].children.push(hash);
        emit IdentityRegistered(parentIdentityHash, hash, name, owner);
    }

    function getRootIdentity() public view returns (Identity memory) {
        return identities[0];
    }

    function getIdentity(bytes32 identityHash) public view returns (Identity memory) {
        return identities[identityHash];
    }

    function setIdentityProperty(bytes32 identityHash, string memory key, string memory value) public {
        require(bytes(key).length != 0, "Key cannot be empty");
        require(hasOwnership(identityHash, msg.sender), "Forbidden");
        bytes32 keyHash = keccak256(abi.encodePacked(key));
        if(bytes(properties[identityHash][keyHash].name).length == 0) {
            properties[identityHash][keyHash].name = key;
            propertyKeys[identityHash].push(keyHash);
        }
        properties[identityHash][keyHash].value = value;
        emit PropertySet(identityHash, key, value);
    }

    function listIdentityPropertyHashes(bytes32 identityHash) public view returns (bytes32[] memory) {
        return propertyKeys[identityHash];
    }

    function getIdentityPropertyByHash(bytes32 identityHash, bytes32 propertyKeyHash) public view returns(string memory, string memory) {
        Property memory property = properties[identityHash][propertyKeyHash];
        require(bytes(property.name).length > 0, "Property not found");
        return (property.name, property.value);
    }

    function getIdentityPropertyValueByName(bytes32 identityHash, string memory key) public view returns(string memory value) {
        bytes32 keyHash = keccak256(abi.encodePacked(key));
        (, value) = getIdentityPropertyByHash(identityHash, keyHash);
    }

}

