#!/bin/bash
set -o allexport 
MINT_RESPONSE=$(
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
                    "to": "wallets.org1.alice",
                    "amount": "100"
                },
                "abi": [
                    {
                    "type": "function",
                    "name": "mint",
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
echo $MINT_RESPONSE | jq .
mintTxID=$(echo $MINT_RESPONSE | jq -r .result)
echo $mintTxID


TxID=$mintTxID

set +o allexport
