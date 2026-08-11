import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { paginationQuery, parse, requirePair, requireUser } from "../lib/http.js";
import { sendPushToUser } from "../lib/push.js";

const bodySchema = z.object({ content: z.string().trim().min(1).max(4000) }).strict();

export function registerChatRoutes(app: FastifyInstance, db: Pool) {
  app.get("/chat/messages", async (request) => {
    const pairId = await requirePair(db, await requireUser(request));
    const query = parse(paginationQuery, request.query);
    const result = await db.query(`SELECT c.id,c.author_id,c.content,c.created_at,u.display_name,pm.member_slot FROM chat_messages c JOIN users u ON u.id=c.author_id JOIN pair_members pm ON pm.user_id=c.author_id AND pm.pair_id=c.pair_id WHERE c.pair_id=$1 AND ($2::timestamptz IS NULL OR c.created_at<$2) ORDER BY c.created_at DESC,c.id DESC LIMIT $3`, [pairId, query.before ?? null, query.limit]);
    return { items: result.rows.map((row) => ({ id: row.id, authorId: row.author_id, authorDisplayName: row.display_name, memberSlot: row.member_slot, content: row.content, createdAt: row.created_at })).reverse(), nextCursor: result.rows.length === query.limit ? result.rows.at(-1)?.created_at : null };
  });
  app.post("/chat/messages", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const userId = await requireUser(request);
    const pairId = await requirePair(db, userId);
    const { content } = parse(bodySchema, request.body);
    const result = await db.query("INSERT INTO chat_messages(pair_id,author_id,content) VALUES ($1,$2,$3) RETURNING id,author_id,content,created_at", [pairId, userId, content]);
    const row = result.rows[0]!;
    const partner = await db.query<{ user_id: string }>("SELECT user_id FROM pair_members WHERE pair_id=$1 AND user_id<>$2", [pairId, userId]);
    if (partner.rows[0]) {
      void sendPushToUser(db, partner.rows[0].user_id, {
        title: "Между нами",
        body: "Новое сообщение в общем чате",
        data: { type: "chat" },
      }).catch(() => undefined);
    }
    return reply.code(201).send({ id: row.id, authorId: row.author_id, content: row.content, createdAt: row.created_at });
  });
}
