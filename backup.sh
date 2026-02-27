#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
BACKUP_NAME="hostcore_backup_$TIMESTAMP.tar.gz"

echo "Starting backup: $BACKUP_NAME"

# Create backup archive
tar -czf "$BACKUP_DIR/$BACKUP_NAME" apps database.db

echo "Backup completed: $BACKUP_DIR/$BACKUP_NAME"
