#!/bin/bash

# HostCore Mobile Cloud - One Command Installer for Termux
# Usage: bash <(curl -s https://raw.githubusercontent.com/abdulraheemnohri/HostCore-Mobile-Cloud/main/install.sh)

echo "--- HostCore Mobile Cloud Installer ---"

# 1. Update packages
echo "[1/5] Updating Termux packages..."
pkg update -y && pkg upgrade -y

# 2. Install essential dependencies
echo "[2/5] Installing core dependencies (Node.js, Git, Python, MariaDB)..."
pkg install -y nodejs git python mariadb postgresql tar curl

# 3. Clone Repository
echo "[3/5] Cloning HostCore repository..."
if [ -d "HostCore-Mobile-Cloud" ]; then
    echo "Directory already exists. Updating..."
    cd HostCore-Mobile-Cloud && git pull
else
    git clone https://github.com/abdulraheemnohri/HostCore-Mobile-Cloud.git
    cd HostCore-Mobile-Cloud
fi

# 4. Install NPM packages
echo "[4/5] Installing Node.js packages..."
npm install

# 5. Finalize
echo "[5/5] Setup complete!"
echo ""
echo "To start HostCore Mobile Cloud, run:"
echo "cd HostCore-Mobile-Cloud && ./start.sh"
echo ""
echo "Dashboard will be available at http://localhost:3000"
echo "---------------------------------------"
