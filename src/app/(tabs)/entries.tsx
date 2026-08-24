import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { journalKindLabels, memberName, moodLabels, planKindLabels, planStatusLabels } from "@/domain/labels";
import type { JournalEntry, JournalKind, Mood, Plan, PlanKind, PlanStatus } from "@/domain/models";
import { privateImageSource } from "@/services/backendClient";
import { captureAndStoreImage, deleteStoredImage, selectAndStoreImage } from "@/services/imageService";
import { useRemoteEntryCommand } from "@/hooks/useRemoteEntryCommand";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { V2Glass, V2Screen } from "@/ui-v2";
import { OrbSinkItem } from "@/motion/ScrollSuction";

type Filter = "all" | "plans" | "journal";
const filters: { key: Filter; label: string }[] = [{ key: "all", label: "Всё" }, { key: "plans", label: "Планы" }, { key: "journal", label: "Дневник" }];
const colors = { text: "#211E29", muted: "rgba(33,30,41,.62)", faint: "rgba(33,30,41,.38)", hair: "rgba(33,30,41,.10)", anchor: "#3C3748", mint: "#8FAE9B", coral: "#C79C8E" };
const emptyPlan: Record<string, FormValue> = { title: "", description: "", date: "", kind: "other", status: "idea", showInCalendar: true, imageUri: "" };
const emptyJournal: Record<string, FormValue> = { title: "", content: "", kind: "reflection", mood: "calm", replyToId: "" };
function validDate(value?: string | null) { if (!value) return null; const date = new Date(value.includes("T") ? value : `${value}T12:00:00`); return Number.isNaN(date.getTime()) ? null : date; }
function dateLabel(value?: string | null) { const date = validDate(value); return date ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date) : "без даты"; }
function timeLabel(value: string) { const date = validDate(value); return date ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date) : ""; }
function dateKey(value: string) { const date = validDate(value); return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "undated"; }
function dayLabel(value: string) { const date = validDate(value); if (!date) return "Без даты"; const today = new Date(); return dateKey(value) === dateKey(today.toISOString()) ? "Сегодня" : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date); }
function ideaWord(count: number) { const mod100 = count % 100; const mod10 = count % 10; if (mod100 >= 11 && mod100 <= 14) return "идей"; if (mod10 === 1) return "идея"; if (mod10 >= 2 && mod10 <= 4) return "идеи"; return "идей"; }

export default function EntriesScreen() {
  const params = useLocalSearchParams<{ filter?: string; compose?: string; entryId?: string; replyToId?: string; date?: string }>();
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
  const handledCommand = useRef("");

  const beginPlan = (plan?: Plan, initialDate = "") => { setEditingPlan(plan ?? null); setPlanForm(plan ? { title: plan.title, description: plan.description, date: plan.date ?? "", kind: plan.kind, status: plan.status, showInCalendar: plan.showInCalendar !== false, imageUri: plan.imageUri ?? "" } : { ...emptyPlan, date: initialDate }); setPlanOpen(true); };
  const beginJournal = (entry?: JournalEntry, replyTo?: JournalEntry) => {
    setEditingJournal(entry ?? null);
    setJournalForm(entry
      ? { title: entry.title, content: entry.content, kind: entry.kind, mood: entry.mood ?? "neutral", replyToId: entry.replyToId ?? "" }
      : { ...emptyJournal, title: replyTo ? `Ответ: ${replyTo.title}` : "", replyToId: replyTo?.id ?? "" });
    setJournalOpen(true);
  };
  const linkedEntries = useMemo(() => [
    ...snapshot.plans.map((item) => ({ id: item.id, item, type: "plan" as const })),
    ...snapshot.journal.map((item) => ({ id: item.id, item, type: "journal" as const })),
  ], [snapshot.journal, snapshot.plans]);

  useRemoteEntryCommand({
    entryId: params.entryId,
    isHydrated: data.isHydrated,
    items: linkedEntries,
    missingMessage: "Возможно, она была удалена на другом устройстве.",
    missingTitle: "Запись не найдена",
    onConsume: () => router.setParams({ entryId: undefined }),
    onFound: (entry) => {
      if (entry.type === "plan") { setFilter("plans"); beginPlan(entry.item); }
      else { setFilter("journal"); beginJournal(entry.item); }
    },
    refreshRemote: data.refreshRemote,
  });

  useEffect(() => {
    if (params.filter === "plans" || params.filter === "journal" || params.filter === "all") setFilter(params.filter);
  }, [params.filter]);

  useEffect(() => {
    if (!data.isHydrated) return;
    if (params.entryId) return;
    const command = [params.compose ?? "", params.replyToId ?? "", params.date ?? ""].join("|");
    if (command === "||") { handledCommand.current = ""; return; }
    if (handledCommand.current === command) return;
    handledCommand.current = command;

    if (params.compose === "plan" || params.compose === "plans") {
      setFilter("plans");
      beginPlan(undefined, params.date ?? "");
    } else if (params.compose === "journal") {
      setFilter("journal");
      const replyTo = params.replyToId ? snapshot.journal.find((item) => item.id === params.replyToId) : undefined;
      beginJournal(undefined, replyTo);
    }

    router.setParams({ compose: undefined, date: undefined, replyToId: undefined });
  }, [data.isHydrated, params.compose, params.date, params.entryId, params.replyToId, router, snapshot.journal]);
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
    const input = { title, content, kind: journalForm.kind as JournalKind, mood: journalForm.mood as Mood, replyToId: String(journalForm.replyToId || "") || null };
    editingJournal ? data.updateJournalEntry(editingJournal.id, input) : data.addJournalEntry(input);
    setJournalOpen(false);
  };
  const pickImage = async (source: "camera" | "library") => {
    try {
      setPicking(true);
      const uri = source === "camera" ? await captureAndStoreImage("plan") : await selectAndStoreImage("plan");
      if (uri) {
        const currentDraft = String(planForm.imageUri || "");
        if (currentDraft && currentDraft !== (editingPlan?.imageUri ?? "")) deleteStoredImage(currentDraft);
        setPlanForm((current) => ({ ...current, imageUri: uri }));
      }
    } catch (error) {
      const message = error instanceof Error && error.message === "PHOTO_PERMISSION_DENIED"
        ? "Разрешите доступ к фотографиям в настройках iPhone."
        : error instanceof Error && error.message === "CAMERA_PERMISSION_DENIED"
          ? "Разрешите доступ к камере в настройках iPhone."
          : "Попробуйте выбрать другое изображение.";
      Alert.alert("Не удалось добавить изображение", message);
    } finally {
      setPicking(false);
    }
  };
  const chooseImage = () => Alert.alert("Добавить изображение", undefined, [
    { text: "Отмена", style: "cancel" },
    { text: "Снять фото", onPress: () => void pickImage("camera") },
    { text: "Выбрать из галереи", onPress: () => void pickImage("library") },
  ]);
  const closePlan = () => {
    const draftImage = String(planForm.imageUri || "");
    if (draftImage && draftImage !== (editingPlan?.imageUri ?? "")) deleteStoredImage(draftImage);
    setPlanOpen(false);
  };
  const removePlanImage = () => {
    const draftImage = String(planForm.imageUri || "");
    if (draftImage && draftImage !== (editingPlan?.imageUri ?? "")) deleteStoredImage(draftImage);
    setPlanForm((current) => ({ ...current, imageUri: "" }));
  };
  const confirmDeletePlan = () => {
    if (!editingPlan) return;
    Alert.alert("Удалить план?", "Это действие нельзя отменить.", [{ text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: () => { data.deletePlan(editingPlan.id); setPlanOpen(false); } }]);
  };
  const confirmDeleteJournal = () => {
    if (!editingJournal) return;
    Alert.alert("Удалить запись?", "Это действие нельзя отменить.", [{ text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: () => { data.deleteJournalEntry(editingJournal.id); setJournalOpen(false); } }]);
  };

  return <V2Screen>
    <View style={styles.header}><View style={styles.copy}><Text style={styles.kicker}>Планы и дневник</Text><Text style={styles.h1}>Записи</Text></View><Pressable accessibilityLabel="Поиск" onPress={() => router.push("/search" as Href)} style={styles.search}><Ionicons color={colors.text} name="search-outline" size={19} /></Pressable></View>
    <View style={styles.toolRow}><V2Glass radius={21} style={styles.filter}>{filters.map((item) => <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.segment, filter === item.key && styles.segmentOn]}><Text style={[styles.segmentText, filter === item.key && styles.segmentTextOn]}>{item.label}</Text></Pressable>)}</V2Glass><Pressable accessibilityLabel="Добавить" onPress={add} style={styles.add}><Ionicons color="#fff" name="add" size={20} /></Pressable></View>
    {filter === "all" && <AllTimeline accessToken={accessToken} onJournal={beginJournal} onPlan={beginPlan} snapshot={snapshot} />}
    {filter === "plans" && <PlansView accessToken={accessToken} onOpen={beginPlan} plans={snapshot.plans} />}
    {filter === "journal" && <JournalView entries={snapshot.journal} onOpen={beginJournal} snapshot={snapshot} />}
    <EntryFormModal fields={[{ key: "title", label: "Название", placeholder: "Что вы хотите сделать" }, { key: "description", label: "Детали", placeholder: "Что важно учесть", multiline: true }, { key: "date", label: "Дата", type: "date" }, { key: "kind", label: "Тип", choices: Object.entries(planKindLabels).map(([value, label]) => ({ value, label })) }, { key: "status", label: "Статус", choices: Object.entries(planStatusLabels).map(([value, label]) => ({ value, label })) }, { key: "showInCalendar", label: "Показывать в календаре", type: "switch" }]} imageUri={String(planForm.imageUri || "") || null} onChange={(key, value) => setPlanForm((current) => ({ ...current, [key]: value }))} onClose={closePlan} onDelete={editingPlan ? confirmDeletePlan : undefined} onPickImage={chooseImage} onRemoveImage={removePlanImage} onSave={savePlan} pickingImage={picking} title={editingPlan ? "Изменить план" : "Новый план"} values={planForm} visible={planOpen} />
    <EntryFormModal fields={[{ key: "title", label: "Заголовок", placeholder: "О чём эта запись" }, { key: "content", label: "Текст", placeholder: "Напишите своими словами", multiline: true }, { key: "kind", label: "Тип", choices: Object.entries(journalKindLabels).map(([value, label]) => ({ value, label })) }, { key: "mood", label: "Настроение", choices: Object.entries(moodLabels).map(([value, label]) => ({ value, label })) }]} onChange={(key, value) => setJournalForm((current) => ({ ...current, [key]: value }))} onClose={() => setJournalOpen(false)} onDelete={editingJournal ? confirmDeleteJournal : undefined} onSave={saveJournal} title={editingJournal ? "Изменить запись" : "Новая запись"} values={journalForm} visible={journalOpen} />
  </V2Screen>;
}

function AllTimeline({ snapshot, accessToken, onPlan, onJournal }: { snapshot: ReturnType<typeof useAppData>["snapshot"]; accessToken: string | null; onPlan: (plan: Plan) => void; onJournal: (entry: JournalEntry) => void }) {
  const feed = useMemo(() => [...snapshot.journal.map((item) => ({ type: "journal" as const, item, at: item.createdAt })), ...snapshot.plans.map((item) => ({ type: "plan" as const, item, at: item.date || item.createdAt }))].sort((a, b) => (validDate(b.at)?.getTime() ?? 0) - (validDate(a.at)?.getTime() ?? 0)), [snapshot.journal, snapshot.plans]);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const weekStart = new Date(today); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const groups = [
    { key: "today", label: "Сегодня", entries: feed.filter((entry) => entry.at.slice(0, 10) === todayKey) },
    { key: "week", label: "На этой неделе", entries: feed.filter((entry) => { const at = validDate(entry.at)?.getTime() ?? 0; return entry.at.slice(0, 10) !== todayKey && at >= weekStart.getTime() && at < weekEnd.getTime(); }) },
    { key: "later", label: "Позже", entries: feed.filter((entry) => (validDate(entry.at)?.getTime() ?? 0) >= weekEnd.getTime()) },
    { key: "earlier", label: "Ранее", entries: feed.filter((entry) => (validDate(entry.at)?.getTime() ?? 0) < weekStart.getTime()) },
  ].filter((group) => group.entries.length);
  return <View style={styles.rail}><View style={styles.railLine} />{groups.length ? groups.map((group, groupIndex) => <View key={group.key}><View style={[styles.timelineLabel, groupIndex > 0 && styles.timelineLabelLater]}><View style={[styles.node, group.key === "today" && styles.nowNode]} /><Text style={styles.timelineLabelText}>{group.label}</Text></View>{group.key === "earlier" ? <EarlierTimeline accessToken={accessToken} entries={group.entries} onJournal={onJournal} onPlan={onPlan} snapshot={snapshot} /> : group.entries.map((entry) => entry.type === "journal" ? <JournalCard key={entry.item.id} entry={entry.item} onPress={() => onJournal(entry.item)} snapshot={snapshot} /> : <PlanCard accessToken={accessToken} key={entry.item.id} onPress={() => onPlan(entry.item)} plan={entry.item} />)}</View>) : <V2Glass radius={24} style={styles.empty}><Text style={styles.emptyText}>Здесь появятся ваши планы и записи.</Text></V2Glass>}</View>;
}
type FeedEntry = { type: "journal"; item: JournalEntry; at: string } | { type: "plan"; item: Plan; at: string };
function EarlierTimeline({ entries, snapshot, accessToken, onPlan, onJournal }: { entries: FeedEntry[]; snapshot: ReturnType<typeof useAppData>["snapshot"]; accessToken: string | null; onPlan: (plan: Plan) => void; onJournal: (entry: JournalEntry) => void }) {
  const rows: ReactNode[] = [];
  let pendingPlans: FeedEntry[] = [];
  const flushPlans = () => {
    if (!pendingPlans.length) return;
    const pair = pendingPlans;
    rows.push(<View key={`plans-${pair.map((entry) => entry.item.id).join("-")}`} style={styles.tilePair}>{pair.map((entry) => <CompactTile entry={entry} key={entry.item.id} onJournal={onJournal} onPlan={onPlan} />)}</View>);
    pendingPlans = [];
  };
  entries.forEach((entry) => {
    if (entry.type === "plan") {
      pendingPlans.push(entry);
      if (pendingPlans.length === 2) flushPlans();
      return;
    }
    flushPlans();
    rows.push(<JournalCard entry={entry.item} key={entry.item.id} onPress={() => onJournal(entry.item)} snapshot={snapshot} />);
  });
  flushPlans();
  return <>{rows}</>;
}
function CompactTile({ entry, onPlan, onJournal }: { entry: FeedEntry; onPlan: (plan: Plan) => void; onJournal: (entry: JournalEntry) => void }) {
  const plan = entry.type === "plan" ? entry.item : null;
  const title = entry.item.title;
  const kind = entry.type === "plan" ? planStatusLabels[entry.item.status] : journalKindLabels[entry.item.kind];
  return <OrbSinkItem style={styles.compactWrap}><Pressable onPress={() => plan ? onPlan(plan) : onJournal(entry.item as JournalEntry)}><V2Glass radius={20} style={styles.compactTile}><Text style={styles.compactKind}>{kind}</Text><Text numberOfLines={3} style={styles.compactTitle}>{title}</Text><Text style={styles.compactMeta}>{plan ? dateLabel(plan.date) : dateLabel(entry.item.createdAt)}</Text></V2Glass></Pressable></OrbSinkItem>;
}
function PlansView({ plans, accessToken, onOpen }: { plans: Plan[]; accessToken: string | null; onOpen: (plan: Plan) => void }) {
  const planned = plans.filter((plan) => plan.status === "planned").sort((a, b) => (validDate(a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (validDate(b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER));
  const ideas = plans.filter((plan) => plan.status === "idea");
  const done = plans.filter((plan) => plan.status === "done").sort((a, b) => (validDate(b.date || b.updatedAt)?.getTime() ?? 0) - (validDate(a.date || a.updatedAt)?.getTime() ?? 0));
  const [plannedIndex, setPlannedIndex] = useState(0);
  const [showAllIdeas, setShowAllIdeas] = useState(false);
  const [showDone, setShowDone] = useState(false);
  useEffect(() => { setPlannedIndex((value) => Math.min(value, Math.max(0, planned.length - 1))); }, [planned.length]);
  const featured = planned[Math.min(plannedIndex, Math.max(0, planned.length - 1))];
  const visibleIdeas = showAllIdeas ? ideas : ideas.slice(0, 2);
  return <View>
    <SectionHeader count={planned.length} label="Запланировано" />
    {featured ? <><View style={styles.carousel}><Pressable accessibilityLabel="Предыдущий план" disabled={plannedIndex === 0} onPress={() => setPlannedIndex((value) => Math.max(0, value - 1))} style={[styles.carouselArrow, plannedIndex === 0 && styles.carouselArrowOff]}><Ionicons color={colors.muted} name="chevron-back" size={16} /></Pressable><View style={styles.featuredWrap}><PlanCard accessToken={accessToken} onPress={() => onOpen(featured)} plan={featured} /></View><Pressable accessibilityLabel="Следующий план" disabled={plannedIndex >= planned.length - 1} onPress={() => setPlannedIndex((value) => Math.min(planned.length - 1, value + 1))} style={[styles.carouselArrow, plannedIndex >= planned.length - 1 && styles.carouselArrowOff]}><Ionicons color={colors.muted} name="chevron-forward" size={16} /></Pressable></View><View style={styles.dots}>{planned.map((plan, index) => <View key={plan.id} style={[styles.dot, index === plannedIndex && styles.dotOn]} />)}</View></> : <V2Glass radius={22} style={styles.featuredEmpty}><Ionicons color={colors.faint} name="calendar-outline" size={23} /><Text style={styles.emptyText}>Нет запланированных событий</Text></V2Glass>}
    <SectionHeader count={ideas.length} label="Идея" /><View style={styles.rows}>{visibleIdeas.length ? visibleIdeas.map((plan) => <PlanRow accessToken={accessToken} key={plan.id} onPress={() => onOpen(plan)} plan={plan} />) : <V2Glass radius={20} style={styles.empty}><Text style={styles.emptyText}>Здесь появятся идеи на будущее</Text></V2Glass>}</View>
    {ideas.length > 2 && <Pressable onPress={() => setShowAllIdeas((value) => !value)}><V2Glass radius={18} style={styles.more}><Text style={styles.moreText}>{showAllIdeas ? "Свернуть" : `Ещё ${ideas.length - 2} ${ideaWord(ideas.length - 2)}`}</Text><Ionicons color={colors.faint} name={showAllIdeas ? "chevron-up" : "chevron-down"} size={15} /></V2Glass></Pressable>}
    <Pressable disabled={!done.length} onPress={() => setShowDone((value) => !value)}><V2Glass radius={22} style={styles.archive}><View style={styles.archiveIcon}><Ionicons color={colors.muted} name="checkmark" size={19} /></View><View style={styles.archiveCopy}><Text style={styles.archiveTitle}>Сделано</Text><Text numberOfLines={2} style={styles.archiveMeta}>{done[0] ? `последний — «${done[0].title}», ${dateLabel(done[0].date || done[0].updatedAt)}` : "Выполненные планы появятся здесь"}</Text></View><View style={styles.archiveCount}><Text style={styles.archiveCountText}>{done.length}</Text></View><Ionicons color={colors.faint} name={showDone ? "chevron-up" : "chevron-forward"} size={16} /></V2Glass></Pressable>
    {showDone && <View style={styles.archiveRows}>{done.map((plan) => <PlanRow accessToken={accessToken} key={plan.id} onPress={() => onOpen(plan)} plan={plan} />)}</View>}
  </View>;
}
function JournalView({ entries, snapshot, onOpen }: { entries: JournalEntry[]; snapshot: ReturnType<typeof useAppData>["snapshot"]; onOpen: (entry: JournalEntry) => void }) {
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups = sorted.reduce<{ key: string; label: string; entries: JournalEntry[] }[]>((result, entry) => { const key = dateKey(entry.createdAt); const current = result[result.length - 1]; if (current?.key === key) current.entries.push(entry); else result.push({ key, label: dayLabel(entry.createdAt), entries: [entry] }); return result; }, []);
  return <View>{groups.length ? groups.map((group) => <View key={group.key}><View style={styles.dayDivider}><Text style={styles.dayDividerText}>{group.label}</Text><View style={styles.rule} /></View><View style={styles.thread}>{group.entries.map((entry) => <View key={entry.id} style={[styles.message, entry.replyToId ? styles.replyMessage : null]}>{entry.replyToId && <View style={styles.replyConnector} />}<View style={styles.avatar}><Text style={styles.avatarText}>{memberName(snapshot, entry.authorId)[0]}</Text></View><View style={styles.bubbleWrap}><JournalBubble entry={entry} onPress={() => onOpen(entry)} snapshot={snapshot} /></View></View>)}</View></View>) : <><SectionHeader count={0} label="Последние записи" /><V2Glass radius={22} style={styles.empty}><Text style={styles.emptyText}>Дневник пока пуст</Text></V2Glass></>}</View>;
}
function JournalBubble({ entry, snapshot, onPress }: { entry: JournalEntry; snapshot: ReturnType<typeof useAppData>["snapshot"]; onPress: () => void }) { return <OrbSinkItem><Pressable onLongPress={onPress} onPress={onPress}><V2Glass radius={22} style={styles.bubble}><View style={styles.bubbleHead}><Text style={styles.who}>{memberName(snapshot, entry.authorId)}</Text><Text style={styles.time}>{timeLabel(entry.createdAt)}</Text></View><Text style={styles.bubbleTitle}>{entry.title}</Text><Text style={styles.noteText}>{entry.content}</Text><View style={styles.chips}>{entry.mood && <Chip dot label={moodLabels[entry.mood]} />}<Chip label={journalKindLabels[entry.kind]} /></View></V2Glass></Pressable></OrbSinkItem>; }
function JournalCard({ entry, snapshot, onPress }: { entry: JournalEntry; snapshot: ReturnType<typeof useAppData>["snapshot"]; onPress: () => void }) { return <OrbSinkItem style={styles.cardGap}><Pressable onLongPress={() => onPress()} onPress={onPress}><V2Glass radius={24} style={styles.note}><View style={styles.noteHead}><View style={styles.smallAvatar}><Text style={styles.avatarText}>{memberName(snapshot, entry.authorId)[0]}</Text></View><Text style={styles.who}>{memberName(snapshot, entry.authorId)}</Text><Text style={styles.time}>{timeLabel(entry.createdAt)}</Text></View><Text style={styles.noteTitle}>{entry.title}</Text><Text numberOfLines={3} style={styles.noteText}>{entry.content}</Text><View style={styles.chips}>{entry.mood && <Chip dot label={moodLabels[entry.mood]} />}<Chip label={journalKindLabels[entry.kind]} /></View></V2Glass></Pressable></OrbSinkItem>; }
function PlanCard({ plan, accessToken, onPress }: { plan: Plan; accessToken: string | null; onPress: () => void }) { return <OrbSinkItem style={styles.cardGap}><Pressable onPress={onPress}><V2Glass radius={26} style={styles.plan}><View style={styles.planPhoto}>{plan.imageUri ? <Image resizeMode="cover" source={privateImageSource(plan.imageUri, accessToken)} style={StyleSheet.absoluteFill} /> : <Ionicons color={colors.faint} name="map-outline" size={28} />}<View style={styles.dateBadge}><Text style={styles.dateBadgeText}>{dateLabel(plan.date)}</Text></View></View><View style={styles.planBody}><Text style={styles.planTitle}>{plan.title}</Text>{plan.description ? <Text numberOfLines={2} style={styles.planText}>{plan.description}</Text> : null}<View style={styles.chips}><Chip dot label={planKindLabels[plan.kind]} /><Chip label={planStatusLabels[plan.status]} />{plan.showInCalendar !== false && <Chip label="В календаре" />}</View></View></V2Glass></Pressable></OrbSinkItem>; }
function PlanRow({ plan, accessToken, onPress }: { plan: Plan; accessToken: string | null; onPress: () => void }) { return <OrbSinkItem><Pressable onPress={onPress}><V2Glass radius={20} style={styles.row}><View style={styles.thumb}>{plan.imageUri ? <Image resizeMode="cover" source={privateImageSource(plan.imageUri, accessToken)} style={StyleSheet.absoluteFill} /> : <Ionicons color={colors.faint} name="map-outline" size={21} />}</View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{plan.title}</Text><Text style={styles.rowMeta}>{dateLabel(plan.date)}</Text><View style={styles.tags}><Chip dot label={planKindLabels[plan.kind]} /></View></View><Ionicons color={colors.faint} name="chevron-forward" size={16} /></V2Glass></Pressable></OrbSinkItem>; }
function Chip({ label, dot = false }: { label: string; dot?: boolean }) { return <View style={styles.chip}>{dot && <View style={styles.chipDot} />}<Text style={styles.chipText}>{label}</Text></View>; }
function SectionHeader({ label, count }: { label: string; count: number }) { return <View style={styles.section}><Text style={styles.sectionText}>{label}</Text><View style={styles.count}><Text style={styles.countText}>{count}</Text></View><View style={styles.rule} /></View>; }

const styles = StyleSheet.create({
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 }, copy: { flex: 1 }, kicker: { color: colors.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" }, h1: { color: colors.text, fontFamily: "GolosText", fontSize: 29, fontWeight: "600", letterSpacing: -0.93, lineHeight: 35, marginTop: 7 }, search: { alignItems: "center", backgroundColor: "rgba(255,255,255,.12)", borderRadius: 20, height: 40, justifyContent: "center", marginTop: 5, width: 40 },
  toolRow: { alignItems: "center", flexDirection: "row", gap: 9, marginTop: 18 }, filter: { flex: 1, flexDirection: "row", gap: 2, height: 42, padding: 4 }, segment: { alignItems: "center", borderRadius: 17, flex: 1, justifyContent: "center" }, segmentOn: { backgroundColor: "rgba(255,255,255,.22)" }, segmentText: { color: colors.muted, fontFamily: "GolosText", fontSize: 12.5, fontWeight: "500" }, segmentTextOn: { color: colors.text }, add: { alignItems: "center", backgroundColor: colors.anchor, borderRadius: 21, height: 42, justifyContent: "center", width: 42 },
  rail: { marginTop: 6, paddingLeft: 42, position: "relative" }, railLine: { backgroundColor: "rgba(33,30,41,.14)", bottom: 14, left: 9, position: "absolute", top: 14, width: 1 }, timelineLabel: { marginBottom: 11, marginTop: 4, position: "relative" }, timelineLabelLater: { marginTop: 20 }, timelineLabelText: { color: colors.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" }, node: { backgroundColor: "rgba(255,255,255,.92)", borderRadius: 5, height: 10, left: -37.5, position: "absolute", top: 2, width: 10 }, nowNode: { backgroundColor: colors.anchor }, cardGap: { marginBottom: 11 },
  note: { paddingHorizontal: 16, paddingVertical: 15 }, noteHead: { alignItems: "center", flexDirection: "row", gap: 8 }, smallAvatar: { alignItems: "center", backgroundColor: "rgba(255,255,255,.30)", borderRadius: 12.5, height: 25, justifyContent: "center", width: 25 }, avatarText: { color: colors.text, fontFamily: "GolosText", fontSize: 10.5, fontWeight: "600" }, who: { color: colors.text, fontFamily: "GolosText", fontSize: 12.5, fontWeight: "600" }, time: { color: colors.faint, fontFamily: "GolosText", fontSize: 10.5 }, noteTitle: { color: colors.text, fontFamily: "GolosText", fontSize: 17, fontWeight: "600", lineHeight: 21, marginTop: 10 }, noteText: { color: colors.muted, fontFamily: "GolosText", fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  plan: { padding: 8, paddingBottom: 15 }, planPhoto: { alignItems: "center", backgroundColor: "rgba(255,255,255,.16)", borderRadius: 19, height: 104, justifyContent: "center", overflow: "hidden" }, dateBadge: { backgroundColor: "rgba(38,32,48,.42)", borderRadius: 12.5, left: 10, minHeight: 25, paddingHorizontal: 12, position: "absolute", top: 10, justifyContent: "center" }, dateBadgeText: { color: "#fff", fontFamily: "GolosText", fontSize: 11, fontWeight: "500" }, planBody: { paddingHorizontal: 10, paddingTop: 13 }, planTitle: { color: colors.text, fontFamily: "GolosText", fontSize: 19, fontWeight: "600", lineHeight: 23 }, planText: { color: colors.muted, fontFamily: "GolosText", fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  tilePair: { flexDirection: "row", gap: 10, marginBottom: 11 }, compactWrap: { flex: 1 }, compactTile: { paddingHorizontal: 14, paddingVertical: 13 }, compactKind: { color: colors.faint, fontFamily: "GolosText", fontSize: 9.5, fontWeight: "600", letterSpacing: 1.3, textTransform: "uppercase" }, compactTitle: { color: colors.text, fontFamily: "GolosText", fontSize: 14.5, fontWeight: "600", lineHeight: 19, marginTop: 8 }, compactMeta: { color: colors.faint, fontFamily: "GolosText", fontSize: 10.5, marginTop: 6 },
  chips: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }, chip: { alignItems: "center", backgroundColor: "rgba(255,255,255,.14)", borderRadius: 12.5, flexDirection: "row", gap: 6, minHeight: 25, paddingHorizontal: 10 }, chipDot: { backgroundColor: colors.muted, borderRadius: 3, height: 6, width: 6 }, chipText: { color: colors.muted, fontFamily: "GolosText", fontSize: 11.5, fontWeight: "500" },
  section: { alignItems: "center", flexDirection: "row", gap: 9, marginHorizontal: 2, marginBottom: 10, marginTop: 22 }, sectionText: { color: colors.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" }, count: { alignItems: "center", backgroundColor: "rgba(255,255,255,.22)", borderRadius: 9.5, minHeight: 19, minWidth: 19, justifyContent: "center", paddingHorizontal: 6 }, countText: { color: colors.muted, fontFamily: "GolosText", fontSize: 10.5, fontWeight: "600" }, rule: { backgroundColor: colors.hair, flex: 1, height: StyleSheet.hairlineWidth }, rows: { gap: 9 }, row: { alignItems: "center", flexDirection: "row", gap: 12, padding: 9 }, thumb: { alignItems: "center", backgroundColor: "rgba(255,255,255,.16)", borderRadius: 15, height: 62, justifyContent: "center", overflow: "hidden", width: 62 }, rowCopy: { flex: 1 }, rowTitle: { color: colors.text, fontFamily: "GolosText", fontSize: 15, fontWeight: "600", lineHeight: 19 }, rowMeta: { color: colors.muted, fontFamily: "GolosText", fontSize: 11.5, marginTop: 4 }, tags: { flexDirection: "row", marginTop: 7 },
  carousel: { alignItems: "center", flexDirection: "row", gap: 7 }, carouselArrow: { alignItems: "center", backgroundColor: "rgba(255,255,255,.14)", borderRadius: 17, height: 34, justifyContent: "center", width: 34 }, carouselArrowOff: { opacity: .32 }, featuredWrap: { flex: 1 }, featuredEmpty: { alignItems: "center", gap: 8, padding: 22 }, dots: { alignItems: "center", flexDirection: "row", gap: 5, justifyContent: "center", marginTop: 2 }, dot: { backgroundColor: "rgba(33,30,41,.16)", borderRadius: 2.5, height: 5, width: 5 }, dotOn: { backgroundColor: "rgba(33,30,41,.40)", width: 17 }, more: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 9, minHeight: 44 }, moreText: { color: colors.muted, fontFamily: "GolosText", fontSize: 12.5, fontWeight: "500" }, archive: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 22, paddingHorizontal: 17, paddingVertical: 15 }, archiveIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,.18)", borderRadius: 12, height: 38, justifyContent: "center", width: 38 }, archiveCopy: { flex: 1 }, archiveTitle: { color: colors.text, fontFamily: "GolosText", fontSize: 14.5, fontWeight: "600" }, archiveMeta: { color: colors.faint, fontFamily: "GolosText", fontSize: 11.5, lineHeight: 15, marginTop: 3 }, archiveCount: { alignItems: "center", backgroundColor: "rgba(255,255,255,.24)", borderRadius: 12, minHeight: 24, minWidth: 26, justifyContent: "center", paddingHorizontal: 9 }, archiveCountText: { color: colors.muted, fontFamily: "GolosText", fontSize: 12, fontWeight: "600" }, archiveRows: { gap: 9, marginTop: 9 },
  dayDivider: { alignItems: "center", flexDirection: "row", gap: 11, marginHorizontal: 2, marginBottom: 12, marginTop: 22 }, dayDividerText: { color: colors.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" }, thread: { gap: 11 }, message: { alignItems: "flex-start", flexDirection: "row", gap: 10, position: "relative" }, replyMessage: { marginLeft: 40 }, replyConnector: { borderBottomColor: "rgba(33,30,41,.18)", borderBottomLeftRadius: 13, borderBottomWidth: 1.5, borderLeftColor: "rgba(33,30,41,.18)", borderLeftWidth: 1.5, height: 33, left: -26, position: "absolute", top: -14, width: 24 }, avatar: { alignItems: "center", backgroundColor: "rgba(255,255,255,.32)", borderRadius: 15, height: 30, justifyContent: "center", marginTop: 3, width: 30 }, bubbleWrap: { flex: 1 }, bubble: { paddingHorizontal: 16, paddingVertical: 14 }, bubbleHead: { alignItems: "baseline", flexDirection: "row", gap: 8 }, bubbleTitle: { color: colors.text, fontFamily: "GolosText", fontSize: 16.5, fontWeight: "600", lineHeight: 21, marginTop: 8 }, empty: { alignItems: "center", padding: 20 }, emptyText: { color: colors.muted, fontFamily: "GolosText", fontSize: 12.5, textAlign: "center" },
});
