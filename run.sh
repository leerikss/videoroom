#!/bin/bash

# Requires: qrencode

IP=$(hostname -I | awk '{print $1}')
URL="https://$IP"

print_centered_qr() {
  local content="$1"

  # Generate QR code and capture into an array of lines
  mapfile -t qr_lines < <(qrencode -t ANSIUTF8 "$content")

  local qr_height=${#qr_lines[@]}
  local qr_width=$(echo "${qr_lines[0]}" | wc -m)

  # Get terminal size (Bash-safe)
  local term_height=$(tput lines)
  local term_width=$(tput cols)

  # Calculate vertical and horizontal padding
  local vert_pad=$(( (term_height - qr_height) / 2 ))
  local horiz_pad=$(( (term_width - qr_width) / 2 ))

  # Clear screen (optional)
  clear

  # Print blank lines for vertical centering
  for ((i = 0; i < vert_pad; i++)); do
    echo
  done

  # Print QR code lines with horizontal padding
  for line in "${qr_lines[@]}"; do
    printf "%*s%s\n" "$horiz_pad" "" "$line"
  done

  # Print blank lines for vertical centering
  for ((i = 0; i < vert_pad; i++)); do
    echo
  done  
}

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
print_centered_qr $URL
