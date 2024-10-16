#!/bin/bash
set -o allexport 
TRANSFER_A2B_RESPONSE=$(
curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d @- <<EOF
     {
           "jsonrpc":"2.0",
           "method":"ptx_sendTransaction",
           "params":[
           {
                "type": "private",
                "domain": "zeto",
                "to": "${contractAddress}",
                "from": "wallets.org1.alice",
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
echo $TRANSFER_A2B_RESPONSE | jq .
xferA2BTxID=$(echo $TRANSFER_A2B_RESPONSE | jq -r .result)
echo $xferA2BTxID


set +o allexport
