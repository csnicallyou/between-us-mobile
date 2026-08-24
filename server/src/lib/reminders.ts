import type { Pool } from "pg";
import { sendPushToUser } from "./push.js";

const AGREEMENT_REMINDER_AFTER_HOURS = 48;
const AGREEMENT_REMINDER_COOLDOWN_HOURS = 72;

export function yearsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "лет";
  if (mod10 === 1) return "год";
  if (mod10 >= 2 && mod10 <= 4) return "года";
  return "лет";
}

async function remindUnconfirmedAgreements(db: Pool) {
  const result = await db.query<{ id: string; payload: { title?: string; acceptedBy?: Record<string, boolean> } }>(
    `SELECT id, payload FROM entries WHERE kind='agreement' AND updated_at < now() - interval '${AGREEMENT_REMINDER_AFTER_HOURS} hours'`
  );
  for (const row of result.rows) {
    const acceptedBy = row.payload.acceptedBy ?? {};
    const pending = Object.entries(acceptedBy).filter(([, accepted]) => !accepted).map(([userId]) => userId);
    if (!pending.length) continue;
    const already = await db.query<{ last_sent_at: Date }>("SELECT last_sent_at FROM agreement_reminders WHERE entry_id=$1", [row.id]);
    const lastSent = already.rows[0]?.last_sent_at;
    if (lastSent && Date.now() - lastSent.getTime() < AGREEMENT_REMINDER_COOLDOWN_HOURS * 3_600_000) continue;
    for (const userId of pending) {
      await sendPushToUser(db, userId, {
        title: "Между нами",
        body: "Одна из договорённостей всё ещё ждёт вашего подтверждения",
        category: "agreement",
        data: { type: "agreement", entryId: row.id },
      });
    }
    await db.query(
      "INSERT INTO agreement_reminders(entry_id,last_sent_at) VALUES ($1,now()) ON CONFLICT(entry_id) DO UPDATE SET last_sent_at=now()",
      [row.id]
    );
  }
}

async function remindMemoryAnniversaries(db: Pool) {
  const result = await db.query<{ id: string; pair_id: string; payload: { title?: string; date?: string } }>(
    "SELECT id, pair_id, payload FROM entries WHERE kind='memory'"
  );
  const today = new Date();
  const todayMonth = today.getUTCMonth() + 1;
  const todayDate = today.getUTCDate();
  const currentYear = today.getUTCFullYear();
  for (const row of result.rows) {
    const dateStr = row.payload.date;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
    const [yearStr, monthStr, dayStr] = dateStr.split("-");
    const eventYear = Number(yearStr);
    if (Number(monthStr) !== todayMonth || Number(dayStr) !== todayDate) continue;
    const yearsSince = currentYear - eventYear;
    if (yearsSince <= 0) continue;
    const already = await db.query("SELECT 1 FROM memory_anniversary_reminders WHERE entry_id=$1 AND year_sent=$2", [row.id, currentYear]);
    if (already.rowCount) continue;
    const members = await db.query<{ user_id: string }>("SELECT user_id FROM pair_members WHERE pair_id=$1", [row.pair_id]);
    for (const member of members.rows) {
      await sendPushToUser(db, member.user_id, {
        title: "Между нами",
        body: "Сегодня годовщина одного из ваших общих событий",
        category: "memory",
        data: { type: "anniversary", entryId: row.id },
      });
    }
    await db.query("INSERT INTO memory_anniversary_reminders(entry_id,year_sent) VALUES ($1,$2) ON CONFLICT DO NOTHING", [row.id, currentYear]);
  }
}

async function runReminderSweep(db: Pool, app: { log: { error: (obj: unknown, msg: string) => void } }) {
  await remindUnconfirmedAgreements(db).catch((error) => app.log.error({ err: error }, "agreement reminder sweep failed"));
  await remindMemoryAnniversaries(db).catch((error) => app.log.error({ err: error }, "anniversary reminder sweep failed"));
}

export function startReminderScheduler(db: Pool, app: { log: { error: (obj: unknown, msg: string) => void } }, intervalMs = 6 * 3_600_000) {
  void runReminderSweep(db, app);
  const timer = setInterval(() => void runReminderSweep(db, app), intervalMs);
  return () => clearInterval(timer);
}
