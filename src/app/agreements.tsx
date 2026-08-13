import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import { memberName } from "@/domain/labels";
import type { Agreement } from "@/domain/models";
import { useAppData } from "@/state/AppDataContext";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const empty: Record<string, FormValue> = { title: "", description: "" };
export default function AgreementsScreen() {
  const { snapshot, addAgreement, updateAgreement, deleteAgreement, toggleAgreement } = useAppData(); const [editing, setEditing] = useState<Agreement | null>(null); const [open, setOpen] = useState(false); const [form, setForm] = useState<Record<string, FormValue>>(empty);
  const begin = (item?: Agreement) => { setEditing(item ?? null); setForm(item ? { title: item.title, description: item.description } : empty); setOpen(true); };
  const save = () => { const title = String(form.title).trim(); if (!title) return Alert.alert("Добавьте название"); const input = { title, description: String(form.description).trim() }; editing ? updateAgreement(editing.id, input) : addAgreement(input); setOpen(false); };
  const remove = (item: Agreement) => Alert.alert("Удалить договорённость?", item.title, [{ text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: () => deleteAgreement(item.id) }]);
  return <Screen header={<SubpageHeader title="Договорённости" subtitle="Правила, которые вы формулируете сами и подтверждаете каждый от своего имени." />}><AppButton label="Новая договорённость" onPress={() => begin()} /><View style={styles.list}>{snapshot.agreements.length ? snapshot.agreements.map((item) => <SwipeToDelete key={item.id} onDelete={() => remove(item)}><Pressable onPress={() => begin(item)}><Surface><Text style={styles.title}>{item.title}</Text>{item.description ? <Text style={styles.copy}>{item.description}</Text> : null}<View style={styles.acceptance}>{snapshot.members.map((member) => <Text key={member.id} style={[styles.person, item.acceptedBy[member.id] && styles.accepted]}>{memberName(snapshot, member.id)} {item.acceptedBy[member.id] ? "подтвердил(а)" : "не подтвердил(а)"}</Text>)}</View><AppButton label={item.acceptedBy[snapshot.currentMemberId] ? "Отозвать моё согласие" : "Я согласен(на)"} onPress={() => toggleAgreement(item.id)} variant="secondary" /></Surface></Pressable></SwipeToDelete>) : <Surface><Text style={styles.empty}>Добавьте первую общую договорённость.</Text></Surface>}</View>
    <EntryFormModal visible={open} title={editing ? "Изменить" : "Новая договорённость"} values={form} onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))} onClose={() => setOpen(false)} onSave={save} fields={[{ key: "title", label: "Название", placeholder: "Коротко и конкретно" }, { key: "description", label: "Как это работает", multiline: true }]} />
  </Screen>;
}
const styles = StyleSheet.create({ list: { gap: spacing.lg, marginTop: spacing.xl }, title: { color: colors.ink, fontFamily: typography.display, fontSize: 24 }, copy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm }, acceptance: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginVertical: spacing.lg }, person: { backgroundColor: colors.coralSoft, borderRadius: radius.pill, color: colors.muted, overflow: "hidden", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }, accepted: { backgroundColor: colors.seaSoft, color: colors.sea }, empty: { color: colors.muted, textAlign: "center" } });
