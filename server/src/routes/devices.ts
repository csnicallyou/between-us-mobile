import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { parse, requireUser } from "../lib/http.js";

export const PUSH_CATEGORIES = ["chat", "plan", "journal", "memory", "agreement"] as const;

const registerBody = z.object({
  expoPushToken: z.string().min(10).max(300),
  platform: z.enum(["ios", "android"]),
  quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
  quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
  timezone: z.string().max(64).nullable().optional(),
  categories: z.array(z.enum(PUSH_CATEGORIES)).optional(),
}).strict();

const unregisterBody = z.object({ expoPushToken: z.string().min(10).max(300) }).strict();

export function registerDeviceRoutes(app: FastifyInstance, db: Pool) {
  app.put("/devices/push-token", async (request, reply) => {
    const userId = await requireUser(request);
    const body = parse(registerBody, request.body);
    await db.query(
      `INSERT INTO push_tokens(user_id,expo_push_token,platform,quiet_hours_start,quiet_hours_end,timezone,categories)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(expo_push_token) DO UPDATE SET user_id=excluded.user_id,platform=excluded.platform,quiet_hours_start=excluded.quiet_hours_start,quiet_hours_end=excluded.quiet_hours_end,timezone=excluded.timezone,categories=excluded.categories,updated_at=now()`,
      [userId, body.expoPushToken, body.platform, body.quietHoursStart ?? null, body.quietHoursEnd ?? null, body.timezone ?? null, body.categories ?? PUSH_CATEGORIES]
    );
    return reply.code(204).send();
  });

  app.delete("/devices/push-token", async (request, reply) => {
    const userId = await requireUser(request);
    const { expoPushToken } = parse(unregisterBody, request.body);
    await db.query("DELETE FROM push_tokens WHERE user_id=$1 AND expo_push_token=$2", [userId, expoPushToken]);
    return reply.code(204).send();
  });
}
