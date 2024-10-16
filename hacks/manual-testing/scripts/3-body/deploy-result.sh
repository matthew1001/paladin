#!/bin/bash
set -o allexport 
DEPLOY_RESULT=$(
    curl -X POST http://localhost:18003 \
     -H "Content-Type: application/json" \
     -d @- <<EOF 
     {
           "jsonrpc":"2.0",
           "method":"ptx_getTransaction",
           "params":[
             "${deployTxId}",
             true
            ],
            "id":1
    }
EOF
)
echo $DEPLOY_RESULT | jq .
contractAddress=$(echo $DEPLOY_RESULT | jq -r .result.receipt.contractAddress)
echo $contractAddress
set +o allexport
