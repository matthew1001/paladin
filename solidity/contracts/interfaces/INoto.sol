// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface INoto {
    event UTXOTransfer(bytes32[] inputs, bytes32[] outputs, bytes data);

    event UTXOApproved(address delegate, bytes32 txhash);
}
