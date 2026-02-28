#!/data/data/com.termux/files/usr/bin/bash
# HostCore Autostart for Termux:Boot

# Change this to your HostCore installation directory
HOSTCORE_DIR="$HOME/hostcore-mobile"

if [ -d "$HOSTCORE_DIR" ]; then
    cd "$HOSTCORE_DIR"
    ./start.sh
fi
