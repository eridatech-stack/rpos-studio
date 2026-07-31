import { NextResponse } from "next/server";
import { createDatabaseBackup } from "@/modules/developer-tools/databaseBackupService";

export async function POST() {
  try {
    const backup = await createDatabaseBackup();

    return NextResponse.json({
      success: true,
      fileName: backup.fileName,
      filePath: backup.filePath,
      tableCount: backup.tableCount,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create database backup.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
