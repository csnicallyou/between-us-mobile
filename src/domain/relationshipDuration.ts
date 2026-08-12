export function relationshipDuration(startedAt: string): string {
  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) return "—";
  const now = new Date();
  let months = (now.getFullYear() - started.getFullYear()) * 12 + (now.getMonth() - started.getMonth());
  let days = now.getDate() - started.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) { months = 0; days = 0; }
  return `${months} мес. и ${days} дн.`;
}
