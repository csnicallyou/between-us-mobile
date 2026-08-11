export type MemberId = "anton" | "lisa";

export type Mood =
  | "calm"
  | "happy"
  | "tender"
  | "anxious"
  | "sad"
  | "angry"
  | "tired"
  | "neutral";

export type PlanStatus = "idea" | "planned" | "done";
export type PlanKind = "trip" | "date" | "goal" | "purchase" | "wish" | "other";
export type JournalKind = "gratitude" | "feeling" | "question" | "reflection";

export interface MemberMood {
  memberId: MemberId;
  mood: Mood | null;
  updatedAt: string | null;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  date: string | null;
  kind: PlanKind;
  status: PlanStatus;
  authorId: MemberId;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  kind: JournalKind;
  mood: Mood | null;
  authorId: MemberId;
  createdAt: string;
}

export interface CalendarItem {
  id: string;
  title: string;
  date: string;
  source: "plan" | "memory";
}

export interface AppSnapshot {
  currentMemberId: MemberId;
  relationshipStartedAt: string;
  moods: Record<MemberId, MemberMood>;
  plans: Plan[];
  journal: JournalEntry[];
  calendar: CalendarItem[];
}
