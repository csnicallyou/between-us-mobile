import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { memberName, moodLabels, planKindLabels, planStatusLabels } from "@/domain/labels";
import type { Mood } from "@/domain/models";
import { privateImageSource } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { V2Glass, V2Screen } from "@/ui-v2";

const ink = { strong: "#211E29", muted: "rgba(33,30,41,.62)", faint: "rgba(33,30,41,.38)", hairline: "rgba(33,30,41,.10)" };
const fill = { quiet: "rgba(255,255,255,.14)", selected: "rgba(255,255,255,.26)", control: "rgba(255,255,255,.30)" };
const anchor = { high: "#3C3748", label: "#FFFFFF" };

const moods: Mood[] = ["calm", "happy", "tender", "anxious", "tired", "sad", "angry", "neutral"];
const weekdays = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function plural(value: number, forms: [string, string, string]) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function durationLabel(startedAt: string) {
  const started = parseDate(startedAt);
  if (!started) return "Дата не указана";
  const now = new Date();
  let months = (now.getFullYear() - started.getFullYear()) * 12 + now.getMonth() - started.getMonth();
  let days = now.getDate() - started.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  months = Math.max(0, months);
  days = Math.max(0, days);
  return `${months} ${plural(months, ["месяц", "месяца", "месяцев"])} и ${days} ${plural(days, ["день", "дня", "дней"])}`;
}

function daysTogether(startedAt: string) {
  const started = parseDate(startedAt);
  if (!started) return 0;
  return Math.max(0, Math.floor((Date.now() - started.getTime()) / 86_400_000));
}

function daysUntil(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return null;
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return "сегодня";
  return `через ${days} ${plural(days, ["день", "дня", "дней"])}`;
}

function dateLabel(value: string | null | undefined) {
  const parsed = parseDate(value);
  return parsed ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(parsed) : "Дата не выбрана";
}

function relationshipStartLabel(value: string) {
  const parsed = parseDate(value);
  return parsed ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(parsed) : "дата не указана";
}

function updatedLabel(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return "ещё не обновлялось";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 60) return minutes < 2 ? "только что" : `${minutes} мин. назад`;
  if (minutes < 24 * 60) return `сегодня в ${new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date)}`;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
}

export default function HomeScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { snapshot, setCurrentMood } = useAppData();
  const now = new Date();
  const nextPlan = [...snapshot.plans]
    .filter((plan) => plan.status !== "done")
    .sort((a, b) => (a.date ?? "9999-12-31").localeCompare(b.date ?? "9999-12-31"))[0] ?? snapshot.plans[0];
  const partnerEntry = [...snapshot.journal]
    .filter((entry) => entry.authorId !== snapshot.currentMemberId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const marked = snapshot.plans.some((plan) => plan.date === iso && plan.showInCalendar !== false)
      || snapshot.memories.some((memory) => memory.date === iso && memory.showInCalendar);
    return { date, marked };
  });
  const currentMood = snapshot.moods[snapshot.currentMemberId]?.mood ?? null;
  const cycleMood = () => {
    const currentIndex = currentMood ? moods.indexOf(currentMood) : -1;
    setCurrentMood(moods[(currentIndex + 1) % moods.length] ?? "calm");
  };

  return (
    <V2Screen>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(now)}</Text>
            <Text style={styles.title}>Между нами</Text>
          </View>
          <View style={styles.tools}>
            <Tool icon="search-outline" label="Поиск" onPress={() => router.push("/search" as Href)} />
            <Tool icon="settings-outline" label="Настройки" onPress={() => router.push("/settings" as Href)} />
          </View>
        </View>

        <View style={styles.bento}>
          <V2Glass radius={30} style={styles.hero}>
            <Text style={styles.eyebrow}>Вместе</Text>
            <Text style={styles.duration}>{durationLabel(snapshot.relationshipStartedAt)}</Text>
            <Text style={styles.since}>с {relationshipStartLabel(snapshot.relationshipStartedAt)}</Text>
            <View style={styles.stats}>
              <Stat value={daysTogether(snapshot.relationshipStartedAt)} label="дней вместе" />
              <Stat value={snapshot.memories.length} label="моментов" divided />
              <Stat value={snapshot.agreements.length} label="договорённостей" divided />
            </View>
          </V2Glass>

          <V2Glass radius={24} style={styles.weekPanel}>
            {week.map(({ date, marked }) => {
              const active = date.toDateString() === now.toDateString();
              return (
                <View key={date.toISOString()} style={[styles.day, active && styles.dayActive]}>
                  <Text style={[styles.dayName, active && styles.dayNameActive]}>{weekdays[date.getDay()]}</Text>
                  <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>{date.getDate()}</Text>
                  <View style={[styles.dayDot, !marked && styles.dayDotHidden]} />
                </View>
              );
            })}
          </V2Glass>

          <View style={styles.moodPair}>
            {snapshot.members.slice(0, 2).map((member, index) => {
              const mood = snapshot.moods[member.id];
              const mine = member.id === snapshot.currentMemberId;
              return (
                <Pressable key={member.id} disabled={!mine} onPress={cycleMood} style={styles.moodPressable}>
                  <V2Glass radius={24} style={styles.moodTile}>
                    <View style={styles.moodRow}>
                      <View style={[styles.moodDot, { backgroundColor: index === 0 ? "#8FAE9B" : "#C79C8E" }]} />
                      <Text style={styles.moodName}>{memberName(snapshot, member.id)}</Text>
                      {mine ? <Text style={styles.edit}>изменить</Text> : null}
                    </View>
                    <Text style={styles.moodState}>{mood?.mood ? moodLabels[mood.mood] : "Не выбрано"}</Text>
                    <Text style={styles.moodMeta}>{updatedLabel(mood?.updatedAt)}</Text>
                  </V2Glass>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => router.push("/(tabs)/entries?filter=plans" as Href)}>
            <V2Glass radius={28} style={styles.plan}>
              <View style={styles.planPhoto}>
                {nextPlan?.imageUri ? <Image resizeMode="cover" source={privateImageSource(nextPlan.imageUri, accessToken)} style={StyleSheet.absoluteFill} /> : <View style={styles.photoFallback}><Ionicons color={ink.faint} name="map-outline" size={30} /></View>}
                <View style={styles.planBadge}><Text style={styles.planBadgeText}>{dateLabel(nextPlan?.date)}</Text></View>
              </View>
              <View style={styles.planBody}>
                <Text style={styles.blockTitle}>{nextPlan?.title ?? "Добавьте первый план"}</Text>
                <Text style={styles.blockText}>{nextPlan?.description || "Совместные планы появятся здесь."}</Text>
                {nextPlan ? <View style={styles.chips}><Chip label={planKindLabels[nextPlan.kind]} active /><Chip label={planStatusLabels[nextPlan.status]} />{daysUntil(nextPlan.date) ? <Text style={styles.daysChip}>{daysUntil(nextPlan.date)}</Text> : null}</View> : null}
              </View>
            </V2Glass>
          </Pressable>

          <V2Glass radius={26} style={styles.note}>
            <View style={styles.noteHead}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{partnerEntry ? memberName(snapshot, partnerEntry.authorId)[0] : "—"}</Text></View>
              <Text style={styles.noteKicker}>{partnerEntry ? `${memberName(snapshot, partnerEntry.authorId)} написал(а) · ${updatedLabel(partnerEntry.createdAt)}` : "Последняя запись партнёра"}</Text>
            </View>
            <Text style={styles.noteTitle}>{partnerEntry?.title ?? "Пока нет сообщений"}</Text>
            <Text style={styles.noteText}>{partnerEntry?.content ?? "Напишите друг другу первую запись."}</Text>
            <Pressable onPress={() => router.push("/(tabs)/entries?filter=journal" as Href)} style={styles.reply}>
              <Ionicons color={anchor.label} name="arrow-undo-outline" size={15} />
              <Text style={styles.replyText}>Ответить</Text>
            </Pressable>
          </V2Glass>
        </View>
      </View>
    </V2Screen>
  );
}

function Tool({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={styles.tool}><Ionicons color={ink.strong} name={icon} size={19} /></Pressable>;
}

function Stat({ value, label, divided = false }: { value: number; label: string; divided?: boolean }) {
  return <View style={[styles.stat, divided && styles.statDivided]}><Text style={styles.statValue}>{value}</Text><Text numberOfLines={1} style={styles.statLabel}>{label}</Text></View>;
}

function Chip({ label, active = false }: { label: string; active?: boolean }) {
  return <View style={[styles.chip, active && styles.chipActive]}>{active ? <View style={styles.chipDot} /> : null}<Text style={styles.chipText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  sheet: {},
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  headerCopy: { flex: 1 },
  kicker: { color: ink.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: ink.strong, fontFamily: "GolosText", fontSize: 29, fontWeight: "600", letterSpacing: -0.93, lineHeight: 35, marginTop: 7 },
  tools: { flexDirection: "row", gap: 8, paddingTop: 5 },
  tool: { alignItems: "center", backgroundColor: "rgba(255,255,255,.12)", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  bento: { gap: 11, marginTop: 18 },
  hero: { paddingBottom: 16, paddingHorizontal: 20, paddingTop: 19 },
  eyebrow: { color: ink.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.4, textTransform: "uppercase" },
  duration: { color: ink.strong, fontFamily: "GolosText", fontSize: 31, fontWeight: "600", letterSpacing: -0.9, lineHeight: 38, marginTop: 9 },
  since: { color: ink.muted, fontFamily: "GolosText", fontSize: 13, marginTop: 6 },
  stats: { borderTopColor: ink.hairline, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", marginTop: 16, paddingTop: 14 },
  stat: { flex: 1 },
  statDivided: { borderLeftColor: ink.hairline, borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 13 },
  statValue: { color: ink.strong, fontFamily: "GolosText", fontSize: 19, fontWeight: "600", letterSpacing: -0.5 },
  statLabel: { color: ink.faint, fontFamily: "GolosText", fontSize: 10.5, marginTop: 2 },
  weekPanel: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 12 },
  day: { alignItems: "center", borderRadius: 16, gap: 3, height: 52, justifyContent: "center", width: 40 },
  dayActive: { backgroundColor: fill.selected, borderColor: "rgba(255,255,255,0.45)", borderWidth: StyleSheet.hairlineWidth },
  dayName: { color: ink.faint, fontFamily: "GolosText", fontSize: 9.5, letterSpacing: 0.5, textTransform: "uppercase" },
  dayNameActive: { color: ink.muted },
  dayNumber: { color: ink.muted, fontFamily: "GolosText", fontSize: 15, letterSpacing: -0.3 },
  dayNumberActive: { color: ink.strong },
  dayDot: { backgroundColor: ink.faint, borderRadius: 2, height: 4, opacity: 0.55, width: 4 },
  dayDotHidden: { opacity: 0 },
  moodPair: { flexDirection: "row", gap: 11 },
  moodPressable: { flex: 1 },
  moodTile: { minHeight: 108, paddingBottom: 14, paddingHorizontal: 16, paddingTop: 15 },
  moodRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  moodDot: { borderColor: "rgba(255,255,255,0.65)", borderRadius: 7, borderWidth: 4, height: 9, width: 9 },
  moodName: { color: ink.strong, fontFamily: "GolosText", fontSize: 12.5, fontWeight: "600", letterSpacing: -0.15 },
  edit: { backgroundColor: fill.quiet, borderRadius: 11, color: ink.muted, fontFamily: "GolosText", fontSize: 10, marginLeft: "auto", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 },
  moodState: { color: ink.strong, fontFamily: "GolosText", fontSize: 17, fontWeight: "600", letterSpacing: -0.45, marginTop: 11 },
  moodMeta: { color: ink.faint, fontFamily: "GolosText", fontSize: 10.5, marginTop: 4 },
  plan: { padding: 9, paddingBottom: 17 },
  planPhoto: { backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 20, height: 116, overflow: "hidden", position: "relative" },
  photoFallback: { alignItems: "center", backgroundColor: "rgba(143,174,155,0.14)", flex: 1, justifyContent: "center" },
  planBadge: { backgroundColor: "rgba(38,32,48,0.42)", borderRadius: 13, left: 11, minHeight: 26, paddingHorizontal: 12, position: "absolute", top: 11, justifyContent: "center" },
  planBadgeText: { color: "rgba(255,255,255,0.98)", fontFamily: "GolosText", fontSize: 11 },
  planBody: { paddingHorizontal: 11, paddingTop: 14 },
  blockTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 20, fontWeight: "600", letterSpacing: -0.52, lineHeight: 24 },
  blockText: { color: ink.muted, fontFamily: "GolosText", fontSize: 13, lineHeight: 19, marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 13 },
  chip: { alignItems: "center", backgroundColor: fill.quiet, borderRadius: 13, flexDirection: "row", gap: 6, minHeight: 26, paddingHorizontal: 11 },
  chipActive: { backgroundColor: fill.control },
  chipDot: { backgroundColor: ink.muted, borderRadius: 3, height: 6, width: 6 },
  chipText: { color: ink.muted, fontFamily: "GolosText", fontSize: 11.5 },
  daysChip: { color: ink.faint, fontFamily: "GolosText", fontSize: 11.5, marginLeft: "auto", paddingVertical: 6 },
  note: { marginBottom: 10, paddingHorizontal: 18, paddingVertical: 17 },
  noteHead: { alignItems: "center", flexDirection: "row", gap: 8 },
  avatar: { alignItems: "center", backgroundColor: fill.control, borderColor: "rgba(255,255,255,0.5)", borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, height: 26, justifyContent: "center", width: 26 },
  avatarText: { color: ink.strong, fontFamily: "GolosText", fontSize: 11 },
  noteKicker: { color: ink.faint, flex: 1, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.1, textTransform: "uppercase" },
  noteTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 18, fontWeight: "600", letterSpacing: -0.43, marginTop: 11 },
  noteText: { color: ink.muted, fontFamily: "GolosText", fontSize: 13, lineHeight: 19, marginTop: 6 },
  reply: { alignItems: "center", alignSelf: "flex-start", backgroundColor: anchor.high, borderRadius: 19, flexDirection: "row", gap: 7, height: 38, justifyContent: "center", marginTop: 14, paddingHorizontal: 17 },
  replyText: { color: anchor.label, fontFamily: "GolosText", fontSize: 13 },
});
