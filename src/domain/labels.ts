import type { AppSnapshot, JournalKind, MemberId, Mood, PlanKind, PlanStatus } from "./models";

export function memberName(snapshot: Pick<AppSnapshot, "members">, memberId: MemberId) {
  return snapshot.members.find((member) => member.id === memberId)?.displayName ?? "Участник";
}

export const moodLabels: Record<Mood, string> = {
  calm: "Спокойно",
  happy: "Радостно",
  tender: "Нежно",
  anxious: "Тревожно",
  sad: "Грустно",
  angry: "Злюсь",
  tired: "Усталость",
  neutral: "Нейтрально",
};

export const planKindLabels: Record<PlanKind, string> = {
  trip: "Поездка",
  date: "Свидание",
  goal: "Общая цель",
  purchase: "Покупка",
  wish: "Желание",
  other: "Другое",
};

export const planStatusLabels: Record<PlanStatus, string> = {
  idea: "Хотим",
  planned: "Запланировано",
  done: "Сделано",
};

export const journalKindLabels: Record<JournalKind, string> = {
  gratitude: "Благодарность",
  feeling: "Чувство",
  question: "Вопрос",
  reflection: "Мысль",
};
