import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { Surface } from "@/components/Surface";
import { journalKindLabels, memberName, moodLabels } from "@/domain/labels";
import type { JournalEntry, JournalKind, Mood } from "@/domain/models";
import { useAppData } from "@/state/AppDataContext";
import { fill, ink, rim } from "@/theme/material";

const emptyForm: Record<string, FormValue> = { title: "", content: "", kind: "reflection", mood: "calm" };

function dayKey(value: string) { return value.slice(0, 10); }
function dayLabel(value: string) {
  const today = new Date();
  const date = new Date(`${value}T12:00:00`);
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (localToday === value) return "Сегодня";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}
function timeLabel(value: string) { return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }

interface JournalSectionProps { createRequest?: number }

export function JournalSection({ createRequest = 0 }: JournalSectionProps) {
  const { snapshot, addJournalEntry, updateJournalEntry, deleteJournalEntry } = useAppData();
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [form, setForm] = useState<Record<string, FormValue>>(emptyForm);
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => {
    const result = new Map<string, JournalEntry[]>();
    [...snapshot.journal].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).forEach((entry) => {
      const key = dayKey(entry.createdAt);
      result.set(key, [...(result.get(key) ?? []), entry]);
    });
    return [...result.entries()];
  }, [snapshot.journal]);

  const begin = (entry?: JournalEntry) => {
    setEditing(entry ?? null);
    setForm(entry ? { title: entry.title, content: entry.content, kind: entry.kind, mood: entry.mood ?? "neutral" } : emptyForm);
    setOpen(true);
  };
  useEffect(() => { if (createRequest > 0) begin(); }, [createRequest]);
  const save = () => {
    const title = String(form.title).trim();
    const content = String(form.content).trim();
    if (!title || !content) return Alert.alert("Заполните запись", "Нужны название и основной текст.");
    const input = { title, content, kind: form.kind as JournalKind, mood: form.mood as Mood, replyToId: editing?.replyToId ?? null };
    editing ? updateJournalEntry(editing.id, input) : addJournalEntry(input);
    setOpen(false);
  };
  const remove = (entry: JournalEntry) => Alert.alert("Удалить запись?", entry.title, [{ text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: () => deleteJournalEntry(entry.id) }]);

  return <>
    {!groups.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>Дневник пока пуст</Text><Text style={styles.emptyText}>Нажмите «плюс», чтобы оставить первую мысль друг другу.</Text></View> : groups.map(([date, entries]) => <View key={date}>
      <View style={styles.divider}><Text style={styles.dividerLabel}>{dayLabel(date)}</Text><View style={styles.rule} /></View>
      <View style={styles.thread}>{entries.map((entry) => {
        const reply = Boolean(entry.replyToId);
        return <View key={entry.id} style={[styles.message, reply && styles.reply]}>
          {reply ? <View pointerEvents="none" style={styles.replyLine} /> : null}
          <View style={[styles.avatar, entry.authorId !== snapshot.currentMemberId && styles.partnerAvatar]}><Text style={styles.avatarText}>{memberName(snapshot, entry.authorId)[0]}</Text></View>
          <View style={styles.bubbleWrap}>
            <SwipeToDelete onDelete={() => remove(entry)}>
              <Pressable onPress={() => begin(entry)} style={({ pressed }) => pressed && styles.pressed}>
                <Surface style={styles.bubble}>
                  <View style={styles.bubbleHead}><Text style={styles.who}>{memberName(snapshot, entry.authorId)}</Text><Text style={styles.time}>{timeLabel(entry.createdAt)}</Text></View>
                  <Text style={styles.title}>{entry.title}</Text>
                  <Text style={styles.content}>{entry.content}</Text>
                  <View style={styles.chips}>
                    {entry.mood ? <View style={[styles.chip, styles.activeChip]}><View style={[styles.dot, entry.authorId !== snapshot.currentMemberId && styles.partnerDot]} /><Text style={styles.chipText}>{moodLabels[entry.mood]}</Text></View> : null}
                    <View style={styles.chip}><Text style={styles.chipText}>{journalKindLabels[entry.kind]}</Text></View>
                  </View>
                </Surface>
              </Pressable>
            </SwipeToDelete>
          </View>
        </View>;
      })}</View>
    </View>)}
    <EntryFormModal fields={[
      { key: "title", label: "Заголовок", placeholder: "О чём эта запись" },
      { key: "content", label: "Текст", placeholder: "Напишите своими словами", multiline: true },
      { key: "kind", label: "Тип", choices: Object.entries(journalKindLabels).map(([value, label]) => ({ value, label })) },
      { key: "mood", label: "Настроение", choices: Object.entries(moodLabels).map(([value, label]) => ({ value, label })) },
    ]} onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))} onClose={() => setOpen(false)} onSave={save} title={editing ? "Изменить запись" : "Новая запись"} values={form} visible={open} />
  </>;
}

const styles = StyleSheet.create({
  divider: { alignItems: "center", flexDirection: "row", gap: 11, marginHorizontal: 2, marginTop: 22, marginBottom: 12 },
  dividerLabel: { color: ink.faint, fontFamily: "GolosText", fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  rule: { backgroundColor: ink.hairline, flex: 1, height: StyleSheet.hairlineWidth },
  thread: { gap: 11 },
  message: { alignItems: "flex-start", flexDirection: "row", gap: 10, position: "relative" },
  reply: { marginLeft: 40 },
  replyLine: { borderBottomColor: "rgba(33,30,41,0.18)", borderBottomLeftRadius: 13, borderBottomWidth: 1.5, borderLeftColor: "rgba(33,30,41,0.18)", borderLeftWidth: 1.5, height: 33, left: -26, position: "absolute", top: -14, width: 24 },
  avatar: { alignItems: "center", backgroundColor: fill.control, borderColor: rim.hair, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, height: 30, justifyContent: "center", marginTop: 3, width: 30 },
  partnerAvatar: { backgroundColor: "rgba(199,156,142,0.24)" },
  avatarText: { color: ink.strong, fontFamily: "GolosText", fontSize: 11.5 },
  bubbleWrap: { flex: 1, minWidth: 0 },
  bubble: { paddingHorizontal: 16, paddingVertical: 14 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  bubbleHead: { alignItems: "baseline", flexDirection: "row", gap: 8 },
  who: { color: ink.strong, fontFamily: "GolosText", fontSize: 12.5, letterSpacing: -0.15 },
  time: { color: ink.faint, fontFamily: "GolosText", fontSize: 10.5 },
  title: { color: ink.strong, fontFamily: "GolosText", fontSize: 16.5, letterSpacing: -0.4, lineHeight: 21, marginTop: 8 },
  content: { color: ink.muted, fontFamily: "GolosText", fontSize: 12.5, letterSpacing: -0.08, lineHeight: 18, marginTop: 5 },
  chips: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  chip: { alignItems: "center", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 6 },
  activeChip: { backgroundColor: fill.control },
  chipText: { color: ink.muted, fontFamily: "GolosText", fontSize: 11.5 },
  dot: { backgroundColor: "#8FAE9B", borderRadius: 3, height: 6, width: 6 },
  partnerDot: { backgroundColor: "#C79C8E" },
  empty: { alignItems: "center", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, marginTop: 22, padding: 24 },
  emptyTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 16.5 },
  emptyText: { color: ink.muted, fontFamily: "GolosText", fontSize: 12.5, lineHeight: 18, marginTop: 6, textAlign: "center" },
});
