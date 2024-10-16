#!/bin/bash
set -o allexport 

DEPLOY_RESPONSE=$(
curl -X POST http://localhost:18003 \
     -H "Content-Type: application/json" \
     -d '{
           "jsonrpc":"2.0",
           "method":"ptx_sendTransaction",
           "params":[
           {
                "type": "private",
                "domain": "noto",
                "from": "wallets.org3.notary",
                "data": {
                    "notary": "wallets.org3.notary@f05110b8-f3ca-434a-91e6-06fb081a826e"
                },
                "abi": [
                    {
                    "type": "constructor",
                    "inputs": [
                        {
                            "name": "notary",
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
