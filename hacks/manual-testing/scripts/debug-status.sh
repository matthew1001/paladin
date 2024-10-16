#!/bin/bash
set -o allexport 
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
set +o allexport
