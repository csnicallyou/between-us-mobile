import type { JournalKind, MemberId, Mood, PlanKind, PlanStatus } from "./models";

export const memberLabels: Record<MemberId, string> = {
  anton: "Антон",
  lisa: "Лиза",
};

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
