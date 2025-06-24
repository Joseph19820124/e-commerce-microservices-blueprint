#!/bin/bash

# MongoDB Backup Script for E-commerce Platform
# Creates backups of all databases with rotation

set -e

# Configuration
BACKUP_DIR=${BACKUP_DIR:-"/backup"}
MONGODB_URI=${MONGODB_URI:-"mongodb://admin:mongodb_admin_password@mongodb-primary:27017/admin?replicaSet=rs0"}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_backup_${DATE}"

echo "🚀 Starting MongoDB backup: $BACKUP_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to backup database
backup_database() {
    local db_name=$1
    local backup_path="$BACKUP_DIR/$BACKUP_NAME"
    
    log "Backing up database: $db_name"
    
    mongodump \
        --uri="$MONGODB_URI" \
        --db="$db_name" \
        --out="$backup_path" \
        --gzip \
        --verbose
    
    if [ $? -eq 0 ]; then
        log "✅ Successfully backed up $db_name"
    else
        log "❌ Failed to backup $db_name"
        return 1
    fi
}

# Function to create full backup
full_backup() {
    local backup_path="$BACKUP_DIR/$BACKUP_NAME"
    
    log "Creating full MongoDB backup"
    
    mongodump \
        --uri="$MONGODB_URI" \
        --out="$backup_path" \
        --gzip \
        --verbose
    
    if [ $? -eq 0 ]; then
        log "✅ Full backup completed successfully"
    else
        log "❌ Full backup failed"
        return 1
    fi
}

# Function to compress backup
compress_backup() {
    local backup_path="$BACKUP_DIR/$BACKUP_NAME"
    
    log "Compressing backup"
    
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    
    if [ $? -eq 0 ]; then
        rm -rf "$BACKUP_NAME"
        log "✅ Backup compressed: ${BACKUP_NAME}.tar.gz"
    else
        log "❌ Failed to compress backup"
        return 1
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $BACKUP_RETENTION_DAYS days"
    
    find "$BACKUP_DIR" -name "mongodb_backup_*.tar.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
    
    log "✅ Old backups cleaned up"
}

# Function to verify backup
verify_backup() {
    local backup_file="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    
    log "Verifying backup integrity"
    
    if [ -f "$backup_file" ]; then
        # Check if tar file is valid
        tar -tzf "$backup_file" > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            local file_size=$(du -h "$backup_file" | cut -f1)
            log "✅ Backup verified successfully (Size: $file_size)"
        else
            log "❌ Backup verification failed - corrupted archive"
            return 1
        fi
    else
        log "❌ Backup file not found"
        return 1
    fi
}

# Function to send backup notification
send_notification() {
    local status=$1
    local message=$2
    
    # This can be extended to send notifications via email, Slack, etc.
    log "Notification: $status - $message"
    
    # Example webhook notification (uncomment and configure)
    # if [ -n "$WEBHOOK_URL" ]; then
    #     curl -X POST -H 'Content-type: application/json' \
    #         --data "{\"text\":\"MongoDB Backup $status: $message\"}" \
    #         "$WEBHOOK_URL"
    # fi
}

# Main backup process
main() {
    log "MongoDB backup started"
    
    # Check MongoDB connectivity
    mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')" > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        log "❌ Cannot connect to MongoDB"
        send_notification "FAILED" "Cannot connect to MongoDB"
        exit 1
    fi
    
    # Perform backup
    if full_backup && compress_backup && verify_backup; then
        cleanup_old_backups
        send_notification "SUCCESS" "Backup completed: ${BACKUP_NAME}.tar.gz"
        log "🎉 MongoDB backup completed successfully"
    else
        send_notification "FAILED" "Backup process failed"
        log "❌ MongoDB backup failed"
        exit 1
    fi
}

# Run main function
main "$@"