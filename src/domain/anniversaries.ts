export interface Anniversary {
  /** ISO-дата без времени, как у планов и событий. */
  date: string;
  label: string;
}

function toIsoDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function yearsLabel(months: number) {
  if (months === 6) return "полгода вместе";
  const years = months / 12;
  if (Number.isInteger(years)) {
    const whole = years % 100;
    const last = years % 10;
    if (whole >= 11 && whole <= 14) return `${years} лет вместе`;
    if (last === 1) return `${years} год вместе`;
    if (last >= 2 && last <= 4) return `${years} года вместе`;
    return `${years} лет вместе`;
  }
  return `${String(years).replace(".", ",")} года вместе`;
}

/**
 * Годовщины отношений — вычисляемые даты, а не записи.
 *
 * Модель `Memory` их не хранит и хранить не должна: это функция от одной
 * даты начала, и держать её копиями в базе значит рассинхронизировать при
 * первой же правке даты. Поэтому они считаются на лету и в календаре
 * показываются отдельным, невредактируемым видом.
 *
 * Шаг — полгода: чаще получается шум, реже теряется первый год, который
 * для пары как раз самый насыщенный.
 */
export function anniversariesInRange(startedAt: string | null | undefined, from: Date, to: Date): Anniversary[] {
  if (!startedAt) return [];
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) return [];

  const result: Anniversary[] = [];
  for (let months = 6; months <= 12 * 60; months += 6) {
    const date = new Date(start.getTime());
    date.setMonth(date.getMonth() + months);
    // 31-е в коротком месяце JS переносит на следующий — возвращаем на последний день
    if (date.getDate() !== start.getDate()) date.setDate(0);
    if (date > to) break;
    if (date >= from) result.push({ date: toIsoDate(date), label: yearsLabel(months) });
  }
  return result;
}

/** Ближайшая годовщина от указанного дня, если она наступает в пределах года. */
export function nextAnniversary(startedAt: string | null | undefined, from: Date): Anniversary | null {
  const horizon = new Date(from.getTime());
  horizon.setFullYear(horizon.getFullYear() + 1);
  return anniversariesInRange(startedAt, from, horizon)[0] ?? null;
}
