import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { HttpError, idParams, parse, requirePair, requireUser } from "../lib/http.js";
import { sendPushToUser } from "../lib/push.js";

const decideBody = z.object({ approve: z.boolean() }).strict();

type ExportRow = { id: string; requested_by: string; status: string; expires_at: Date; created_at: Date };

function isLive(row: ExportRow) {
  return row.status !== "pending" || row.expires_at > new Date();
}

export function registerExportRoutes(app: FastifyInstance, db: Pool) {
  // The pair's one active request (pending, approved, or recently decided) — expired
  // pending requests are treated as if none exists, freeing up a new request.
  app.get("/exports/status", async (request) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const result = await db.query<ExportRow>(
      "SELECT id,requested_by,status,expires_at,created_at FROM data_export_requests WHERE pair_id=$1 ORDER BY created_at DESC LIMIT 1",
      [pairId]
    );
    const row = result.rows[0];
    if (!row || !isLive(row)) return { request: null };
    return { request: { id: row.id, requestedBy: row.requested_by, status: row.status, expiresAt: row.expires_at, createdAt: row.created_at, isRequester: row.requested_by === userId } };
  });

  app.post("/exports/request", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (request, reply) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const existing = await db.query<ExportRow>(
      "SELECT id,requested_by,status,expires_at,created_at FROM data_export_requests WHERE pair_id=$1 ORDER BY created_at DESC LIMIT 1",
      [pairId]
    );
    if (existing.rows[0] && isLive(existing.rows[0])) throw new HttpError(409, "EXPORT_REQUEST_ACTIVE", "An export request is already pending or approved");
    const created = await db.query<{ id: string }>(
      "INSERT INTO data_export_requests(pair_id, requested_by) VALUES ($1,$2) RETURNING id",
      [pairId, userId]
    );
    const partner = await db.query<{ user_id: string }>("SELECT user_id FROM pair_members WHERE pair_id=$1 AND user_id<>$2", [pairId, userId]);
    if (partner.rows[0]) {
      void sendPushToUser(db, partner.rows[0].user_id, {
        title: "Между нами",
        body: "Партнёр просит разрешение на экспорт общих данных",
        category: "system",
        data: { type: "export_request", requestId: created.rows[0]!.id },
      }).catch(() => undefined);
    }
    return reply.code(201).send({ id: created.rows[0]!.id });
  });

  app.post("/exports/:id/decide", async (request, reply) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const { id } = parse(idParams, request.params);
    const body = parse(decideBody, request.body);
    const result = await db.query<ExportRow>(
      "SELECT id,requested_by,status,expires_at,created_at FROM data_export_requests WHERE id=$1 AND pair_id=$2 FOR UPDATE",
      [id, pairId]
    );
    const row = result.rows[0];
    if (!row || !isLive(row) || row.status !== "pending") throw new HttpError(404, "NOT_FOUND", "Resource not found");
    if (row.requested_by === userId) throw new HttpError(403, "FORBIDDEN", "Only the other member of the pair can decide this request");
    await db.query(
      "UPDATE data_export_requests SET status=$3, decided_by=$2, decided_at=now() WHERE id=$1",
      [id, userId, body.approve ? "approved" : "denied"]
    );
    return reply.code(204).send();
  });

  app.get("/exports/:id/download", async (request, reply) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const { id } = parse(idParams, request.params);
    const result = await db.query<ExportRow>(
      "SELECT id,requested_by,status,expires_at,created_at FROM data_export_requests WHERE id=$1 AND pair_id=$2",
      [id, pairId]
    );
    const row = result.rows[0];
    if (!row || row.status !== "approved") throw new HttpError(404, "NOT_FOUND", "Resource not found");
    const [entries, moods, chat, media] = await Promise.all([
      db.query("SELECT kind,payload,author_id,version,created_at,updated_at FROM entries WHERE pair_id=$1 ORDER BY created_at", [pairId]),
      db.query("SELECT user_id,mood,updated_at FROM moods WHERE pair_id=$1", [pairId]),
      db.query("SELECT author_id,content,created_at FROM chat_messages WHERE pair_id=$1 ORDER BY created_at", [pairId]),
      db.query("SELECT id,original_name,mime_type,size_bytes,created_at FROM media WHERE pair_id=$1 ORDER BY created_at", [pairId]),
    ]);
    reply.header("Content-Disposition", "attachment; filename=\"between-us-export.json\"");
    return {
      exportedAt: new Date().toISOString(),
      pairId,
      entries: entries.rows,
      moods: moods.rows,
      chat: chat.rows,
      media: media.rows,
    };
  });
}
