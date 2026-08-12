import * as SecureStore from "expo-secure-store";

export type PushCategory = "chat" | "plan" | "journal" | "memory" | "agreement";
export const ALL_PUSH_CATEGORIES: PushCategory[] = ["chat", "plan", "journal", "memory", "agreement"];

export interface NotificationPrefs {
  categories: PushCategory[];
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
}

const KEY = "between-us.notificationPrefs.v1";
const defaults: NotificationPrefs = { categories: ALL_PUSH_CATEGORIES, quietHoursStart: null, quietHoursEnd: null };

function isPushCategory(value: unknown): value is PushCategory {
  return typeof value === "string" && (ALL_PUSH_CATEGORIES as string[]).includes(value);
}

export async function readNotificationPrefs(): Promise<NotificationPrefs> {
  const raw = await SecureStore.getItemAsync(KEY).catch(() => null);
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories.filter(isPushCategory) : defaults.categories,
      quietHoursStart: typeof parsed.quietHoursStart === "number" ? parsed.quietHoursStart : null,
      quietHoursEnd: typeof parsed.quietHoursEnd === "number" ? parsed.quietHoursEnd : null,
    };
  } catch {
    return defaults;
  }
}

export async function writeNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(prefs));
}
