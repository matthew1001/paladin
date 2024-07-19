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

    // Each identity has a unique hash, calculated as a hash of its name and the hash of the parent
    // Identities are stored in a map, from identity hash to identity struct
    // The root identity has key value 0
    mapping(bytes32 => Identity) private identities;

    // Maps identity hashes to property key hashes
    // This is used to list the properties used by each identity
    mapping(bytes32 => bytes32[]) propertyKeys;

    // Maps identity hashes to a map of identity key hashes to Property structs
    // This is used to store property names and values for each identity
    mapping(bytes32 => mapping(bytes32 => Property)) private properties;

    constructor() {
        // Root identity is created
        identities[0] = Identity(0, new bytes32[](0), "root", msg.sender);
    }

    function registerIdentity(bytes32 parentIdentityHash, string memory name, address owner) public {
        // Ensure name is not empty
        require(bytes(name).length != 0, "Name cannot be empty");

        // Ensure sender owns parent identity
        require(identities[parentIdentityHash].owner == msg.sender, "Forbidden");

        // Calculate identiy has based on its name and the hash of the parent identity
        bytes32 hash = keccak256(abi.encodePacked(parentIdentityHash, keccak256(abi.encodePacked(name))));

        // Store new identity with a reference to the parent identity, empty list of children, name and owner
        identities[hash] = Identity(parentIdentityHash, new bytes32[](0), name, owner);

        // Store new child identity in parent identity so it can later be listed
        identities[parentIdentityHash].children.push(hash);

        // Emit identity registered event
        emit IdentityRegistered(parentIdentityHash, hash, name, owner);
    }

    function getRootIdentity() public view returns (Identity memory) {
        // Returns the root identity which has key 0
        return identities[0];
    }

    function getIdentity(bytes32 identityHash) public view returns (Identity memory) {
        // Return identity based on hash
        return identities[identityHash];
    }

    function setIdentityProperty(bytes32 identityHash, string memory key, string memory value) public {
        // Ensure key is not empty
        require(bytes(key).length != 0, "Key cannot be empty");

        // Ensure sender owns identity
        require(identities[identityHash].owner == msg.sender, "Forbidden");

        // Calculate property key hash
        bytes32 keyHash = keccak256(abi.encodePacked(key));

        // If this is the first time the key is used in the identity, set it up
        if(bytes(properties[identityHash][keyHash].name).length == 0) {
            
            // Store property key
            properties[identityHash][keyHash].name = key;

            // Add property key hash to identity so it can later be listed
            propertyKeys[identityHash].push(keyHash);
        }

        // Store value (or update if already present)
        properties[identityHash][keyHash].value = value;

        // Emit property set value
        emit PropertySet(identityHash, key, value);
    }

    function listIdentityPropertyHashes(bytes32 identityHash) public view returns (bytes32[] memory) {
        // Lists the property key hashes for a given identity
        return propertyKeys[identityHash];
    }

    function getIdentityPropertyByHash(bytes32 identityHash, bytes32 propertyKeyHash) public view returns(string memory, string memory) {
        // Get the property based on the key hash
        Property memory property = properties[identityHash][propertyKeyHash];
        
        // Check that the property exists
        require(bytes(property.name).length > 0, "Property not found");

        // Return property name and value
        return (property.name, property.value);
    }

    function getIdentityPropertyValueByName(bytes32 identityHash, string memory key) public view returns(string memory value) {
        // Calculate key hash
        bytes32 keyHash = keccak256(abi.encodePacked(key));

        // Invoke function to return property value
        (, value) = getIdentityPropertyByHash(identityHash, keyHash);
    }

}
