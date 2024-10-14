
# Set the file names for the private key, public key, CSR, and certificate
PRIVATE_KEY="private_key.pem"
PUBLIC_KEY="public_key.pem"
CSR="certificate.csr"
CERTIFICATE="certificate.crt"
CONFIG_FILE="ssl.cnf"

# Generate the private key
openssl genpkey -algorithm RSA -out $PRIVATE_KEY -pkeyopt rsa_keygen_bits:2048

# Extract the public key from the private key
openssl rsa -pubout -in $PRIVATE_KEY -out $PUBLIC_KEY

# Generate a CSR using the private key
openssl req -new -key $PRIVATE_KEY -out $CSR -config $CONFIG_FILE

# Generate a self-signed certificate using the CSR and configuration file
openssl x509 -req -days 365 -in $CSR -signkey $PRIVATE_KEY -out $CERTIFICATE -extfile $CONFIG_FILE -extensions v3_req

# Output the file names
echo "Private key saved to $PRIVATE_KEY"
echo "Public key saved to $PUBLIC_KEY"
echo "CSR saved to $CSR"
echo "Certificate saved to $CERTIFICATE"