#!/usr/bin/env bash
# Database Backup Script using pg_dump
# Market Manager - Tenant Deposit Feature

set -e

BACKUP_DIR="$(pwd)/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

# Extract DATABASE_URL from .env if present
if [ -f ".env" ]; then
  DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found in .env or environment!"
  exit 1
fi

echo "📦 Starting database backup to ${BACKUP_FILE}..."

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "${DATABASE_URL}" --clean --if-exists --no-owner --no-privileges > "${BACKUP_FILE}"
  echo "✅ Backup completed successfully: ${BACKUP_FILE}"
  echo "📊 File size: $(du -h "${BACKUP_FILE}" | cut -f1)"
else
  echo "⚠️ pg_dump command not found in PATH."
  echo "Running Node.js JSON database backup instead..."
  npx tsx scripts/db-backup-json.ts
fi
