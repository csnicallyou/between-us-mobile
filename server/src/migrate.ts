import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createPool } from "./db.js";

const config = loadConfig();
const pool = createPool(config);
const migrationsDir = resolve(fileURLToPath(new URL("../migrations", import.meta.url)));

try {
  await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
  for (const filename of files) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const exists = await client.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [filename]);
      if (exists.rowCount === 0) {
        await client.query(await readFile(resolve(migrationsDir, filename), "utf8"));
        await client.query("INSERT INTO schema_migrations(filename) VALUES ($1)", [filename]);
        process.stdout.write(`Applied ${filename}\n`);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
