#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install GStreamer core and plugins
sudo apt-get install -y \
  gstreamer1.0-tools \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  gstreamer1.0-plugins-ugly \
  gstreamer1.0-plugins-bad \
  libgstreamer1.0-dev \
  libgstreamer-plugins-base1.0-dev \
  gstreamer1.0-alsa

# libcamerasrc
sudo apt install -y libcamera-dev libcamera-apps gstreamer1.0-libcamera

# QR functionality
sudo apt install -y zbar-tools libcamera-apps
