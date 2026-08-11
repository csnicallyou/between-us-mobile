import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { parse, requirePair, requireUser } from "../lib/http.js";

const bodySchema = z.object({
  backgroundKind: z.enum(["default", "color", "image"]),
  backgroundValue: z.string().max(2048).nullable(),
  backgroundLuminance: z.number().min(0).max(1),
}).strict();

export function registerAppearanceRoutes(app: FastifyInstance, db: Pool) {
  app.get("/appearance", async (request) => {
    const pairId = await requirePair(db, await requireUser(request));
    const result = await db.query<{
      user_id: string; background_kind: string | null; background_value: string | null; background_luminance: number | null; updated_at: Date | null;
    }>(
      `SELECT pm.user_id,a.background_kind,a.background_value,a.background_luminance,a.updated_at
       FROM pair_members pm LEFT JOIN appearances a ON a.pair_id=pm.pair_id AND a.user_id=pm.user_id
       WHERE pm.pair_id=$1 ORDER BY pm.joined_at`,
      [pairId]
    );
    return {
      items: result.rows.map((row) => ({
        userId: row.user_id,
        backgroundKind: row.background_kind ?? "default",
        backgroundValue: row.background_value,
        backgroundLuminance: row.background_luminance ?? 0.95,
        updatedAt: row.updated_at,
      })),
    };
  });

  app.put("/appearance/me", async (request) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const body = parse(bodySchema, request.body);
    const result = await db.query<{ background_kind: string; background_value: string | null; background_luminance: number; updated_at: Date }>(
      `INSERT INTO appearances(pair_id,user_id,background_kind,background_value,background_luminance) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT(pair_id,user_id) DO UPDATE SET background_kind=excluded.background_kind,background_value=excluded.background_value,background_luminance=excluded.background_luminance,updated_at=now()
       RETURNING background_kind,background_value,background_luminance,updated_at`,
      [pairId, userId, body.backgroundKind, body.backgroundValue, body.backgroundLuminance]
    );
    const row = result.rows[0]!;
    return { userId, backgroundKind: row.background_kind, backgroundValue: row.background_value, backgroundLuminance: row.background_luminance, updatedAt: row.updated_at };
  });
}
