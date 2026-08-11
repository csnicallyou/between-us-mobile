import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import type { ConflictEntry, ConflictTopic } from "@/domain/models";
import { useAppData } from "@/state/AppDataContext";
import { colors, spacing, typography } from "@/theme/tokens";

const topics: Record<ConflictTopic, string> = { availability: "Доступность", trust: "Доверие", boundaries: "Границы", communication: "Общение", other: "Другое" };
const empty: Record<string, FormValue> = { title: "", summary: "", lesson: "", date: new Date().toISOString().slice(0, 10), topic: "communication" };
export default function ConflictsScreen() {
  const { snapshot, addConflict, deleteConflict } = useAppData(); const [open, setOpen] = useState(false); const [form, setForm] = useState<Record<string, FormValue>>(empty);
  const save = () => { const title = String(form.title).trim(); const summary = String(form.summary).trim(); if (!title || !summary) return Alert.alert("Заполните эпизод", "Нужны название и краткое описание."); addConflict({ title, summary, lesson: String(form.lesson).trim(), date: String(form.date), topic: form.topic as ConflictTopic }); setOpen(false); setForm(empty); };
  const remove = (item: ConflictEntry) => Alert.alert("Удалить эпизод?", item.title, [{ text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: () => deleteConflict(item.id) }]);
  return <Screen header={<SubpageHeader title="Разбор ссор" subtitle="Архив отдельных эпизодов, повторяющихся тем и полезных выводов — не рейтинг виноватых." />}><AppButton label="Добавить эпизод" onPress={() => setOpen(true)} /><View style={styles.list}>{snapshot.conflicts.length ? snapshot.conflicts.map((item, index) => <Pressable key={item.id} onLongPress={() => remove(item)}><Surface><Text style={styles.index}>{String(index + 1).padStart(2, "0")}</Text><Text style={styles.meta}>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${item.date}T12:00:00`))} · {topics[item.topic]}</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.copy}>{item.summary}</Text>{item.lesson ? <><Text style={styles.lessonLabel}>Что вынесли</Text><Text style={styles.copy}>{item.lesson}</Text></> : null}</Surface></Pressable>) : <Surface><Text style={styles.empty}>Архив на устройстве пока пуст. Личную историю из веб-версии добавим через защищённый импорт или базу данных.</Text></Surface>}</View>
    <EntryFormModal visible={open} title="Новый эпизод" values={form} onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))} onClose={() => setOpen(false)} onSave={save} fields={[{ key: "title", label: "Название" }, { key: "date", label: "Дата", type: "date" }, { key: "topic", label: "Тема", choices: Object.entries(topics).map(([value, label]) => ({ value, label })) }, { key: "summary", label: "Что произошло", multiline: true }, { key: "lesson", label: "Что стоит изменить", multiline: true }]} />
  </Screen>;
}
const styles = StyleSheet.create({ list: { gap: spacing.lg, marginTop: spacing.xl }, index: { color: colors.violet, fontFamily: typography.display, fontSize: 28 }, meta: { color: colors.muted, fontSize: 11, marginTop: spacing.sm }, title: { color: colors.ink, fontSize: 18, fontWeight: "700", marginTop: spacing.sm }, copy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm }, lessonLabel: { color: colors.sea, fontSize: 11, fontWeight: "700", marginTop: spacing.lg }, empty: { color: colors.muted, lineHeight: 21, textAlign: "center" } });
