#!/data/data/com.termux/files/usr/bin/bash
# Refined start.sh for HostCore

echo "🚀 Starting HostCore Pro Service..."

# Kill any existing processes on PORT 3000
fuser -k 3000/tcp 2>/dev/null || true

# Start HostCore server with PM2
pm2 start server.js --name hostcore-pro --update-env || pm2 restart hostcore-pro

# Request Termux wake-lock to keep services alive
termux-wake-lock || echo "⚠️ Wake-lock not available (non-Termux)"

echo "✅ HostCore Pro is running!"
pm2 logs hostcore-pro
