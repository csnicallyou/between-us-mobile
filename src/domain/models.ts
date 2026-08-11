export type MemberId = string;

export interface MemberProfile {
  id: MemberId;
  displayName: string;
}

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
export type MemoryKind = "anniversary" | "trip" | "first" | "gift" | "everyday" | "other";
export type AboutOwner = MemberId | "couple";
export type AboutCategory = "support" | "boundary" | "preference" | "health" | "important";
export type ConflictTopic = "availability" | "trust" | "boundaries" | "communication" | "other";

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
  imageUri?: string | null;
  showInCalendar?: boolean;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  kind: JournalKind;
  mood: Mood | null;
  authorId: MemberId;
  createdAt: string;
  updatedAt?: string;
  replyToId?: string | null;
}

export interface Memory {
  id: string;
  title: string;
  description: string;
  date: string;
  kind: MemoryKind;
  authorId: MemberId;
  createdAt: string;
  updatedAt: string;
  imageUri?: string | null;
  showInCalendar: boolean;
}

export interface AboutItem {
  id: string;
  owner: AboutOwner;
  category: AboutCategory;
  title: string;
  content: string;
  authorId: MemberId;
  createdAt: string;
  updatedAt: string;
}

export interface Agreement {
  id: string;
  title: string;
  description: string;
  acceptedBy: Record<string, boolean>;
  authorId: MemberId;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictEntry {
  id: string;
  title: string;
  summary: string;
  date: string;
  topic: ConflictTopic;
  lesson: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  author: MemberId | "ai";
  content: string;
  createdAt: string;
}

export interface AppearanceSettings {
  backgroundKind: "default" | "color" | "image";
  backgroundValue: string | null;
  backgroundLuminance: number;
}

export interface CalendarItem {
  id: string;
  title: string;
  date: string;
  source: "plan" | "memory";
}

export interface AppSnapshot {
  currentMemberId: MemberId;
  members: MemberProfile[];
  relationshipStartedAt: string;
  moods: Record<string, MemberMood>;
  plans: Plan[];
  journal: JournalEntry[];
  memories: Memory[];
  about: AboutItem[];
  agreements: Agreement[];
  conflicts: ConflictEntry[];
  chat: ChatMessage[];
  appearance: AppearanceSettings;
  calendar: CalendarItem[];
}
