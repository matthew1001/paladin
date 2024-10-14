# Manual whitebox testing with Zeto
Instructions for running Zeto on a network of private transaction engines running from uncompiled source from command line or under a debugger.

### Create the test infrastructure
```bash
gradle testinfra:startTestInfra
```

#### Deploy the zeto factory contract

Easiest way to do this is run one of the zeto integartion tests e.g. `TestZeto_Anon` under a debugger, break in the 

### Create alices mTLS key and cert
pushd ./keys/alice
./generate-key-and-cert.sh
popd

### Create bobs mTLS key and cert
pushd ./keys/bob
./generate-key-and-cert.sh
popd

### Create alices config

see example ./alice.yaml

### Create bobs config

see example ./bob.yaml

### Start alices node
```bash
go run main.go start -i 27b89620-2e6a-41ea-b4a7-8bf2f07b0000 -n alice -c ../config/alice.yaml 2>&1 | tee alice.log
```
(or use debug launch config )

### Start bobs node
```bash
go run main.go start -i 427cd8e2-ff68-4fbf-8b02-d016c2cf2525  -n bob -c ../config/bob.yaml 2>&1 | tee bob.log
```

You should be able to send some JSONRPC messages to test it out


### ask alices node to resolve alices identity
```bash
curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d '{
           "jsonrpc":"2.0",
           "method":"ptx_resolveVerifier",
           "params":[
             "wallets.org1.alice@27b89620-2e6a-41ea-b4a7-8bf2f07b0000",
                "ecdsa:secp256k1",
                "eth_address"
           ],
           "id":1
         }'
```

### ask bobs node to resolve bob identity
```bash
curl -X POST http://localhost:18002 \
     -H "Content-Type: application/json" \
     -d '{
           "jsonrpc":"2.0",
           "method":"ptx_resolveVerifier",
           "params":[
             "wallets.org2.bob@427cd8e2-ff68-4fbf-8b02-d016c2cf2525",
                "ecdsa:secp256k1",
                "eth_address"
           ],
           "id":1
         }'
```

### ask alices node to resolve bob identity
```bash
curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d '{
           "jsonrpc":"2.0",
           "method":"ptx_resolveVerifier",
           "params":[
              "wallets.org2.bob@427cd8e2-ff68-4fbf-8b02-d016c2cf2525",
              "ecdsa:secp256k1",
              "eth_address"
           ],
           "id":1
         }'
```

### Deploy an instance of zeto
```bash
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
```

### get transaction status
```bash
DEPLOY_RESULT=$(
    curl -X POST http://localhost:18001 \
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
```

### mint some zeto tokens

```bash
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

MINT_RESULT=$(
    curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d @- <<EOF 
     {
           "jsonrpc":"2.0",
           "method":"ptx_getTransaction",
           "params":[
             "${mintTxID}",
             true
            ],
            "id":1
    }
EOF
)
echo $MINT_RESULT | jq .
```

### Transfer from alice to bob

```bash
TRANSFER_A2B_RESPONSE=$(
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
                    "to": "wallets.org2.bob@427cd8e2-ff68-4fbf-8b02-d016c2cf2525",
                    "amount": "50"
                },
                "abi": [
                    {
                    "type": "function",
                    "name": "transfer",
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
echo $TRANSFER_A2B_RESPONSE | jq .
xferA2BTxID=$(echo $TRANSFER_A2B_RESPONSE | jq -r .result)
echo $xferA2BTxID

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
echo $TRANSFER_A2B_RESULT | jq .
```

### Transfer from bob to alice

```bash
TRANSFER_B2A_RESPONSE=$(
curl -X POST http://localhost:18002 \
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
                "from": "wallets.org2.bob",
                "data": {
                    "to": "wallets.org1.alice@27b89620-2e6a-41ea-b4a7-8bf2f07b0000",
                    "amount": "30"
                },
                "abi": [
                    {
                    "type": "function",
                    "name": "transfer",
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
echo $TRANSFER_B2A_RESPONSE | jq .
xferB2ATxID=$(echo $TRANSFER_B2A_RESPONSE | jq -r .result)
echo $xferB2ATxID

TRANSFER_B2A_RESULT=$(
    curl -X POST http://localhost:18001 \
     -H "Content-Type: application/json" \
     -d @- <<EOF 
     {
           "jsonrpc":"2.0",
           "method":"ptx_getTransaction",
           "params":[
             "${xferB2ATxID}",
             true
            ],
            "id":1
    }
EOF
)
echo $TRANSFER_B2A_RESULT | jq .
```