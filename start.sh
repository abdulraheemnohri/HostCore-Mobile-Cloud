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

# Fix Termux paths for Node.js modules
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$PREFIX/lib

# Start the main server with PM2
# If PM2 fails to resolve its own modules, we provide a fallback
if ! $PM2_BIN start ecosystem.config.js; then
    echo "PM2 failed to start. Falling back to direct node execution..."
    node server.js
fi

echo "HostCore started. Visit http://localhost:3000"
$PM2_BIN logs hostcore
