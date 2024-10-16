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
                "domain": "zeto",
                "to": "${contractAddress}",
                "from": "wallets.org1.alice",
                "data": {
                    "to": "wallets.org2.alice",
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
