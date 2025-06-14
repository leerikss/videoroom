#!/bin/bash

PORT=10001
JANUS_URL_FILE="/home/pi/janus_url"

read_url_from_file() {
  if [[ -f "$JANUS_URL_FILE" ]]; then
    local url
    url=$(<"$JANUS_URL_FILE")
    if [[ -n "$url" ]] && url_exists "$url"; then
      echo "$url"
      return 0
    fi
  fi
  return 1    
}

url_exists() {
  local url=$1
  if curl -Iks --max-time 3 "$url" | head -n 1 | grep -qE "HTTP/[0-9\.]+ [23].."; then
    return 0
  else
    return 1
  fi
}

detect_qr_code() {
  local tmpfile="/tmp/camshot.jpg"
  # Take a photo (adjust command if using raspistill or libcamera-still)
  libcamera-still -o "$tmpfile" -n --timeout 1000 2>/dev/null
  local qr_url
  qr_url=$(zbarimg --quiet --raw "$tmpfile")
  rm -f "$tmpfile"
  echo "$qr_url"    
}

key_pressed() {
  read -t 1 -n 1 key
  if [[ $? -eq 0 ]]; then
    return 0
  else
    return 1
  fi
}

ip_from_url() {
    echo $(echo "$1" | sed -E 's~https?://([^/]+).*~\1~')
}

stream() {
    # Optimized for RPI Camera Module V2
    gst-launch-1.0 -v libcamerasrc ! \
                   video/x-raw,width=1632,height=1232,framerate=15/1 ! \
                   videoconvert ! \
                   x264enc tune=zerolatency speed-preset=ultrafast bitrate=1500 ! \
                   rtph264pay pt=96 config-interval=1 ! \
                   udpsink host=$1 port=$PORT sync=false async=false
}

main() {
  local url

  url=$(read_url_from_file)
  if [[ $? -eq 0 ]]; then
    echo "Janus url exists: $url"
    stream $(ip_from_url "$url")
    exit 0
  fi

  for i in {1..10}; do
    if key_pressed; then
      break
    fi

    url=$(detect_qr_code)
    echo $url
    if [[ -n "$url" ]] && url_exists "$url"; then
      # Write the URL to file for future use
      echo "$url" > "$JANUS_URL_FILE"
      echo "QR decoded: $url"
      stream $(ip_from_url "$url")
      exit 0
    fi
  done  
}

main
