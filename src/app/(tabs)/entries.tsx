import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { journalKindLabels, memberName, moodLabels, planKindLabels, planStatusLabels } from "@/domain/labels";
import type { JournalEntry, JournalKind, Mood, Plan, PlanKind, PlanStatus } from "@/domain/models";
import { privateImageSource } from "@/services/backendClient";
import { selectAndStoreImage } from "@/services/imageService";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { V2Glass, V2Screen } from "@/ui-v2";

type Filter = "all" | "plans" | "journal";
const filters: { key: Filter; label: string }[] = [{ key: "all", label: "Всё" }, { key: "plans", label: "Планы" }, { key: "journal", label: "Дневник" }];
const colors = { text: "#211E29", muted: "rgba(33,30,41,.62)", faint: "rgba(33,30,41,.38)", hair: "rgba(33,30,41,.10)", anchor: "#3C3748", mint: "#8FAE9B", coral: "#C79C8E" };
const emptyPlan: Record<string, FormValue> = { title: "", description: "", date: "", kind: "other", status: "idea", showInCalendar: true, imageUri: "" };
const emptyJournal: Record<string, FormValue> = { title: "", content: "", kind: "reflection", mood: "calm" };
function validDate(value?: string | null) { if (!value) return null; const date = new Date(value.includes("T") ? value : `${value}T12:00:00`); return Number.isNaN(date.getTime()) ? null : date; }
function dateLabel(value?: string | null) { const date = validDate(value); return date ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date) : "без даты"; }
function timeLabel(value: string) { const date = validDate(value); return date ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date) : ""; }

export default function EntriesScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const data = useAppData();
  const { snapshot } = data;
  const [filter, setFilter] = useState<Filter>(params.filter === "plans" || params.filter === "journal" ? params.filter : "all");
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingJournal, setEditingJournal] = useState<JournalEntry | null>(null);
  const [planForm, setPlanForm] = useState<Record<string, FormValue>>(emptyPlan);
  const [journalForm, setJournalForm] = useState<Record<string, FormValue>>(emptyJournal);
  const [planOpen, setPlanOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  const beginPlan = (plan?: Plan) => { setEditingPlan(plan ?? null); setPlanForm(plan ? { title: plan.title, description: plan.description, date: plan.date ?? "", kind: plan.kind, status: plan.status, showInCalendar: plan.showInCalendar !== false, imageUri: plan.imageUri ?? "" } : emptyPlan); setPlanOpen(true); };
  const beginJournal = (entry?: JournalEntry) => { setEditingJournal(entry ?? null); setJournalForm(entry ? { title: entry.title, content: entry.content, kind: entry.kind, mood: entry.mood ?? "neutral" } : emptyJournal); setJournalOpen(true); };
  const add = () => {
    if (filter === "plans") return beginPlan();
    if (filter === "journal") return beginJournal();
    Alert.alert("Что добавить?", "Выберите тип новой записи.", [{ text: "Отмена", style: "cancel" }, { text: "План", onPress: () => { setFilter("plans"); beginPlan(); } }, { text: "Запись в дневник", onPress: () => { setFilter("journal"); beginJournal(); } }]);
  };
  const savePlan = () => {
    const title = String(planForm.title).trim();
    if (!title) return Alert.alert("Добавьте название");
    const input = { title, description: String(planForm.description).trim(), date: String(planForm.date).trim() || null, kind: planForm.kind as PlanKind, status: planForm.status as PlanStatus, imageUri: String(planForm.imageUri).trim() || null, showInCalendar: Boolean(planForm.showInCalendar) };
    editingPlan ? data.updatePlan(editingPlan.id, input) : data.addPlan(input);
    setPlanOpen(false);
  };
  const saveJournal = () => {
    const title = String(journalForm.title).trim(); const content = String(journalForm.content).trim();
    if (!title || !content) return Alert.alert("Заполните запись", "Нужны заголовок и текст.");
    const input = { title, content, kind: journalForm.kind as JournalKind, mood: journalForm.mood as Mood, replyToId: editingJournal?.replyToId ?? null };
    editingJournal ? data.updateJournalEntry(editingJournal.id, input) : data.addJournalEntry(input);
    setJournalOpen(false);
  };
  const pickImage = async () => { try { setPicking(true); const uri = await selectAndStoreImage("plan"); if (uri) setPlanForm((current) => ({ ...current, imageUri: uri })); } finally { setPicking(false); } };

  return <V2Screen>
    <View style={styles.header}><View style={styles.copy}><Text style={styles.kicker}>Планы и дневник</Text><Text style={styles.h1}>Записи</Text></View><Pressable accessibilityLabel="Поиск" onPress={() => router.push("/search" as Href)} style={styles.search}><Ionicons color={colors.text} name="search-outline" size={19} /></Pressable></View>
    <View style={styles.toolRow}><V2Glass radius={21} style={styles.filter}>{filters.map((item) => <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.segment, filter === item.key && styles.segmentOn]}><Text style={[styles.segmentText, filter === item.key && styles.segmentTextOn]}>{item.label}</Text></Pressable>)}</V2Glass><Pressable accessibilityLabel="Добавить" onPress={add} style={styles.add}><Ionicons color="#fff" name="add" size={20} /></Pressable></View>
    {filter === "all" && <AllTimeline accessToken={accessToken} onJournal={beginJournal} onPlan={beginPlan} snapshot={snapshot} />}
    {filter === "plans" && <PlansView accessToken={accessToken} onOpen={beginPlan} plans={snapshot.plans} />}
    {filter === "journal" && <JournalView entries={snapshot.journal} onOpen={beginJournal} snapshot={snapshot} />}
    <EntryFormModal fields={[{ key: "title", label: "Название", placeholder: "Что вы хотите сделать" }, { key: "description", label: "Детали", placeholder: "Что важно учесть", multiline: true }, { key: "date", label: "Дата", type: "date" }, { key: "kind", label: "Тип", choices: Object.entries(planKindLabels).map(([value, label]) => ({ value, label })) }, { key: "status", label: "Статус", choices: Object.entries(planStatusLabels).map(([value, label]) => ({ value, label })) }, { key: "showInCalendar", label: "Показывать в календаре", type: "switch" }]} imageUri={String(planForm.imageUri || "") || null} onChange={(key, value) => setPlanForm((current) => ({ ...current, [key]: value }))} onClose={() => setPlanOpen(false)} onPickImage={() => void pickImage()} onSave={savePlan} pickingImage={picking} title={editingPlan ? "Изменить план" : "Новый план"} values={planForm} visible={planOpen} />
    <EntryFormModal fields={[{ key: "title", label: "Заголовок", placeholder: "О чём эта запись" }, { key: "content", label: "Текст", placeholder: "Напишите своими словами", multiline: true }, { key: "kind", label: "Тип", choices: Object.entries(journalKindLabels).map(([value, label]) => ({ value, label })) }, { key: "mood", label: "Настроение", choices: Object.entries(moodLabels).map(([value, label]) => ({ value, label })) }]} onChange={(key, value) => setJournalForm((current) => ({ ...current, [key]: value }))} onClose={() => setJournalOpen(false)} onSave={saveJournal} title={editingJournal ? "Изменить запись" : "Новая запись"} values={journalForm} visible={journalOpen} />
  </V2Screen>;
}

function AllTimeline({ snapshot, accessToken, onPlan, onJournal }: { snapshot: ReturnType<typeof useAppData>["snapshot"]; accessToken: string | null; onPlan: (plan: Plan) => void; onJournal: (entry: JournalEntry) => void }) {
  const feed = useMemo(() => [...snapshot.journal.map((item) => ({ type: "journal" as const, item, at: item.createdAt })), ...snapshot.plans.map((item) => ({ type: "plan" as const, item, at: item.createdAt }))].sort((a, b) => b.at.localeCompare(a.at)), [snapshot.journal, snapshot.plans]);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const weekStart = new Date(today); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const groups = [
    { key: "today", label: "Сегодня", entries: feed.filter((entry) => entry.at.slice(0, 10) === todayKey) },
    { key: "week", label: "На этой неделе", entries: feed.filter((entry) => entry.at.slice(0, 10) !== todayKey && (validDate(entry.at)?.getTime() ?? 0) >= weekStart.getTime()) },
    { key: "earlier", label: "Ранее", entries: feed.filter((entry) => (validDate(entry.at)?.getTime() ?? 0) < weekStart.getTime()) },
  ].filter((group) => group.entries.length);
  return <View style={styles.rail}><View style={styles.railLine} />{groups.length ? groups.map((group, groupIndex) => <View key={group.key}><View style={styles.timelineLabel}><View style={[styles.node, groupIndex === 0 && styles.nowNode]} /><Text style={styles.timelineLabelText}>{group.label}</Text></View>{group.entries.slice(0, 8).map((entry) => entry.type === "journal" ? <JournalCard key={entry.item.id} entry={entry.item} onPress={() => onJournal(entry.item)} snapshot={snapshot} /> : <PlanCard accessToken={accessToken} key={entry.item.id} onPress={() => onPlan(entry.item)} plan={entry.item} />)}</View>) : <V2Glass radius={24} style={styles.empty}><Text style={styles.emptyText}>Здесь появятся ваши планы и записи.</Text></V2Glass>}</View>;
}
function PlansView({ plans, accessToken, onOpen }: { plans: Plan[]; accessToken: string | null; onOpen: (plan: Plan) => void }) {
  const groups: { status: PlanStatus; label: string }[] = [{ status: "planned", label: "Запланировано" }, { status: "idea", label: "Идеи" }, { status: "done", label: "Сделано" }];
  return <View>{groups.map((group) => { const list = plans.filter((plan) => plan.status === group.status); return <View key={group.status}><SectionHeader count={list.length} label={group.label} /><View style={styles.rows}>{list.length ? list.map((plan) => <PlanRow accessToken={accessToken} key={plan.id} onPress={() => onOpen(plan)} plan={plan} />) : <V2Glass radius={20} style={styles.empty}><Text style={styles.emptyText}>Пока пусто</Text></V2Glass>}</View></View>; })}</View>;
}
function JournalView({ entries, snapshot, onOpen }: { entries: JournalEntry[]; snapshot: ReturnType<typeof useAppData>["snapshot"]; onOpen: (entry: JournalEntry) => void }) {
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <View><SectionHeader count={sorted.length} label="Последние записи" /><View style={styles.thread}>{sorted.length ? sorted.map((entry) => <View key={entry.id} style={[styles.message, entry.replyToId ? styles.replyMessage : null]}><View style={styles.avatar}><Text style={styles.avatarText}>{memberName(snapshot, entry.authorId)[0]}</Text></View><View style={styles.bubbleWrap}><JournalCard entry={entry} onPress={() => onOpen(entry)} snapshot={snapshot} /></View></View>) : <V2Glass radius={22} style={styles.empty}><Text style={styles.emptyText}>Дневник пока пуст</Text></V2Glass>}</View></View>;
}
function JournalCard({ entry, snapshot, onPress }: { entry: JournalEntry; snapshot: ReturnType<typeof useAppData>["snapshot"]; onPress: () => void }) { return <Pressable onLongPress={() => onPress()} onPress={onPress} style={styles.cardGap}><V2Glass radius={24} style={styles.note}><View style={styles.noteHead}><View style={styles.smallAvatar}><Text style={styles.avatarText}>{memberName(snapshot, entry.authorId)[0]}</Text></View><Text style={styles.who}>{memberName(snapshot, entry.authorId)}</Text><Text style={styles.time}>{timeLabel(entry.createdAt)}</Text></View><Text style={styles.noteTitle}>{entry.title}</Text><Text numberOfLines={3} style={styles.noteText}>{entry.content}</Text><View style={styles.chips}>{entry.mood && <Chip dot label={moodLabels[entry.mood]} />}<Chip label={journalKindLabels[entry.kind]} /></View></V2Glass></Pressable>; }
function PlanCard({ plan, accessToken, onPress }: { plan: Plan; accessToken: string | null; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.cardGap}><V2Glass radius={26} style={styles.plan}><View style={styles.planPhoto}>{plan.imageUri ? <Image resizeMode="cover" source={privateImageSource(plan.imageUri, accessToken)} style={StyleSheet.absoluteFill} /> : <Ionicons color={colors.faint} name="map-outline" size={28} />}<View style={styles.dateBadge}><Text style={styles.dateBadgeText}>{dateLabel(plan.date)}</Text></View></View><View style={styles.planBody}><Text style={styles.planTitle}>{plan.title}</Text>{plan.description ? <Text numberOfLines={2} style={styles.planText}>{plan.description}</Text> : null}<View style={styles.chips}><Chip dot label={planKindLabels[plan.kind]} /><Chip label={planStatusLabels[plan.status]} /></View></View></V2Glass></Pressable>; }
function PlanRow({ plan, accessToken, onPress }: { plan: Plan; accessToken: string | null; onPress: () => void }) { return <Pressable onPress={onPress}><V2Glass radius={20} style={styles.row}><View style={styles.thumb}>{plan.imageUri ? <Image resizeMode="cover" source={privateImageSource(plan.imageUri, accessToken)} style={StyleSheet.absoluteFill} /> : <Ionicons color={colors.faint} name="map-outline" size={21} />}</View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{plan.title}</Text><Text style={styles.rowMeta}>{dateLabel(plan.date)}</Text><View style={styles.tags}><Chip dot label={planKindLabels[plan.kind]} /></View></View><Ionicons color={colors.faint} name="chevron-forward" size={16} /></V2Glass></Pressable>; }
function Chip({ label, dot = false }: { label: string; dot?: boolean }) { return <View style={styles.chip}>{dot && <View style={styles.chipDot} />}<Text style={styles.chipText}>{label}</Text></View>; }
function SectionHeader({ label, count }: { label: string; count: number }) { return <View style={styles.section}><Text style={styles.sectionText}>{label}</Text><View style={styles.count}><Text style={styles.countText}>{count}</Text></View><View style={styles.rule} /></View>; }

const styles = StyleSheet.create({
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 }, copy: { flex: 1 }, kicker: { color: colors.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" }, h1: { color: colors.text, fontFamily: "GolosText", fontSize: 29, fontWeight: "600", letterSpacing: -0.93, lineHeight: 35, marginTop: 7 }, search: { alignItems: "center", backgroundColor: "rgba(255,255,255,.12)", borderRadius: 20, height: 40, justifyContent: "center", marginTop: 5, width: 40 },
  toolRow: { alignItems: "center", flexDirection: "row", gap: 9, marginTop: 18 }, filter: { flex: 1, flexDirection: "row", gap: 2, height: 42, padding: 4 }, segment: { alignItems: "center", borderRadius: 17, flex: 1, justifyContent: "center" }, segmentOn: { backgroundColor: "rgba(255,255,255,.22)" }, segmentText: { color: colors.muted, fontFamily: "GolosText", fontSize: 12.5, fontWeight: "500" }, segmentTextOn: { color: colors.text }, add: { alignItems: "center", backgroundColor: colors.anchor, borderRadius: 21, height: 42, justifyContent: "center", width: 42 },
  rail: { marginTop: 6, paddingLeft: 42, position: "relative" }, railLine: { backgroundColor: "rgba(33,30,41,.14)", bottom: 14, left: 9, position: "absolute", top: 14, width: 1 }, timelineLabel: { marginBottom: 11, marginTop: 4, position: "relative" }, timelineLabelText: { color: colors.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" }, node: { backgroundColor: "rgba(255,255,255,.92)", borderRadius: 5, height: 10, left: -37.5, position: "absolute", top: 2, width: 10 }, nowNode: { backgroundColor: colors.anchor }, cardGap: { marginBottom: 11 },
  note: { paddingHorizontal: 16, paddingVertical: 15 }, noteHead: { alignItems: "center", flexDirection: "row", gap: 8 }, smallAvatar: { alignItems: "center", backgroundColor: "rgba(255,255,255,.30)", borderRadius: 12.5, height: 25, justifyContent: "center", width: 25 }, avatarText: { color: colors.text, fontFamily: "GolosText", fontSize: 10.5, fontWeight: "600" }, who: { color: colors.text, fontFamily: "GolosText", fontSize: 12.5, fontWeight: "600" }, time: { color: colors.faint, fontFamily: "GolosText", fontSize: 10.5 }, noteTitle: { color: colors.text, fontFamily: "GolosText", fontSize: 17, fontWeight: "600", lineHeight: 21, marginTop: 10 }, noteText: { color: colors.muted, fontFamily: "GolosText", fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  plan: { padding: 8, paddingBottom: 15 }, planPhoto: { alignItems: "center", backgroundColor: "rgba(255,255,255,.16)", borderRadius: 19, height: 104, justifyContent: "center", overflow: "hidden" }, dateBadge: { backgroundColor: "rgba(38,32,48,.42)", borderRadius: 12.5, left: 10, minHeight: 25, paddingHorizontal: 12, position: "absolute", top: 10, justifyContent: "center" }, dateBadgeText: { color: "#fff", fontFamily: "GolosText", fontSize: 11, fontWeight: "500" }, planBody: { paddingHorizontal: 10, paddingTop: 13 }, planTitle: { color: colors.text, fontFamily: "GolosText", fontSize: 19, fontWeight: "600", lineHeight: 23 }, planText: { color: colors.muted, fontFamily: "GolosText", fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  chips: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }, chip: { alignItems: "center", backgroundColor: "rgba(255,255,255,.14)", borderRadius: 12.5, flexDirection: "row", gap: 6, minHeight: 25, paddingHorizontal: 10 }, chipDot: { backgroundColor: colors.muted, borderRadius: 3, height: 6, width: 6 }, chipText: { color: colors.muted, fontFamily: "GolosText", fontSize: 11.5, fontWeight: "500" },
  section: { alignItems: "center", flexDirection: "row", gap: 9, marginHorizontal: 2, marginBottom: 10, marginTop: 22 }, sectionText: { color: colors.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" }, count: { alignItems: "center", backgroundColor: "rgba(255,255,255,.22)", borderRadius: 9.5, minHeight: 19, minWidth: 19, justifyContent: "center", paddingHorizontal: 6 }, countText: { color: colors.muted, fontFamily: "GolosText", fontSize: 10.5, fontWeight: "600" }, rule: { backgroundColor: colors.hair, flex: 1, height: StyleSheet.hairlineWidth }, rows: { gap: 9 }, row: { alignItems: "center", flexDirection: "row", gap: 12, padding: 9 }, thumb: { alignItems: "center", backgroundColor: "rgba(255,255,255,.16)", borderRadius: 15, height: 62, justifyContent: "center", overflow: "hidden", width: 62 }, rowCopy: { flex: 1 }, rowTitle: { color: colors.text, fontFamily: "GolosText", fontSize: 15, fontWeight: "600", lineHeight: 19 }, rowMeta: { color: colors.muted, fontFamily: "GolosText", fontSize: 11.5, marginTop: 4 }, tags: { flexDirection: "row", marginTop: 7 },
  thread: { gap: 11 }, message: { alignItems: "flex-start", flexDirection: "row", gap: 10 }, replyMessage: { marginLeft: 40 }, avatar: { alignItems: "center", backgroundColor: "rgba(255,255,255,.32)", borderRadius: 15, height: 30, justifyContent: "center", marginTop: 3, width: 30 }, bubbleWrap: { flex: 1 }, empty: { alignItems: "center", padding: 20 }, emptyText: { color: colors.muted, fontFamily: "GolosText", fontSize: 12.5, textAlign: "center" },
});
