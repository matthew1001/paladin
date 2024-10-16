#!/bin/bash
set -o allexport 
RESOLVE_RESPONSE=$(
curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d '{
           "jsonrpc":"2.0",
           "method":"ptx_resolveVerifier",
           "params":[
             "wallets.org1.notary@27b89620-2e6a-41ea-b4a7-8bf2f07b0000",
                "ecdsa:secp256k1",
                "eth_address"
           ],
           "id":1
         }'
)
NOATARY_ADDRESS=$(echo $RESOLVE_RESPONSE | jq -r .result)
echo "Notary Address: $NOATARY_ADDRESS"

DEPLOY_RESPONSE=$(
curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d '{
           "jsonrpc":"2.0",
           "method":"ptx_sendTransaction",
           "params":[
           {
                "type": "private",
                "domain": "noto",
                "from": "wallets.org1.alice",
                "data": {
                    "notary": "wallets.org1.notary"
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
