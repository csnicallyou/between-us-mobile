import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import type { AboutCategory, AboutItem, AboutOwner } from "@/domain/models";
import { useAppData } from "@/state/AppDataContext";
import { colors, spacing, typography } from "@/theme/tokens";

const owners: Record<AboutOwner, string> = { anton: "Антон", lisa: "Лиза", couple: "Мы вместе" };
const categories: Record<AboutCategory, string> = { support: "Поддержка", boundary: "Границы", preference: "Предпочтение", health: "Самочувствие", important: "Важно" };
const empty: Record<string, FormValue> = { owner: "couple", category: "important", title: "", content: "" };

export default function AboutScreen() {
  const { snapshot, addAboutItem, updateAboutItem, deleteAboutItem } = useAppData(); const [editing, setEditing] = useState<AboutItem | null>(null); const [open, setOpen] = useState(false); const [form, setForm] = useState<Record<string, FormValue>>(empty);
  const begin = (item?: AboutItem) => { setEditing(item ?? null); setForm(item ? { owner: item.owner, category: item.category, title: item.title, content: item.content } : empty); setOpen(true); };
  const save = () => { const title = String(form.title).trim(); const content = String(form.content).trim(); if (!title || !content) return Alert.alert("Заполните карточку", "Нужны название и описание."); const input = { owner: form.owner as AboutOwner, category: form.category as AboutCategory, title, content }; editing ? updateAboutItem(editing.id, input) : addAboutItem(input); setOpen(false); };
  const remove = (item: AboutItem) => Alert.alert("Удалить карточку?", item.title, [{ text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: () => deleteAboutItem(item.id) }]);
  return <Screen header={<SubpageHeader title="Важное о нас" subtitle="Поддержка, личные границы и важные особенности каждого — без догадок." />}><AppButton label="Добавить важное" onPress={() => begin()} /><View style={styles.list}>{snapshot.about.length ? snapshot.about.map((item) => <Pressable key={item.id} onLongPress={() => remove(item)} onPress={() => begin(item)}><Surface><Text style={styles.meta}>{owners[item.owner]} · {categories[item.category]}</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.copy}>{item.content}</Text></Surface></Pressable>) : <Surface><Text style={styles.empty}>Здесь можно сохранить то, что важно помнить друг о друге.</Text></Surface>}</View>
    <EntryFormModal visible={open} title={editing ? "Изменить карточку" : "Новая карточка"} values={form} onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))} onClose={() => setOpen(false)} onSave={save} fields={[{ key: "owner", label: "О ком", choices: Object.entries(owners).map(([value, label]) => ({ value, label })) }, { key: "category", label: "Категория", choices: Object.entries(categories).map(([value, label]) => ({ value, label })) }, { key: "title", label: "Название" }, { key: "content", label: "Описание", multiline: true }]} />
  </Screen>;
}
const styles = StyleSheet.create({ list: { gap: spacing.lg, marginTop: spacing.xl }, meta: { color: colors.sea, fontSize: 11, fontWeight: "700" }, title: { color: colors.ink, fontFamily: typography.display, fontSize: 24, marginTop: spacing.sm }, copy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm }, empty: { color: colors.muted, lineHeight: 21, textAlign: "center" } });
