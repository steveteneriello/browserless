#!/bin/bash

# Create necessary directories for Chrome
mkdir -p /tmp/.config /tmp/.local/share /tmp/.cache
mkdir -p /tmp/chrome-user-data /tmp/chrome-data /tmp/chrome-cache /tmp/chrome-crashes

# Set proper permissions
chmod 755 /tmp/.config /tmp/.local /tmp/.local/share /tmp/.cache
chmod 755 /tmp/chrome-user-data /tmp/chrome-data /tmp/chrome-cache /tmp/chrome-crashes

# Start the application
exec node --max-old-space-size=256 --expose-gc dist/index.js
