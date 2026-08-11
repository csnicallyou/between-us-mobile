import type { AppSnapshot } from "@/domain/models";

const now = new Date().toISOString();

export const seedSnapshot: AppSnapshot = {
  currentMemberId: "anton",
  relationshipStartedAt: "2026-02-10T00:00:00+03:00",
  moods: {
    anton: { memberId: "anton", mood: "calm", updatedAt: now },
    lisa: { memberId: "lisa", mood: "tender", updatedAt: now },
  },
  plans: [
    {
      id: "plan-first-trip",
      title: "Следующая совместная поездка",
      description: "Определить даты и сохранить билеты в одном месте.",
      date: "2026-09-20",
      kind: "trip",
      status: "planned",
      authorId: "anton",
      createdAt: now,
      updatedAt: now,
    },
  ],
  journal: [
    {
      id: "journal-welcome",
      title: "Первая запись в приложении",
      content: "Здесь появятся ваши мысли, благодарности и вопросы друг другу.",
      kind: "reflection",
      mood: "calm",
      authorId: "anton",
      createdAt: now,
    },
  ],
  calendar: [
    { id: "calendar-trip", title: "Совместная поездка", date: "2026-09-20", source: "plan" },
  ],
};
