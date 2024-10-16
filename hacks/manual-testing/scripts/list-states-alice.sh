#!/bin/bash
SCHEMAS=$(
    curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d @- <<EOF 
     {
           "jsonrpc":"2.0",
           "method":"pstate_listSchemas",
           "params":[
             "noto"
            ],
            "id":1
    }
EOF
)
echo $SCHEMAS | jq .
schemaID=$(echo $SCHEMAS | jq -r '.result[0].id')
queryJSON=$(cat <<EOF
{
		"eq": [{
		  "field": "color",
		  "value": "blue"
		}]
}
EOF
)
queryJSONString=$(echo $queryJSON| jq  '.|tostring')
RESULT=$(
    curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d @- <<EOF 
     {
           "jsonrpc":"2.0",
           "method":"pstate_queryStates",
           "params":[
             "noto",
             "${contractAddress}",
             "${schemaID}",
             $queryJSONString,
             "all"
            ],
            "id":1
    }
EOF
)



echo $RESULT | jq .


