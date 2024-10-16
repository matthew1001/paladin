#!/bin/bash
set -o allexport 
MINT_RESPONSE=$(
curl -X POST http://localhost:18003 \
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
                "from": "wallets.org3.notary@f05110b8-f3ca-434a-91e6-06fb081a826e",
                "data": {
                    "to": "wallets.org1.alice@27b89620-2e6a-41ea-b4a7-8bf2f07b0000",
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
