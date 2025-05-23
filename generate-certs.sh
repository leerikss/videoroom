#!/bin/bash

# Requires: openssl

mkdir -p certs
IP=$(hostname -I | awk '{print $1}')

CERT_IP=$(openssl x509 -in certs/cert.pem -noout -text \
  | grep -A1 "Issuer: CN = " \
  | grep -oP "Issuer: CN = \K[0-9.]+")

if [[ "$IP" == "$CERT_IP" ]]; then
    echo "✅ Certificate matches the current IP, no need to generate certs"
else
    echo "❌ Certificate does NOT match the current IP, generating new certs"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
	    -keyout certs/key.pem -out certs/cert.pem \
	    -subj "/CN=$IP"
fi
