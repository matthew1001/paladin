// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MultiCall is Initializable {
    uint256 private _operationCount;
    Operation[] private _operations;

    struct Operation {
        address contractAddress;
        bytes encodedCall;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(Operation[] memory operations) public initializer {
        _operationCount = operations.length;
        for (uint256 i = 0; i < _operationCount; i++) {
            _operations.push(
                Operation(
                    operations[i].contractAddress,
                    operations[i].encodedCall
                )
            );
        }
    }

    function execute() public {
        for (uint256 i = 0; i < _operationCount; i++) {
            (bool success, bytes memory result) = _operations[i]
                .contractAddress
                .call(_operations[i].encodedCall);
            if (!success) {
                assembly {
                    let size := mload(result)
                    let ptr := add(result, 32)
                    revert(ptr, size)
                }
            }
        }
    }

    function getOperationCount() public view returns (uint256) {
        return _operationCount;
    }

    function getOperation(
        uint256 operationIndex
    ) public view returns (Operation memory) {
        return _operations[operationIndex];
    }
}

contract MultiCallFactory {
    address public immutable logic;

    event MultiCallDeployed(address addr);

    constructor() {
        logic = address(new MultiCall());
    }

    function create(MultiCall.Operation[] memory operations) public {
        bytes memory _initializationCalldata = abi.encodeWithSignature(
            "initialize((address,bytes)[])",
            operations
        );
        address addr = address(
            new ERC1967Proxy(logic, _initializationCalldata)
        );
        emit MultiCallDeployed(addr);
    }
}
