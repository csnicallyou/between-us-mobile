import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { PageHeader } from "@/components/PageHeader";
import { Screen } from "@/components/Screen";
import { Surface } from "@/components/Surface";
import { journalKindLabels, memberName, moodLabels } from "@/domain/labels";
import type { JournalEntry, JournalKind, Mood } from "@/domain/models";
import { useAppData } from "@/state/AppDataContext";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const emptyForm: Record<string, FormValue> = { title: "", content: "", kind: "reflection", mood: "calm" };

export default function JournalScreen() {
  const { snapshot, addJournalEntry, updateJournalEntry, deleteJournalEntry } = useAppData();
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [form, setForm] = useState<Record<string, FormValue>>(emptyForm);
  const [open, setOpen] = useState(false);

  const begin = (entry?: JournalEntry) => {
    setEditing(entry ?? null);
    setForm(entry ? { title: entry.title, content: entry.content, kind: entry.kind, mood: entry.mood ?? "neutral" } : emptyForm);
    setOpen(true);
  };
  const save = () => {
    const title = String(form.title).trim();
    const content = String(form.content).trim();
    if (!title || !content) return Alert.alert("Заполните запись", "Нужны название и основной текст.");
    const input = { title, content, kind: form.kind as JournalKind, mood: form.mood as Mood, replyToId: editing?.replyToId ?? null };
    editing ? updateJournalEntry(editing.id, input) : addJournalEntry(input);
    setOpen(false);
  };
  const remove = (entry: JournalEntry) => Alert.alert("Удалить запись?", entry.title, [{ text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: () => deleteJournalEntry(entry.id) }]);

  return <Screen header={<PageHeader kicker="Мысли без потери" title="Общий дневник" subtitle="Благодарности, чувства, вопросы и мысли, к которым можно вернуться вместе." />}>
    <AppButton label="Новая запись" onPress={() => begin()} />
    <View style={styles.feed}>{snapshot.journal.map((entry) => <Pressable key={entry.id} onLongPress={() => remove(entry)} onPress={() => begin(entry)}>
      <Surface>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, entry.authorId !== snapshot.currentMemberId && styles.partnerAvatar]}><Text style={styles.avatarText}>{memberName(snapshot, entry.authorId)[0]}</Text></View>
          <View style={styles.authorCopy}><Text style={styles.author}>{memberName(snapshot, entry.authorId)}</Text><Text style={styles.meta}>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(entry.createdAt))}</Text></View>
          {entry.mood ? <Text style={styles.mood}>{moodLabels[entry.mood]}</Text> : null}
        </View>
        <Text style={styles.kind}>{journalKindLabels[entry.kind]}</Text><Text style={styles.title}>{entry.title}</Text><Text style={styles.content}>{entry.content}</Text>
        <Text style={styles.hint}>Нажмите для изменения, удерживайте для удаления</Text>
      </Surface>
    </Pressable>)}</View>
    <Surface style={styles.prompt}><Text style={styles.promptTitle}>Вопрос друг другу</Text><Text style={styles.promptText}>Что сегодня помогло тебе почувствовать мою любовь?</Text><AppButton label="Ответить" onPress={() => begin()} variant="secondary" /></Surface>
    <EntryFormModal
      fields={[
        { key: "title", label: "Заголовок", placeholder: "О чём эта запись" },
        { key: "content", label: "Текст", placeholder: "Напишите своими словами", multiline: true },
        { key: "kind", label: "Тип", choices: Object.entries(journalKindLabels).map(([value, label]) => ({ value, label })) },
        { key: "mood", label: "Настроение", choices: Object.entries(moodLabels).map(([value, label]) => ({ value, label })) },
      ]}
      onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))} onClose={() => setOpen(false)} onSave={save}
      title={editing ? "Изменить запись" : "Новая запись"} values={form} visible={open}
    />
  </Screen>;
}

const styles = StyleSheet.create({
  feed: { gap: spacing.lg, marginTop: spacing.xl }, authorRow: { alignItems: "center", flexDirection: "row" }, avatar: { alignItems: "center", backgroundColor: colors.coral, borderRadius: radius.pill, height: 38, justifyContent: "center", width: 38 }, partnerAvatar: { backgroundColor: colors.violet }, avatarText: { color: colors.white, fontWeight: "700" },
  authorCopy: { flex: 1, marginLeft: spacing.md }, author: { color: colors.ink, fontSize: 14, fontWeight: "700" }, meta: { color: colors.muted, fontSize: 11, marginTop: 2 }, mood: { backgroundColor: colors.seaSoft, borderRadius: radius.pill, color: colors.sea, fontSize: 11, overflow: "hidden", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  kind: { color: colors.sea, fontSize: 11, fontWeight: "700", marginTop: spacing.lg }, title: { color: colors.ink, fontFamily: typography.display, fontSize: 28, lineHeight: 32, marginTop: spacing.sm }, content: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: spacing.md }, hint: { color: colors.muted, fontSize: 10, marginTop: spacing.md },
  prompt: { backgroundColor: colors.violetSoft, borderColor: colors.glassLine, marginTop: spacing.xl }, promptTitle: { color: colors.violet, fontSize: 12, fontWeight: "700" }, promptText: { color: colors.ink, fontFamily: typography.display, fontSize: 27, lineHeight: 31, marginBottom: spacing.xl, marginTop: spacing.md },
});
