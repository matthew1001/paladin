#!/bin/bash
set -o allexport 
TRANSFER_A2B_RESULT=$(
    curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d @- <<EOF 
     {
           "jsonrpc":"2.0",
           "method":"ptx_getTransaction",
           "params":[
             "${xferA2BTxID}",
             true
            ],
            "id":1
    }
EOF
)
TRANSFER_A2B_STATUS=$(
curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d @- <<EOF
     {
           "jsonrpc":"2.0",
           "method":"debug_getTransactionStatus",
           "params":[
             "${contractAddress}",
             "${xferA2BTxID}"
           ],
            "id":1
    }
EOF
)

echo $TRANSFER_A2B_RESULT | jq .
echo $TRANSFER_A2B_STATUS | jq .

set +o allexport 
