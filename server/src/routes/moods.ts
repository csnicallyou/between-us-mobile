import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { parse, requirePair, requireUser } from "../lib/http.js";

const bodySchema = z.object({ mood: z.enum(["calm", "happy", "tender", "anxious", "sad", "angry", "tired", "neutral"]).nullable() }).strict();

export function registerMoodRoutes(app: FastifyInstance, db: Pool) {
  app.get("/moods", async (request) => {
    const pairId = await requirePair(db, await requireUser(request));
    const result = await db.query(`SELECT pm.user_id,m.mood,m.updated_at,u.display_name,pm.member_slot FROM pair_members pm JOIN users u ON u.id=pm.user_id LEFT JOIN moods m ON m.pair_id=pm.pair_id AND m.user_id=pm.user_id WHERE pm.pair_id=$1 ORDER BY pm.joined_at`, [pairId]);
    return { items: result.rows.map((row) => ({ userId: row.user_id, displayName: row.display_name, memberSlot: row.member_slot, mood: row.mood, updatedAt: row.updated_at })) };
  });
  app.put("/moods/me", async (request) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const { mood } = parse(bodySchema, request.body);
    const result = await db.query("INSERT INTO moods(pair_id,user_id,mood) VALUES ($1,$2,$3) ON CONFLICT(pair_id,user_id) DO UPDATE SET mood=excluded.mood,updated_at=now() RETURNING mood,updated_at", [pairId, userId, mood]);
    return { userId, mood: result.rows[0]!.mood, updatedAt: result.rows[0]!.updated_at };
  });
}
