import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { Screen } from "@/components/Screen";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { Surface } from "@/components/Surface";
import { InnerScreenHeader, InnerSectionHeader, innerStyles } from "@/components/redesign/InnerScreenChrome";
import type { ConflictEntry, ConflictTopic } from "@/domain/models";
import { useAppData } from "@/state/AppDataContext";
import { fill, ink, materialRadius, materialType, rim } from "@/theme/material";

const topics: Record<ConflictTopic, string> = { availability: "Доступность", trust: "Доверие", boundaries: "Границы", communication: "Общение", other: "Другое" };
const topicOrder = Object.keys(topics) as ConflictTopic[];
const empty: Record<string, FormValue> = { title: "", summary: "", lesson: "", date: new Date().toISOString().slice(0, 10), topic: "communication" };
const dateValue = (value: string) => new Date(`${value}T12:00:00`);
const shortDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(dateValue(value));
const monthLabel = (value: string) => {
  const result = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(dateValue(value));
  return result.charAt(0).toUpperCase() + result.slice(1);
};

export default function ConflictsScreen() {
  const { snapshot, addConflict, updateConflict, deleteConflict } = useAppData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConflictEntry | null>(null);
  const [form, setForm] = useState<Record<string, FormValue>>(empty);
  const sorted = useMemo(() => [...snapshot.conflicts].sort((a, b) => b.date.localeCompare(a.date)), [snapshot.conflicts]);
  const grouped = useMemo(() => {
    const result = new Map<string, ConflictEntry[]>();
    sorted.forEach((item) => {
      const key = monthLabel(item.date);
      result.set(key, [...(result.get(key) ?? []), item]);
    });
    return [...result.entries()];
  }, [sorted]);
  const topicCounts = topicOrder.map((topic) => ({ topic, count: snapshot.conflicts.filter((item) => item.topic === topic).length }));
  const maxTopicCount = Math.max(1, ...topicCounts.map((item) => item.count));

  const begin = (item?: ConflictEntry) => {
    setEditing(item ?? null);
    setForm(item ? { title: item.title, summary: item.summary, lesson: item.lesson, date: item.date, topic: item.topic } : empty);
    setOpen(true);
  };
  const save = () => {
    const title = String(form.title).trim();
    const summary = String(form.summary).trim();
    if (!title || !summary) return Alert.alert("Заполните эпизод", "Нужны название и краткое описание.");
    const input = { title, summary, lesson: String(form.lesson).trim(), date: String(form.date), topic: form.topic as ConflictTopic };
    editing ? updateConflict(editing.id, input) : addConflict(input);
    setOpen(false);
    setEditing(null);
    setForm(empty);
  };
  const remove = (item: ConflictEntry) => Alert.alert("Удалить эпизод?", item.title, [
    { text: "Отмена", style: "cancel" },
    { text: "Удалить", style: "destructive", onPress: () => deleteConflict(item.id) },
  ]);

  return (
    <Screen header={<InnerScreenHeader addLabel="Добавить эпизод" kicker={`${snapshot.conflicts.length} эпизодов · архив выводов`} onAdd={() => begin()} title="Разбор ссор" />}>
      {snapshot.conflicts.length ? (
        <Surface style={styles.topics}>
          <Text style={styles.topicsTitle}>О чём спорим чаще всего</Text>
          <View style={styles.bars}>
            {topicCounts.map(({ count, topic }) => (
              <View key={topic} style={styles.bar}>
                <Text style={styles.barName}>{topics[topic]}</Text>
                <View style={styles.track}><View style={[styles.fill, { width: `${(count / maxTopicCount) * 100}%` }]} /></View>
                <Text style={styles.barValue}>{count}</Text>
              </View>
            ))}
          </View>
        </Surface>
      ) : null}
      {grouped.map(([month, items]) => (
        <View key={month}>
          <InnerSectionHeader count={items.length} label={month} />
          <View style={innerStyles.list}>
            {items.map((item) => {
              const number = sorted.findIndex((entry) => entry.id === item.id) + 1;
              return (
                <SwipeToDelete key={item.id} onDelete={() => remove(item)}>
                  <Pressable accessibilityRole="button" onPress={() => begin(item)}>
                    <Surface style={styles.card}>
                      <Text style={innerStyles.meta}>{snapshot.conflicts.length - number + 1} · {topics[item.topic]} · {shortDate(item.date)}</Text>
                      <Text style={[innerStyles.cardTitle, styles.cardTitle]}>{item.title}</Text>
                      <Text style={innerStyles.body}>{item.summary}</Text>
                      {item.lesson ? <View style={styles.lesson}><Text style={styles.lessonLabel}>Что вынесли</Text><Text style={styles.lessonText}>{item.lesson}</Text></View> : null}
                    </Surface>
                  </Pressable>
                </SwipeToDelete>
              );
            })}
          </View>
        </View>
      ))}
      {!snapshot.conflicts.length ? <Surface style={styles.emptyCard}><Text style={innerStyles.empty}>Добавьте первый эпизод и зафиксируйте полезный вывод из разговора.</Text></Surface> : null}
      <EntryFormModal
        fields={[{ key: "title", label: "Название" }, { key: "date", label: "Дата", type: "date" }, { key: "topic", label: "Тема", choices: Object.entries(topics).map(([value, label]) => ({ value, label })) }, { key: "summary", label: "Что произошло", multiline: true }, { key: "lesson", label: "Что стоит изменить", multiline: true }]}
        onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSave={save}
        title={editing ? "Изменить эпизод" : "Новый эпизод"}
        values={form}
        visible={open}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topics: { marginTop: 0, paddingHorizontal: 16, paddingVertical: 15 },
  topicsTitle: { color: ink.muted, fontFamily: materialType.label.fontFamily, fontSize: 11, fontWeight: "500" },
  bars: { gap: 9, marginTop: 12 },
  bar: { alignItems: "center", flexDirection: "row", gap: 10 },
  barName: { color: ink.muted, fontFamily: materialType.label.fontFamily, fontSize: 11.5, width: 92 },
  track: { backgroundColor: fill.selected, borderColor: rim.hair, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, flex: 1, height: 7, overflow: "hidden" },
  fill: { backgroundColor: "rgba(154,143,180,0.55)", borderRadius: 4, height: "100%" },
  barValue: { color: ink.muted, fontFamily: materialType.label.fontFamily, fontSize: 11.5, fontWeight: "600", textAlign: "right", width: 20 },
  card: { paddingHorizontal: 18, paddingVertical: 16 },
  cardTitle: { marginTop: 7 },
  lesson: { backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingHorizontal: 14, paddingVertical: 12 },
  lessonLabel: { color: ink.faint, ...materialType.kicker, fontSize: 9.5, letterSpacing: 1.4 },
  lessonText: { color: ink.strong, fontFamily: materialType.label.fontFamily, fontSize: 13.5, fontWeight: "500", lineHeight: 19, marginTop: 5 },
  emptyCard: { marginTop: 18 },
});
