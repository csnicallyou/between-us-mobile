/** Runtime guards for data that may come from older snapshots or remote JSON. */
export function normalizeAcceptedBy(
  value: unknown,
  memberIds: readonly string[] = [],
  mapMemberId: (id: string) => string = (id) => id,
): Record<string, boolean> {
  const result: Record<string, boolean> = Object.fromEntries(memberIds.map((id) => [id, false]));

  if (!value || typeof value !== "object" || Array.isArray(value)) return result;

  for (const [rawId, accepted] of Object.entries(value)) {
    result[mapMemberId(rawId)] = accepted === true;
  }
  return result;
}

export function safeDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Date-only values are interpreted at noon to avoid timezone/DST shifting the day.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const parsed = new Date(year, month - 1, day, 12);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
    return parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function formatDateSafe(
  value: unknown,
  options: Intl.DateTimeFormatOptions,
  fallback = "Дата не указана",
): string {
  const parsed = safeDate(value);
  if (!parsed) return fallback;
  try {
    return new Intl.DateTimeFormat("ru-RU", options).format(parsed);
  } catch {
    return fallback;
  }
}

export function dateTimestamp(value: unknown): number {
  return safeDate(value)?.getTime() ?? Number.NEGATIVE_INFINITY;
}
