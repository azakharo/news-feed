#!/bin/bash

# Generate self-signed SSL certificates for development/testing
# Usage: ./scripts/generate-dev-certs.sh

SSL_DIR="./nginx/ssl"

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/key.pem" \
  -out "$SSL_DIR/cert.pem" \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=NewsFeed/OU=Development/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Set permissions
chmod 644 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/key.pem"

echo "✅ Self-signed certificates generated in $SSL_DIR"
echo "   Certificate: $SSL_DIR/cert.pem"
echo "   Private key: $SSL_DIR/key.pem"