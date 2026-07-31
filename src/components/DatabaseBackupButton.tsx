"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function DatabaseBackupButton() {
  return (
    <AsyncActionButton
      endpoint="/api/developer-tools/backup-database"
      idleLabel="Create Database Backup"
      loadingLabel="Creating backup..."
      successTitle="Database backup created"
      successDescription="The SQL backup was saved in the local backups folder."
      errorTitle="Backup failed"
      defaultErrorMessage="Unable to create database backup."
      confirmMessage="Create a local SQL backup of the configured database?"
      variant="secondary"
    />
  );
}
