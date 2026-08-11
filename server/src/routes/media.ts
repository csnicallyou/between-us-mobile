import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { createReadStream } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { AppConfig } from "../config.js";
import { HttpError, idParams, parse, requirePair, requireUser } from "../lib/http.js";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function detectedMime(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export function registerMediaRoutes(app: FastifyInstance, db: Pool, config: AppConfig) {
  const uploadRoot = resolve(config.UPLOAD_DIR);

  app.post("/media", { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } }, async (request, reply) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const part = await request.file();
    if (!part || !allowedTypes.has(part.mimetype)) throw new HttpError(415, "UNSUPPORTED_MEDIA", "Unsupported media type");
    const buffer = await part.toBuffer();
    if (!buffer.length || buffer.length > config.MAX_UPLOAD_BYTES) throw new HttpError(413, "FILE_TOO_LARGE", "File is too large");
    const mimeType = detectedMime(buffer);
    if (!mimeType || mimeType !== part.mimetype) throw new HttpError(415, "UNSUPPORTED_MEDIA", "Unsupported media type");
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1]!;
    const storageName = `${randomUUID()}.${extension}`;
    const storagePath = resolve(uploadRoot, storageName);
    await writeFile(storagePath, buffer, { flag: "wx", mode: 0o640 });
    try {
      const result = await db.query<{ id: string; created_at: Date }>("INSERT INTO media(pair_id,owner_id,storage_name,original_name,mime_type,size_bytes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,created_at", [pairId, userId, storageName, basename(part.filename).slice(0, 255) || "image", mimeType, buffer.length]);
      return reply.code(201).send({ id: result.rows[0]!.id, mimeType, sizeBytes: buffer.length, createdAt: result.rows[0]!.created_at, downloadUrl: `/v1/media/${result.rows[0]!.id}` });
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }
  });

  app.get("/media/:id", async (request, reply) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const { id } = parse(idParams, request.params);
    const result = await db.query<{ storage_name: string; mime_type: string; size_bytes: number }>("SELECT storage_name,mime_type,size_bytes FROM media WHERE id=$1 AND pair_id=$2", [id, pairId]);
    const media = result.rows[0];
    if (!media) throw new HttpError(404, "NOT_FOUND", "Resource not found");
    const path = resolve(uploadRoot, media.storage_name);
    if (!path.startsWith(`${uploadRoot}\\`) && !path.startsWith(`${uploadRoot}/`)) throw new HttpError(404, "NOT_FOUND", "Resource not found");
    reply.header("Content-Type", media.mime_type).header("Content-Length", media.size_bytes).header("Cache-Control", "private, no-store").header("Content-Disposition", "inline");
    return reply.send(createReadStream(path));
  });

  app.delete("/media/:id", async (request, reply) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const { id } = parse(idParams, request.params);
    const result = await db.query<{ storage_name: string }>("DELETE FROM media WHERE id=$1 AND pair_id=$2 RETURNING storage_name", [id, pairId]);
    if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", "Resource not found");
    await unlink(resolve(uploadRoot, result.rows[0].storage_name)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") request.log.error({ err: error, mediaId: id }, "media file delete failed"); });
    return reply.code(204).send();
  });
}
