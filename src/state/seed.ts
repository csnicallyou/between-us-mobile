import type { AppSnapshot } from "@/domain/models";

const now = new Date().toISOString();

export const seedSnapshot: AppSnapshot = {
  currentMemberId: "demo-self",
  members: [
    { id: "demo-self", displayName: "Антон" },
    { id: "demo-partner", displayName: "Лиза" },
  ],
  relationshipStartedAt: "2026-02-10T00:00:00+03:00",
  moods: {
    "demo-self": { memberId: "demo-self", mood: "calm", updatedAt: now },
    "demo-partner": { memberId: "demo-partner", mood: "tender", updatedAt: now },
  },
  plans: [
    {
      id: "plan-first-trip",
      title: "Следующая совместная поездка",
      description: "Определить даты и сохранить билеты в одном месте.",
      date: "2026-09-20",
      kind: "trip",
      status: "planned",
      authorId: "demo-self",
      createdAt: now,
      updatedAt: now,
      imageUri: null,
      showInCalendar: true,
    },
  ],
  journal: [
    {
      id: "journal-welcome",
      title: "Первая запись в приложении",
      content: "Здесь появятся ваши мысли, благодарности и вопросы друг другу.",
      kind: "reflection",
      mood: "calm",
      authorId: "demo-self",
      createdAt: now,
      updatedAt: now,
      replyToId: null,
    },
  ],
  memories: [],
  about: [],
  agreements: [],
  conflicts: [],
  chat: [],
  appearance: { backgroundKind: "default", backgroundValue: null, backgroundLuminance: 0.95 },
  calendar: [
    { id: "calendar-trip", title: "Совместная поездка", date: "2026-09-20", source: "plan" },
  ],
};
