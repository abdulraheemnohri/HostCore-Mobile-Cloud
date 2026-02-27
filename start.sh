#!/bin/bash
echo "Starting HostCore Mobile Cloud..."

# Ensure pm2 is available
if ! command -v pm2 &> /dev/null
then
    echo "PM2 could not be found. Using local version..."
    PM2_BIN="./node_modules/.bin/pm2"
else
    PM2_BIN="pm2"
fi

# Create required directories
mkdir -p apps uploads backups logs

# Check dependencies
node check-deps.js

# Start the main server with PM2
$PM2_BIN start ecosystem.config.js

echo "HostCore started. Visit http://localhost:3000"
$PM2_BIN logs hostcore
