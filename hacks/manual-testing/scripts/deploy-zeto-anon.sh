#!/bin/bash
set -o allexport 
DEPLOY_RESPONSE=$(
curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d '{
           "jsonrpc":"2.0",
           "method":"ptx_sendTransaction",
           "params":[
           {
                "idempotencyKey": "deploy2",
                "type": "private",
                "domain": "zeto",
                "from": "wallets.org1.alice",
                "data": {
                    "from": "wallets.org1.alice",
                    "tokenName": "Zeto_Anon",
                    "initialOwner": "0x41fe3d485914448629491fd6a18e224aad61da48"
                },
                "abi": [
                    {
                    "type": "constructor",
                    "inputs": [
                        {
                            "name": "initialOwner",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "from",
                            "type": "string",
                            "internalType": "string"
                        },
                        {
                            "name": "tokenName",
                            "type": "string",
                            "internalType": "string"
                        }
                    ],
                    "outputs": null
                    }
                ]
            }
            ],
            "id":1
         }' 
)
echo $DEPLOY_RESPONSE | jq .
deployTxId=$(echo $DEPLOY_RESPONSE | jq -r .result)
echo $deployTxId
TxID=$deployTxId
set +o allexport
