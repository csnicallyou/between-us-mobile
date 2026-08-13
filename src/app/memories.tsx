import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import type { Memory, MemoryKind } from "@/domain/models";
import { useAppData } from "@/state/AppDataContext";
import { colors, radius, spacing, typography } from "@/theme/tokens";
import { deleteStoredImage, selectAndStoreImage } from "@/services/imageService";
import { privateImageSource } from "@/services/backendClient";
import { useAuth } from "@/state/AuthContext";

const kinds: Record<MemoryKind, string> = { anniversary: "Важная дата", trip: "Поездка", first: "Впервые", gift: "Подарок", everyday: "Обычный день", other: "Другое" };
const empty: Record<string, FormValue> = { title: "", description: "", date: new Date().toISOString().slice(0, 10), kind: "other", showInCalendar: true, imageUri: "" };

export default function MemoriesScreen() {
  const { accessToken } = useAuth();
  const { snapshot, addMemory, updateMemory, deleteMemory } = useAppData();
  const [editing, setEditing] = useState<Memory | null>(null); const [open, setOpen] = useState(false); const [form, setForm] = useState<Record<string, FormValue>>(empty); const [pickingImage, setPickingImage] = useState(false);
  const begin = (item?: Memory) => { setEditing(item ?? null); setForm(item ? { title: item.title, description: item.description, date: item.date, kind: item.kind, showInCalendar: item.showInCalendar, imageUri: item.imageUri ?? "" } : empty); setOpen(true); };
  const save = () => { const title = String(form.title).trim(); const date = String(form.date).trim(); if (!title || !date) return Alert.alert("Заполните событие", "Нужны название и дата."); const input = { title, description: String(form.description).trim(), date, kind: form.kind as MemoryKind, imageUri: String(form.imageUri).trim() || null, showInCalendar: Boolean(form.showInCalendar) }; if (editing?.imageUri && editing.imageUri !== input.imageUri) deleteStoredImage(editing.imageUri); editing ? updateMemory(editing.id, input) : addMemory(input); setOpen(false); };
  const pickImage = async () => { try { setPickingImage(true); const uri = await selectAndStoreImage("memory"); if (uri) { const currentDraft = String(form.imageUri || ""); if (currentDraft && currentDraft !== (editing?.imageUri ?? "")) deleteStoredImage(currentDraft); setForm((current) => ({ ...current, imageUri: uri })); } } catch (error) { Alert.alert("Не удалось добавить изображение", error instanceof Error && error.message === "PHOTO_PERMISSION_DENIED" ? "Разрешите доступ к фотографиям в настройках iPhone." : "Попробуйте другое изображение."); } finally { setPickingImage(false); } };
  const close = () => { const draftImage = String(form.imageUri || ""); if (draftImage && draftImage !== (editing?.imageUri ?? "")) deleteStoredImage(draftImage); setOpen(false); };
  const remove = (item: Memory) => Alert.alert("Удалить событие?", item.title, [{ text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: () => { deleteStoredImage(item.imageUri); deleteMemory(item.id); } }]);
  return <Screen header={<SubpageHeader title="Наша история" subtitle="Памятные события, фотографии и маленькие моменты, которые хочется сохранить." />}>
    <AppButton label="Добавить момент" onPress={() => begin()} />
    <View style={styles.list}>{snapshot.memories.length ? snapshot.memories.map((item) => <SwipeToDelete key={item.id} onDelete={() => remove(item)}><Pressable onPress={() => begin(item)}><Surface>
      <Text style={styles.meta}>{kinds[item.kind]} · {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${item.date}T12:00:00`))}</Text><Text style={styles.title}>{item.title}</Text>{item.imageUri ? <Image resizeMode="contain" source={privateImageSource(item.imageUri, accessToken)} style={styles.memoryImage} /> : null}{item.description ? <Text style={styles.copy}>{item.description}</Text> : null}<Text style={styles.hint}>{item.showInCalendar ? "Отображается в календаре" : "Скрыто из календаря"}</Text>
    </Surface></Pressable></SwipeToDelete>) : <Surface><Text style={styles.empty}>Добавьте первый общий момент.</Text></Surface>}</View>
    <EntryFormModal visible={open} title={editing ? "Изменить момент" : "Новый момент"} values={form} onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))} onClose={close} onSave={save} fields={[
      { key: "title", label: "Название", placeholder: "Что произошло" }, { key: "description", label: "Описание", placeholder: "Почему этот момент важен", multiline: true }, { key: "date", label: "Дата", type: "date" }, { key: "kind", label: "Тип", choices: Object.entries(kinds).map(([value, label]) => ({ value, label })) }, { key: "showInCalendar", label: "Показывать в календаре", type: "switch" },
    ]} imageUri={String(form.imageUri || "") || null} onPickImage={() => void pickImage()} pickingImage={pickingImage} />
  </Screen>;
}

const styles = StyleSheet.create({ list: { gap: spacing.lg }, meta: { color: colors.sea, fontSize: 11, fontWeight: "700" }, title: { color: colors.ink, fontFamily: typography.display, fontSize: 25, marginTop: spacing.sm }, memoryImage: { backgroundColor: "rgba(255,255,255,0.42)", borderRadius: radius.md, height: 210, marginTop: spacing.md, width: "100%" }, copy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm }, hint: { color: colors.muted, fontSize: 10, marginTop: spacing.md }, empty: { color: colors.muted, textAlign: "center" } });
