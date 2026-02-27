#!/bin/bash
echo "Starting HostCore Mobile Cloud..."

# Ensure pm2 is available
if ! command -v pm2 &> /dev/null
then
    echo "PM2 could not be found. Installing..."
    npm install -g pm2
fi

# Start the main server with PM2
pm2 start ecosystem.config.js

echo "HostCore started. Visit http://localhost:3000"
pm2 logs hostcore
