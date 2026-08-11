import type { FastifyRequest } from "fastify";
import { z } from "zod";
import type { Pool, PoolClient } from "pg";

export class HttpError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message = "Request failed") {
    super(message);
  }
}

export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, "INVALID_REQUEST", "Invalid request");
  return result.data;
}

export async function requireUser(request: FastifyRequest) {
  try {
    const payload = await request.jwtVerify<{ sub: string; type: string }>();
    if (payload.type !== "access" || !z.string().uuid().safeParse(payload.sub).success) throw new Error();
    return payload.sub;
  } catch {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
  }
}

export async function requirePair(db: Pool | PoolClient, userId: string) {
  const result = await db.query<{ pair_id: string }>("SELECT pair_id FROM pair_members WHERE user_id = $1", [userId]);
  if (!result.rows[0]) throw new HttpError(409, "PAIR_REQUIRED", "Active pair required");
  return result.rows[0].pair_id;
}

export const idParams = z.object({ id: z.string().uuid() });
export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime({ offset: true }).optional()
});
