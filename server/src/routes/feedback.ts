import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { parse, requirePair, requireUser } from "../lib/http.js";
import { encryptFeedback } from "../lib/security.js";

const bodySchema = z.object({ content: z.string().trim().min(1).max(10_000) }).strict();

export function registerFeedbackRoutes(app: FastifyInstance, db: Pool, config: AppConfig) {
  app.post("/feedback", { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, async (request, reply) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const { content } = parse(bodySchema, request.body);
    const encrypted = encryptFeedback(content, config.FEEDBACK_ENCRYPTION_KEY);
    const result = await db.query<{ id: string; created_at: Date }>("INSERT INTO private_feedback(pair_id,author_id,nonce,auth_tag,ciphertext) VALUES ($1,$2,$3,$4,$5) RETURNING id,created_at", [pairId, userId, encrypted.nonce, encrypted.authTag, encrypted.ciphertext]);
    return reply.code(202).send({ id: result.rows[0]!.id, acceptedAt: result.rows[0]!.created_at });
  });
}
