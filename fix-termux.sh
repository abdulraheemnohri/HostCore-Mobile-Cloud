#!/bin/bash

# HostCore - Termux Library Fixer
# Run this if you encounter dlopen failed or missing .so library errors

echo "--- HostCore Termux Fixer ---"

# 1. Update and Upgrade
echo "Ensuring system is up to date..."
pkg update -y && pkg upgrade -y

# 2. Reinstall core libraries
echo "Reinstalling libc++ and nodejs..."
pkg install -y libc++ nodejs build-essential

# 3. Fix symlinks for common libraries
echo "Fixing common library symlinks..."
if [ ! -f "$PREFIX/lib/libstdc++.so.6" ]; then
    ln -s "$PREFIX/lib/libc++.so" "$PREFIX/lib/libstdc++.so.6"
    echo "Symlink created: libstdc++.so.6 -> libc++.so"
fi

# 4. Rebuild native modules
echo "Cleaning and rebuilding node_modules..."
rm -rf node_modules
npm install --build-from-source

echo "Fix applied! Try running ./start.sh again."
