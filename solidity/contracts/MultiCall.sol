// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/INoto.sol";

contract MultiCall is Initializable {
    uint256 private _operationCount;
    Operation[] private _operations;

    enum OperationType {
        EncodedCall,
        ERC20Transfer,
        ERC721Transfer,
        NotoTransfer
    }

    // Common set of parameters for all supported operations.
    // Any changes to this struct must be reflected in MultiCallFactory as well.
    struct Operation {
        OperationType opType;
        address contractAddress;
        address fromAddress;
        address toAddress;
        uint256 value;
        bytes32[] inputs;
        bytes32[] outputs;
        bytes signature;
        bytes data;
    }

    error MultiCallUnsupportedType(OperationType opType);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(Operation[] memory operations) public initializer {
        _operationCount = operations.length;
        for (uint256 i = 0; i < _operationCount; i++) {
            _operations.push(operations[i]);
        }
    }

    function execute() public {
        for (uint256 i = 0; i < _operationCount; i++) {
            _executeOperation(_operations[i]);
        }
    }

    function _executeOperation(Operation storage op) internal {
        if (op.opType == OperationType.EncodedCall) {
            (bool success, bytes memory result) = op.contractAddress.call(
                op.data
            );
            if (!success) {
                assembly {
                    // Forward the revert reason
                    let size := mload(result)
                    let ptr := add(result, 32)
                    revert(ptr, size)
                }
            }
        } else if (op.opType == OperationType.ERC20Transfer) {
            IERC20(op.contractAddress).transferFrom(
                op.fromAddress,
                op.toAddress,
                op.value
            );
        } else if (op.opType == OperationType.ERC721Transfer) {
            IERC721(op.contractAddress).safeTransferFrom(
                op.fromAddress,
                op.toAddress,
                op.value,
                op.data
            );
        } else if (op.opType == OperationType.NotoTransfer) {
            INoto(op.contractAddress).approvedTransfer(
                op.inputs,
                op.outputs,
                op.data
            );
        } else {
            revert MultiCallUnsupportedType(op.opType);
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

    // Must match the signature initialize(MultiCall.Operation[])
    string private constant INIT_SIGNATURE =
        "initialize((uint8,address,address,address,uint256,bytes32[],bytes32[],bytes,bytes)[])";

    constructor() {
        logic = address(new MultiCall());
    }

    function create(MultiCall.Operation[] memory operations) public {
        bytes memory _initializationCalldata = abi.encodeWithSignature(
            INIT_SIGNATURE,
            operations
        );
        address addr = address(
            new ERC1967Proxy(logic, _initializationCalldata)
        );
        emit MultiCallDeployed(addr);
    }
}
