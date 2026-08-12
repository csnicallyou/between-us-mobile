import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import type { Pool } from "pg";

const expo = new Expo();

export interface RecipientToken {
  expoPushToken: string;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  timezone: string | null;
}

function currentHourInTimeZone(timeZone: string): number {
  const formatted = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(new Date());
  return Number(formatted) % 24;
}

// Split out so the wraparound math (the part actually worth getting wrong, e.g. a
// 23:00-07:00 quiet window) is testable without mocking Date/Intl.
export function isHourInQuietWindow(hour: number, start: number, end: number): boolean {
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function isQuietNow(token: RecipientToken): boolean {
  if (token.quietHoursStart === null || token.quietHoursEnd === null) return false;
  let hour: number;
  try {
    hour = currentHourInTimeZone(token.timezone ?? "UTC");
  } catch {
    hour = new Date().getUTCHours();
  }
  return isHourInQuietWindow(hour, token.quietHoursStart, token.quietHoursEnd);
}

export interface PushNotificationInput {
  title: string;
  body: string;
  category: string;
  data?: Record<string, unknown>;
}

// Best-effort: never throw into the caller's request path. A push failure must not
// break the underlying action (sending a chat message, creating an entry, etc).
export async function sendPushToUser(db: Pool, userId: string, notification: PushNotificationInput): Promise<void> {
  const result = await db.query<{ expo_push_token: string; quiet_hours_start: number | null; quiet_hours_end: number | null; timezone: string | null; categories: string[] }>(
    "SELECT expo_push_token,quiet_hours_start,quiet_hours_end,timezone,categories FROM push_tokens WHERE user_id=$1",
    [userId]
  );
  const messages: ExpoPushMessage[] = [];
  for (const row of result.rows) {
    // "system" is a reserved category for account/security notices (e.g. a data-export
    // consent request) that must reach the user regardless of their content-category
    // mute preferences — those preferences only govern day-to-day content notifications.
    if (notification.category !== "system" && !row.categories.includes(notification.category)) continue;
    if (!Expo.isExpoPushToken(row.expo_push_token)) continue;
    if (isQuietNow({ expoPushToken: row.expo_push_token, quietHoursStart: row.quiet_hours_start, quietHoursEnd: row.quiet_hours_end, timezone: row.timezone })) continue;
    messages.push({ to: row.expo_push_token, title: notification.title, body: notification.body, data: notification.data, sound: "default" });
  }
  if (!messages.length) return;
  for (const chunk of expo.chunkPushNotifications(messages)) {
    await expo.sendPushNotificationsAsync(chunk).catch(() => undefined);
  }
}
