#!/bin/bash
set -o allexport 
RESPONSE=$(
curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d @- <<EOF
     {
           "jsonrpc":"2.0",
           "method":"ptx_sendTransaction",
           "params":[
           {
                "type": "private",
                "domain": "noto",
                "to": "${contractAddress}",
                "from": "wallets.org1.alice@27b89620-2e6a-41ea-b4a7-8bf2f07b0000",
                "data": {
                    "to": "wallets.org2.bob@427cd8e2-ff68-4fbf-8b02-d016c2cf2525",
                    "amount": "50"
                },
                "abi": [
                    {
                    "type": "function",
                    "name": "transfer",
                    "inputs": [
                        {
                            "name": "to",
                            "type": "string",
                            "internalType": "string"
                        },
                        {
                            "name": "amount",
                            "type": "uint256",
                            "internalType": "uint256"
                        }
                    ],
                    "outputs": null
                    }
                ]
            }
            ],
            "id":1
        }
EOF
)
echo $RESPONSE | jq .
TxID=$(echo $RESPONSE | jq -r .result)
echo $TxID


set +o allexport
