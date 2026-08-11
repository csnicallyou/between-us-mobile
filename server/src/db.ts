import pg from "pg";
import type { AppConfig } from "./config.js";

const { Pool, types } = pg;

// node-postgres parses DATE columns (OID 1082) into local-midnight JS Date objects by
// default, which JSON.stringify then serializes as a full ISO datetime. Every consumer
// (OpenAPI schema, Zod input validation, mobile client) expects a bare "YYYY-MM-DD"
// string, so keep the raw text form instead of letting pg coerce it.
types.setTypeParser(1082, (value) => value);

export function createPool(config: AppConfig) {
  return new Pool({
    connectionString: config.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: config.DATABASE_SSL ? { rejectUnauthorized: true } : false
  });
}
