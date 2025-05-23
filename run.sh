#!/bin/bash

# Requires: qrencode

IP=$(hostname -I | awk '{print $1}')
URL="https://$IP"

print_msg() {
    local green='\033[0;32m'
    local bold='\033[1m'
    local reset='\033[0m'
    local msg=$1
    echo ""
    echo -e "${bold}${green}${msg}${reset}"
    echo ""
}

# Generate certs
print_msg "Generating Certs..."
./generate-certs.sh

# Run docker compose
print_msg "Stop & Build & Start App..."
docker compose down
docker compose up --build -d
print_msg "To see logs: docker compose logs -f"

# Show QR code
print_msg "All done :) "
print_msg "Open: $URL -OR- scan this:"
qrencode -t ansiutf8 $URL
