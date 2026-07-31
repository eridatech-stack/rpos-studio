import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";

type BackupResult = {
  fileName: string;
  filePath: string;
  tableCount: number;
};

export async function createDatabaseBackup(): Promise<BackupResult> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Database backups are disabled in production mode.");
  }

  const databaseName = process.env.MYSQL_DATABASE;

  if (!databaseName) {
    throw new Error("MYSQL_DATABASE is not configured.");
  }

  const tables = await getBaseTables();
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
  const fileName = `${databaseName}-${timestamp}.sql`;
  const backupDir = path.resolve(process.cwd(), "backups");
  const filePath = path.join(backupDir, fileName);
  const sql = await buildSqlDump({
    databaseName,
    tables,
  });

  await mkdir(backupDir, { recursive: true });
  await writeFile(filePath, sql, "utf8");

  return {
    fileName,
    filePath,
    tableCount: tables.length,
  };
}

async function getBaseTables() {
  const [rows]: any = await db.query(
    `
    SELECT TABLE_NAME AS table_name
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME ASC
    `
  );

  return rows.map((row: any) => String(row.table_name));
}

async function buildSqlDump(input: {
  databaseName: string;
  tables: string[];
}) {
  const chunks = [
    "-- RPOS Studio database backup",
    `-- Database: ${input.databaseName}`,
    `-- Created at: ${new Date().toISOString()}`,
    "SET FOREIGN_KEY_CHECKS=0;",
    "",
  ];

  for (const table of input.tables) {
    chunks.push(await dumpTable(table));
  }

  chunks.push("SET FOREIGN_KEY_CHECKS=1;", "");

  return chunks.join("\n");
}

async function dumpTable(table: string) {
  const quotedTable = quoteIdentifier(table);
  const [createRows]: any = await db.query(
    `SHOW CREATE TABLE ${quotedTable}`
  );
  const createSql =
    createRows[0]?.["Create Table"] ||
    createRows[0]?.["Create View"];
  const [rows]: any = await db.query(
    `SELECT * FROM ${quotedTable}`
  );
  const chunks = [
    `-- Table: ${table}`,
    `DROP TABLE IF EXISTS ${quotedTable};`,
    `${createSql};`,
  ];

  if (rows.length > 0) {
    const columns = Object.keys(rows[0]);
    const columnList = columns
      .map(quoteIdentifier)
      .join(", ");

    for (const batch of chunkRows(rows, 100)) {
      const values = batch
        .map((row) =>
          `(${columns
            .map((column) => serializeSqlValue(row[column]))
            .join(", ")})`
        )
        .join(",\n");

      chunks.push(
        `INSERT INTO ${quotedTable} (${columnList}) VALUES\n${values};`
      );
    }
  }

  chunks.push("");

  return chunks.join("\n");
}

function chunkRows(
  rows: Array<Record<string, unknown>>,
  size: number
) {
  const chunks: Array<Array<Record<string, unknown>>> = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function quoteIdentifier(value: string) {
  return `\`${value.replace(/`/g, "``")}\``;
}

function serializeSqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "bigint") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (value instanceof Date) {
    return quoteSqlString(formatSqlDate(value));
  }

  if (Buffer.isBuffer(value)) {
    return `X'${value.toString("hex")}'`;
  }

  if (typeof value === "object") {
    return quoteSqlString(JSON.stringify(value));
  }

  return quoteSqlString(String(value));
}

function quoteSqlString(value: string) {
  return `'${value
    .replace(/\\/g, "\\\\")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "\\Z")
    .replace(/'/g, "''")}'`;
}

function formatSqlDate(value: Date) {
  return value
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}
