import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPool } from "./db.js";

const config = loadConfig();
await mkdir(resolve(config.UPLOAD_DIR), { recursive: true, mode: 0o750 });
const app = buildApp(config, createPool(config));

const shutdown = async () => {
  await app.close();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await app.listen({ host: config.HOST, port: config.PORT });
