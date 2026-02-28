#!/data/data/com.termux/files/usr/bin/bash
# Refined install.sh for HostCore

set -e
echo "🚀 Initializing HostCore Pro Installation for Termux..."

# Update and install core packages
pkg update && pkg upgrade -y
pkg install -y nodejs-lts mariadb postgresql build-essential python3 python-pip binutils zip unzip curl lsof

# Fix for common native library issues
mkdir -p $PREFIX/lib
[ ! -f $PREFIX/lib/libstdc++.so.6 ] && ln -s $PREFIX/lib/libstdc++.so $PREFIX/lib/libstdc++.so.6 || true

# Install PM2 and dependencies
npm install -g pm2
npm install

# Setup folders
mkdir -p apps uploads backups logs

# Setup databases
echo "🔧 Configuring MariaDB..."
mysql_install_db
mysqld_safe --datadir=$PREFIX/var/lib/mysql > /dev/null 2>&1 &
sleep 5
mariadb -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'hostcore';" || true

echo "🔧 Configuring PostgreSQL..."
mkdir -p $PREFIX/var/lib/postgresql
initdb $PREFIX/var/lib/postgresql || true
pg_ctl -D $PREFIX/var/lib/postgresql start || true

echo "✅ HostCore Pro Installation Complete!"
