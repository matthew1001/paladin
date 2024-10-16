#!/bin/bash
RESULT=$(
    curl -X POST http://localhost:18003 \
     -H "Content-Type: application/json" \
     -d @- <<EOF 
     {
           "jsonrpc":"2.0",
           "method":"ptx_getTransaction",
           "params":[
             "${TxID}",
             true
            ],
            "id":1
    }
EOF
)
STATUS=$(
curl -X POST http://localhost:18003 \
     -H "Content-Type: application/json" \
     -d @- <<EOF
     {
           "jsonrpc":"2.0",
           "method":"debug_getTransactionStatus",
           "params":[
             "${contractAddress}",
             "${TxID}"
           ],
            "id":1
    }
EOF
)

echo $RESULT | jq .
echo "Success: $(echo $RESULT | jq '.result.receipt.success')"
echo $STATUS | jq .

