import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config";
import { initDb, getPool } from "../db";

const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * 执行 migrations 目录下的 SQL 文件。
 * 功能：初始化或升级数据库结构。
 * 参数：无。
 * 返回值：Promise，完成后退出进程。
 */
const runMigrations = async () => {
  const config = loadConfig();
  initDb(config);
  const db = getPool();
  const migrationsDir = join(currentDir, "..", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const statements = sql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await db.query(statement);
    }
    console.log(`已执行迁移: ${file}`);
  }

  console.log("数据库迁移完成");
  process.exit(0);
};

runMigrations().catch((error) => {
  console.error("数据库迁移失败", error);
  process.exit(1);
});
