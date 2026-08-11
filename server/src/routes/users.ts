import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { HttpError, parse, requireUser } from "../lib/http.js";

const updateBody = z.object({ displayName: z.string().trim().min(1).max(80) }).strict();

export function registerUserRoutes(app: FastifyInstance, db: Pool) {
  app.get("/users/me", async (request) => {
    const userId = await requireUser(request);
    const result = await db.query<{ id: string; email: string; display_name: string; created_at: Date; pair_id: string | null }>(
      "SELECT u.id,u.email,u.display_name,u.created_at,pm.pair_id FROM users u LEFT JOIN pair_members pm ON pm.user_id=u.id WHERE u.id=$1", [userId]
    );
    const user = result.rows[0];
    if (!user) throw new HttpError(404, "NOT_FOUND", "Resource not found");
    return { id: user.id, email: user.email, displayName: user.display_name, createdAt: user.created_at, pairId: user.pair_id };
  });

  app.patch("/users/me", async (request) => {
    const userId = await requireUser(request);
    const body = parse(updateBody, request.body);
    const result = await db.query<{ id: string; email: string; display_name: string }>(
      "UPDATE users SET display_name=$2,updated_at=now() WHERE id=$1 RETURNING id,email,display_name", [userId, body.displayName]
    );
    const user = result.rows[0]!;
    return { id: user.id, email: user.email, displayName: user.display_name };
  });
}
