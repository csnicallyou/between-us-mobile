import type { FastifyInstance } from "fastify";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { HttpError, idParams, parse, requireUser } from "../lib/http.js";
import { hashOpaqueToken, newInviteCode, newInviteToken, normalizeInviteCode } from "../lib/security.js";

const createBody = z.object({ name: z.string().trim().min(1).max(80), relationshipStartedOn: z.string().date().nullable().optional() }).strict();
const joinBody = z.object({ secret: z.string().trim().min(12).max(100) }).strict();

async function createInvite(client: PoolClient, pairId: string, userId: string) {
  const token = newInviteToken();
  const code = newInviteCode();
  const result = await client.query<{ id: string; expires_at: Date }>(
    "INSERT INTO pair_invites(pair_id,created_by,token_hash,code_hash,expires_at) VALUES ($1,$2,$3,$4,now()+interval '24 hours') RETURNING id,expires_at",
    [pairId, userId, hashOpaqueToken(token), hashOpaqueToken(code)]
  );
  return { id: result.rows[0]!.id, token, code, expiresAt: result.rows[0]!.expires_at, link: `betweenus://?secret=${encodeURIComponent(token)}` };
}

async function loadPair(db: Pool | PoolClient, userId: string) {
  const result = await db.query<{
    id: string; name: string; relationship_started_on: string | null; created_at: Date;
    members: Array<{ id: string; displayName: string; memberSlot: string; joinedAt: string }>;
  }>(`SELECT p.id,p.name,p.relationship_started_on,p.created_at,
      COALESCE(json_agg(json_build_object('id',u.id,'displayName',u.display_name,'memberSlot',pm.member_slot,'joinedAt',pm.joined_at) ORDER BY pm.joined_at) FILTER (WHERE u.id IS NOT NULL),'[]') AS members
    FROM pair_members mine JOIN pairs p ON p.id=mine.pair_id
    JOIN pair_members pm ON pm.pair_id=p.id JOIN users u ON u.id=pm.user_id
    WHERE mine.user_id=$1 GROUP BY p.id`, [userId]);
  const pair = result.rows[0];
  return pair ? { id: pair.id, name: pair.name, relationshipStartedOn: pair.relationship_started_on, createdAt: pair.created_at, members: pair.members } : null;
}

export function registerPairRoutes(app: FastifyInstance, db: Pool) {
  app.get("/pairs/me", async (request) => ({ pair: await loadPair(db, await requireUser(request)) }));

  app.post("/pairs", async (request, reply) => {
    const userId = await requireUser(request);
    const body = parse(createBody, request.body);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const membership = await client.query("SELECT 1 FROM pair_members WHERE user_id=$1 FOR UPDATE", [userId]);
      if (membership.rowCount) throw new HttpError(409, "ALREADY_PAIRED", "User already has an active pair");
      const created = await client.query<{ id: string }>("INSERT INTO pairs(name,relationship_started_on,created_by) VALUES ($1,$2,$3) RETURNING id", [body.name, body.relationshipStartedOn ?? null, userId]);
      const pairId = created.rows[0]!.id;
      await client.query("INSERT INTO pair_members(user_id,pair_id,member_slot) VALUES ($1,$2,'owner')", [userId, pairId]);
      const invite = await createInvite(client, pairId, userId);
      const pair = await loadPair(client, userId);
      await client.query("COMMIT");
      return reply.code(201).send({ pair, invite });
    } catch (error) {
      await client.query("ROLLBACK");
      if ((error as { code?: string }).code === "23505") throw new HttpError(409, "ALREADY_PAIRED", "User already has an active pair");
      throw error;
    } finally { client.release(); }
  });

  app.post("/pairs/invites", async (request, reply) => {
    const userId = await requireUser(request);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const member = await client.query<{ pair_id: string }>("SELECT pair_id FROM pair_members WHERE user_id=$1", [userId]);
      if (!member.rows[0]) throw new HttpError(409, "PAIR_REQUIRED", "Active pair required");
      await client.query("SELECT id FROM pairs WHERE id=$1 FOR UPDATE", [member.rows[0].pair_id]);
      const count = await client.query<{ count: string }>("SELECT count(*) FROM pair_members WHERE pair_id=$1", [member.rows[0].pair_id]);
      if (Number(count.rows[0]!.count) >= 2) throw new HttpError(409, "PAIR_FULL", "Pair already has two members");
      const invite = await createInvite(client, member.rows[0].pair_id, userId);
      await client.query("COMMIT");
      return reply.code(201).send({ invite });
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  });

  app.delete("/pairs/invites/:id", async (request, reply) => {
    const userId = await requireUser(request);
    const { id } = parse(idParams, request.params);
    const result = await db.query("UPDATE pair_invites i SET revoked_at=now() FROM pair_members pm WHERE i.id=$1 AND pm.user_id=$2 AND pm.pair_id=i.pair_id AND i.redeemed_at IS NULL AND i.revoked_at IS NULL", [id, userId]);
    if (!result.rowCount) throw new HttpError(404, "NOT_FOUND", "Resource not found");
    return reply.code(204).send();
  });

  app.post("/pairs/join", async (request) => {
    const userId = await requireUser(request);
    const { secret } = parse(joinBody, request.body);
    const normalized = normalizeInviteCode(secret);
    const isCode = /^[A-Z2-9]{12}$/.test(normalized);
    const secretHash = hashOpaqueToken(isCode ? normalized : secret);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query("SELECT 1 FROM pair_members WHERE user_id=$1 FOR UPDATE", [userId]);
      if (existing.rowCount) throw new HttpError(409, "ALREADY_PAIRED", "User already has an active pair");
      const invite = await client.query<{ id: string; pair_id: string }>(
        `SELECT id,pair_id FROM pair_invites WHERE ${isCode ? "code_hash" : "token_hash"}=$1 AND revoked_at IS NULL AND redeemed_at IS NULL AND expires_at>now() FOR UPDATE`, [secretHash]
      );
      if (!invite.rows[0]) throw new HttpError(404, "INVITE_INVALID", "Invite is invalid or expired");
      await client.query("SELECT id FROM pairs WHERE id=$1 FOR UPDATE", [invite.rows[0].pair_id]);
      const count = await client.query<{ count: string }>("SELECT count(*) FROM pair_members WHERE pair_id=$1", [invite.rows[0].pair_id]);
      if (Number(count.rows[0]!.count) >= 2) throw new HttpError(409, "PAIR_FULL", "Pair already has two members");
      await client.query("INSERT INTO pair_members(user_id,pair_id,member_slot) VALUES ($1,$2,'partner')", [userId, invite.rows[0].pair_id]);
      await client.query("UPDATE pair_invites SET redeemed_by=$2,redeemed_at=now() WHERE id=$1", [invite.rows[0].id, userId]);
      await client.query("UPDATE pair_invites SET revoked_at=now() WHERE pair_id=$1 AND id<>$2 AND redeemed_at IS NULL AND revoked_at IS NULL", [invite.rows[0].pair_id, invite.rows[0].id]);
      const pair = await loadPair(client, userId);
      await client.query("COMMIT");
      return { pair };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  });
}
