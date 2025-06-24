#!/bin/bash

# Certificate generation script for development and production environments
# For production, use Let's Encrypt with certbot

set -e

CERT_DIR="/etc/nginx/certificates"
DOMAIN="ecommerce.example.com"
ADMIN_DOMAIN="admin.ecommerce.example.com"

echo "🔐 Certificate Generation Script"
echo "================================"

# Create certificate directory
mkdir -p $CERT_DIR

# Function to generate self-signed certificate
generate_self_signed() {
    local domain=$1
    local prefix=$2
    
    echo "Generating self-signed certificate for $domain..."
    
    # Generate private key
    openssl genrsa -out $CERT_DIR/${prefix}privkey.pem 4096
    
    # Generate certificate signing request
    openssl req -new -key $CERT_DIR/${prefix}privkey.pem \
        -out $CERT_DIR/${prefix}csr.pem \
        -subj "/C=US/ST=State/L=City/O=E-Commerce/CN=$domain"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 \
        -in $CERT_DIR/${prefix}csr.pem \
        -signkey $CERT_DIR/${prefix}privkey.pem \
        -out $CERT_DIR/${prefix}fullchain.pem
    
    # Copy as chain for compatibility
    cp $CERT_DIR/${prefix}fullchain.pem $CERT_DIR/${prefix}chain.pem
    
    echo "✅ Certificate generated for $domain"
}

# Function to generate DH parameters
generate_dhparam() {
    echo "Generating DH parameters (this may take a while)..."
    openssl dhparam -out $CERT_DIR/dhparam.pem 2048
    echo "✅ DH parameters generated"
}

# Function to setup Let's Encrypt (production)
setup_letsencrypt() {
    echo "Setting up Let's Encrypt certificates..."
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        echo "Installing certbot..."
        apt-get update && apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Generate certificates
    certbot certonly --nginx \
        -d $DOMAIN \
        -d www.$DOMAIN \
        -d $ADMIN_DOMAIN \
        --non-interactive \
        --agree-tos \
        --email admin@$DOMAIN \
        --redirect \
        --expand
    
    # Create symbolic links
    ln -sf /etc/letsencrypt/live/$DOMAIN/fullchain.pem $CERT_DIR/fullchain.pem
    ln -sf /etc/letsencrypt/live/$DOMAIN/privkey.pem $CERT_DIR/privkey.pem
    ln -sf /etc/letsencrypt/live/$DOMAIN/chain.pem $CERT_DIR/chain.pem
    
    # Setup auto-renewal
    echo "0 0,12 * * * root certbot renew --quiet && nginx -s reload" > /etc/cron.d/certbot-renew
    
    echo "✅ Let's Encrypt certificates configured with auto-renewal"
}

# Main script logic
if [ "$1" == "production" ]; then
    echo "🌐 Production mode - Using Let's Encrypt"
    setup_letsencrypt
else
    echo "🔧 Development mode - Generating self-signed certificates"
    generate_self_signed $DOMAIN ""
    generate_self_signed $ADMIN_DOMAIN "admin-"
fi

# Always generate DH parameters if not exists
if [ ! -f "$CERT_DIR/dhparam.pem" ]; then
    generate_dhparam
fi

# Set proper permissions
chmod 600 $CERT_DIR/*.pem
chmod 644 $CERT_DIR/*fullchain.pem $CERT_DIR/*chain.pem

echo ""
echo "✅ Certificate setup complete!"
echo ""
echo "Certificate locations:"
echo "  Main domain: $CERT_DIR/fullchain.pem"
echo "  Admin domain: $CERT_DIR/admin-fullchain.pem"
echo "  DH Parameters: $CERT_DIR/dhparam.pem"
echo ""

# Verify certificates
echo "Certificate details:"
openssl x509 -in $CERT_DIR/fullchain.pem -noout -subject -dates