#!/bin/sh

# Vault initialization script
set -e

echo "🔐 Initializing Vault..."

# Wait for Vault to be ready
until vault status 2>&1 | grep -q "Initialized.*true"; do
  echo "Waiting for Vault to be initialized..."
  sleep 2
done

echo "✅ Vault is initialized"

# Enable audit logging
vault audit enable file file_path=/vault/logs/audit.log

# Enable KV v2 secrets engine
vault secrets enable -path=secret kv-v2

# Enable database secrets engine
vault secrets enable database

# Enable PKI secrets engine for certificates
vault secrets enable pki
vault secrets tune -max-lease-ttl=87600h pki

# Enable transit secrets engine for encryption
vault secrets enable transit

# Create policies
echo "📋 Creating policies..."

# Application policy
vault policy write application - <<EOF
# Read secrets
path "secret/data/application/*" {
  capabilities = ["read", "list"]
}

# Read database credentials
path "database/creds/app-*" {
  capabilities = ["read"]
}

# Use transit encryption
path "transit/encrypt/app" {
  capabilities = ["create", "update"]
}

path "transit/decrypt/app" {
  capabilities = ["create", "update"]
}
EOF

# Admin policy
vault policy write admin - <<EOF
# Full access to secrets
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Manage auth methods
path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Manage policies
path "sys/policies/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Manage database connections
path "database/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF

# Create initial secrets
echo "🔑 Creating initial secrets..."

# Application secrets
vault kv put secret/application/common \
  jwt_secret="$(openssl rand -base64 32)" \
  encryption_key="$(openssl rand -base64 32)" \
  api_key="$(openssl rand -hex 16)"

# Database credentials
vault kv put secret/application/database \
  mongodb_uri="mongodb://mongodb:27017/ecommerce" \
  postgres_uri="postgresql://postgres:password@postgres:5432/users" \
  redis_uri="redis://redis:6379" \
  elasticsearch_uri="http://elasticsearch:9200"

# External service credentials
vault kv put secret/application/external \
  smtp_host="smtp.example.com" \
  smtp_port="587" \
  smtp_user="noreply@example.com" \
  smtp_pass="changeme" \
  s3_bucket="ecommerce-assets" \
  s3_access_key="changeme" \
  s3_secret_key="changeme"

# Configure database connections
echo "🗄️ Configuring database connections..."

# MongoDB connection
vault write database/config/mongodb \
  plugin_name=mongodb-database-plugin \
  allowed_roles="app-read,app-write" \
  connection_url="mongodb://{{username}}:{{password}}@mongodb:27017/admin" \
  username="vaultadmin" \
  password="vaultpass"

# PostgreSQL connection
vault write database/config/postgresql \
  plugin_name=postgresql-database-plugin \
  allowed_roles="app-read,app-write" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/postgres?sslmode=disable" \
  username="vaultadmin" \
  password="vaultpass"

# Create database roles
vault write database/roles/app-read \
  db_name=mongodb \
  creation_statements='{ "db": "ecommerce", "roles": [{ "role": "read" }] }' \
  default_ttl="1h" \
  max_ttl="24h"

vault write database/roles/app-write \
  db_name=mongodb \
  creation_statements='{ "db": "ecommerce", "roles": [{ "role": "readWrite" }] }' \
  default_ttl="1h" \
  max_ttl="24h"

# Configure transit encryption
vault write -f transit/keys/app

# Enable AppRole authentication
vault auth enable approle

# Create AppRole for applications
vault write auth/approle/role/application \
  token_policies="application" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=720h \
  secret_id_num_uses=0

# Get role ID for applications
ROLE_ID=$(vault read -field=role_id auth/approle/role/application/role-id)
echo "Application Role ID: $ROLE_ID"

# Generate a secret ID
SECRET_ID=$(vault write -field=secret_id -f auth/approle/role/application/secret-id)
echo "Application Secret ID: $SECRET_ID"

# Save credentials for applications
cat > /vault/file/app-credentials.json <<EOF
{
  "role_id": "$ROLE_ID",
  "secret_id": "$SECRET_ID",
  "vault_addr": "http://vault:8200"
}
EOF

echo "✅ Vault initialization complete!"
echo ""
echo "Important information:"
echo "  - Application credentials saved to: /vault/file/app-credentials.json"
echo "  - Vault UI available at: http://localhost:8200"
echo "  - Root token: ${VAULT_TOKEN}"
echo ""
echo "⚠️  For production:"
echo "  1. Enable TLS"
echo "  2. Use proper storage backend (Consul or Raft)"
echo "  3. Implement proper unsealing process"
echo "  4. Rotate all initial secrets"
echo "  5. Implement proper audit logging"