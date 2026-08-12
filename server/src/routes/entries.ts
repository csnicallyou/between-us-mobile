import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { HttpError, idParams, paginationQuery, parse, requirePair, requireUser } from "../lib/http.js";
import { sendPushToUser } from "../lib/push.js";

const kinds = z.enum(["plan", "journal", "memory", "about", "agreement", "conflict"]);
const payload = z.record(z.string().max(100), z.unknown()).refine((value) => Object.keys(value).length <= 50);
const createBody = z.object({ kind: kinds, payload }).strict();
const updateBody = z.object({ payload, expectedVersion: z.number().int().positive().optional() }).strict();
const listQuery = paginationQuery.extend({ kind: kinds.optional() });

// Deliberately no "about"/"conflict" here: those are reference/analysis entries, not
// the kind of thing that should interrupt a partner's phone the moment they're saved.
// Bodies stay content-free (no entry title/text) to match "hide sensitive text by
// default" — richer per-category previews are a future opt-in, not tonight's scope.
const pushLabelByKind: Partial<Record<z.infer<typeof kinds>, string>> = {
  plan: "Новый план",
  journal: "Новая запись в дневнике",
  memory: "Новое памятное событие",
  agreement: "Новая договорённость",
};

const mapEntry = (row: Record<string, unknown>) => ({
  id: row.id, kind: row.kind, payload: row.payload, authorId: row.author_id, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at
});

export function registerEntryRoutes(app: FastifyInstance, db: Pool) {
  app.get("/entries", async (request) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const query = parse(listQuery, request.query);
    const result = await db.query(
      `SELECT id,kind,payload,author_id,version,created_at,updated_at FROM entries
       WHERE pair_id=$1 AND ($2::text IS NULL OR kind=$2) AND ($3::timestamptz IS NULL OR updated_at<$3)
       ORDER BY updated_at DESC,id DESC LIMIT $4`, [pairId, query.kind ?? null, query.before ?? null, query.limit]
    );
    return { items: result.rows.map(mapEntry), nextCursor: result.rows.length === query.limit ? result.rows.at(-1)?.updated_at : null };
  });

  app.get("/entries/:id", async (request) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const { id } = parse(idParams, request.params);
    const result = await db.query("SELECT id,kind,payload,author_id,version,created_at,updated_at FROM entries WHERE id=$1 AND pair_id=$2", [id, pairId]);
    if (!result.rows[0]) throw new HttpError(404, "NOT_FOUND", "Resource not found");
    return mapEntry(result.rows[0]);
  });

  app.post("/entries", async (request, reply) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const body = parse(createBody, request.body);
    const result = await db.query("INSERT INTO entries(pair_id,author_id,kind,payload) VALUES ($1,$2,$3,$4) RETURNING id,kind,payload,author_id,version,created_at,updated_at", [pairId, userId, body.kind, body.payload]);
    const entry = mapEntry(result.rows[0]!);
    const label = pushLabelByKind[body.kind];
    if (label) {
      const partner = await db.query<{ user_id: string }>("SELECT user_id FROM pair_members WHERE pair_id=$1 AND user_id<>$2", [pairId, userId]);
      if (partner.rows[0]) {
        void sendPushToUser(db, partner.rows[0].user_id, { title: "Между нами", body: label, category: body.kind, data: { type: body.kind, entryId: entry.id } }).catch(() => undefined);
      }
    }
    return reply.code(201).send(entry);
  });

  app.patch("/entries/:id", async (request) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const { id } = parse(idParams, request.params);
    const body = parse(updateBody, request.body);
    const result = await db.query(
      "UPDATE entries SET payload=$3,version=version+1,updated_at=now() WHERE id=$1 AND pair_id=$2 AND ($4::int IS NULL OR version=$4) RETURNING id,kind,payload,author_id,version,created_at,updated_at",
      [id, pairId, body.payload, body.expectedVersion ?? null]
    );
    if (!result.rows[0]) throw new HttpError(body.expectedVersion ? 409 : 404, body.expectedVersion ? "VERSION_CONFLICT" : "NOT_FOUND", body.expectedVersion ? "Entry changed on another device" : "Resource not found");
    return mapEntry(result.rows[0]);
  });

  app.delete("/entries/:id", async (request, reply) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const { id } = parse(idParams, request.params);
    const result = await db.query("DELETE FROM entries WHERE id=$1 AND pair_id=$2", [id, pairId]);
    if (!result.rowCount) throw new HttpError(404, "NOT_FOUND", "Resource not found");
    return reply.code(204).send();
  });
}
