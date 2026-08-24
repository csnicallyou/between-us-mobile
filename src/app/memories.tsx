import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { InnerGlass as Surface, InnerScreen as Screen, InnerScreenHeader, innerStyles } from "@/components/redesign/InnerScreenChrome";
import type { Memory, MemoryKind } from "@/domain/models";
import { useRemoteEntryCommand } from "@/hooks/useRemoteEntryCommand";
import { captureAndStoreImage, deleteStoredImage, selectAndStoreImage } from "@/services/imageService";
import { privateImageSource } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { fill, ink, materialRadius, materialType, rim } from "@/ui-v2/styleTokens";

const kinds: Record<MemoryKind, string> = { anniversary: "Важная дата", trip: "Поездка", first: "Впервые", gift: "Подарок", everyday: "Обычный день", other: "Другое" };
const todayIso = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const empty: Record<string, FormValue> = { title: "", description: "", date: "", kind: "other", showInCalendar: true, imageUri: "" };
const dateValue = (value: string) => new Date(`${value}T12:00:00`);
const shortDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(dateValue(value));
const monthLabel = (value: string) => {
  const result = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(dateValue(value));
  return result.charAt(0).toUpperCase() + result.slice(1);
};

function memoryRows(items: Memory[]): Memory[][] {
  const rows: Memory[][] = [];
  for (let index = 0; index < items.length;) {
    if (!items[index]!.imageUri && items[index + 1] && !items[index + 1]!.imageUri) {
      rows.push([items[index]!, items[index + 1]!]);
      index += 2;
    } else {
      rows.push([items[index]!]);
      index += 1;
    }
  }
  return rows;
}

export default function MemoriesScreen() {
  const { accessToken } = useAuth();
  const { snapshot, addMemory, updateMemory, deleteMemory, isHydrated, refreshRemote } = useAppData();
  const params = useLocalSearchParams<{ entryId?: string; compose?: string; date?: string; title?: string }>();
  const router = useRouter();
  const handledCommand = useRef("");
  const [editing, setEditing] = useState<Memory | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, FormValue>>(empty);
  const [pickingImage, setPickingImage] = useState(false);
  const sorted = useMemo(() => [...snapshot.memories].sort((a, b) => b.date.localeCompare(a.date)), [snapshot.memories]);
  const grouped = useMemo(() => {
    const result = new Map<string, Memory[]>();
    sorted.forEach((item) => {
      const key = monthLabel(item.date);
      result.set(key, [...(result.get(key) ?? []), item]);
    });
    return [...result.entries()];
  }, [sorted]);
  const firstDate = sorted.at(-1)?.date;
  const kicker = firstDate ? `${snapshot.memories.length} моментов с ${shortDate(firstDate)}` : "Сохраняйте общие моменты";

  const begin = (item?: Memory, initial?: { date?: string; title?: string; kind?: MemoryKind }) => {
    setEditing(item ?? null);
    setForm(item ? { title: item.title, description: item.description, date: item.date, kind: item.kind, showInCalendar: item.showInCalendar, imageUri: item.imageUri ?? "" } : { ...empty, date: initial?.date ?? todayIso(), title: initial?.title ?? "", kind: initial?.kind ?? "other" });
    setOpen(true);
  };

  useRemoteEntryCommand({
    entryId: params.entryId,
    isHydrated,
    items: snapshot.memories,
    missingMessage: "Возможно, оно было удалено на другом устройстве.",
    missingTitle: "Событие не найдено",
    onConsume: () => router.setParams({ entryId: undefined }),
    onFound: begin,
    refreshRemote,
  });

  useEffect(() => {
    if (!isHydrated) return;
    if (params.entryId) return;
    const command = [params.compose ?? "", params.date ?? "", params.title ?? ""].join("|");
    if (command === "||") { handledCommand.current = ""; return; }
    if (handledCommand.current === command) return;
    handledCommand.current = command;
    if (params.compose === "memory") {
      begin(undefined, { ...(params.date ? { date: params.date } : {}), ...(params.title ? { title: params.title, kind: "anniversary" as const } : {}) });
    }
    router.setParams({ compose: undefined, date: undefined, title: undefined });
  }, [isHydrated, params.compose, params.date, params.entryId, params.title, router]);
  const save = () => {
    const title = String(form.title).trim();
    const date = String(form.date).trim();
    if (!title || !date) return Alert.alert("Заполните событие", "Нужны название и дата.");
    const input = { title, description: String(form.description).trim(), date, kind: form.kind as MemoryKind, imageUri: String(form.imageUri).trim() || null, showInCalendar: Boolean(form.showInCalendar) };
    editing ? updateMemory(editing.id, input) : addMemory(input);
    setOpen(false);
  };
  const pickImage = async (source: "camera" | "library") => {
    try {
      setPickingImage(true);
      const uri = source === "camera" ? await captureAndStoreImage("memory") : await selectAndStoreImage("memory");
      if (uri) {
        const currentDraft = String(form.imageUri || "");
        if (currentDraft && currentDraft !== (editing?.imageUri ?? "")) deleteStoredImage(currentDraft);
        setForm((current) => ({ ...current, imageUri: uri }));
      }
    } catch (error) {
      const message = error instanceof Error && error.message === "PHOTO_PERMISSION_DENIED"
        ? "Разрешите доступ к фотографиям в настройках iPhone."
        : error instanceof Error && error.message === "CAMERA_PERMISSION_DENIED"
          ? "Разрешите доступ к камере в настройках iPhone."
          : "Попробуйте другое изображение.";
      Alert.alert("Не удалось добавить изображение", message);
    } finally {
      setPickingImage(false);
    }
  };
  const chooseImage = () => Alert.alert("Добавить изображение", undefined, [
    { text: "Отмена", style: "cancel" },
    { text: "Снять фото", onPress: () => void pickImage("camera") },
    { text: "Выбрать из галереи", onPress: () => void pickImage("library") },
  ]);
  const close = () => {
    const draftImage = String(form.imageUri || "");
    if (draftImage && draftImage !== (editing?.imageUri ?? "")) deleteStoredImage(draftImage);
    setOpen(false);
  };
  const remove = (item: Memory, closeEditor = false) => Alert.alert("Удалить событие?", item.title, [
    { text: "Отмена", style: "cancel" },
    { text: "Удалить", style: "destructive", onPress: () => { deleteMemory(item.id); if (closeEditor) setOpen(false); } },
  ]);

  const renderMemory = (item: Memory, compact: boolean) => (
    <SwipeToDelete key={item.id} onDelete={() => remove(item)} radius={compact ? 20 : materialRadius.card}>
      <Pressable accessibilityRole="button" onPress={() => begin(item)}>
        <Surface style={compact ? styles.compactCard : styles.card}>
          {item.imageUri && !compact ? <Image resizeMode="contain" source={privateImageSource(item.imageUri, accessToken)} style={styles.image} /> : null}
          <View style={compact ? undefined : styles.cardBody}>
            <Text style={innerStyles.meta}>{kinds[item.kind]} · {shortDate(item.date)}</Text>
            <Text style={compact ? styles.compactTitle : [innerStyles.cardTitle, styles.title]}>{item.title}</Text>
            {!compact && item.description ? <Text style={innerStyles.body}>{item.description}</Text> : null}
            {!compact && item.showInCalendar ? <View style={styles.calendarChip}><View style={styles.chipDot} /><Text style={styles.chipText}>В календаре</Text></View> : null}
          </View>
        </Surface>
      </Pressable>
    </SwipeToDelete>
  );

  return (
    <Screen header={<InnerScreenHeader addLabel="Добавить момент" kicker={kicker} onAdd={() => begin()} title="Наша история" />}>
      {grouped.length ? (
        <View style={styles.rail}>
          <View style={styles.railLine} />
          {grouped.map(([month, items]) => (
            <View key={month}>
              <View style={styles.year}><View style={styles.node} /><Text style={styles.yearText}>{month}</Text></View>
              <View style={styles.monthList}>
                {memoryRows(items).map((row) => row.length === 2 ? (
                  <View key={row.map((item) => item.id).join("-")} style={styles.pair}>
                    {row.map((item) => <View key={item.id} style={styles.pairItem}>{renderMemory(item, true)}</View>)}
                  </View>
                ) : renderMemory(row[0]!, false))}
              </View>
            </View>
          ))}
        </View>
      ) : <Surface style={styles.emptyCard}><Text style={innerStyles.empty}>Добавьте первый общий момент.</Text></Surface>}
      <EntryFormModal
        fields={[{ key: "title", label: "Название", placeholder: "Что произошло" }, { key: "description", label: "Описание", placeholder: "Почему этот момент важен", multiline: true }, { key: "date", label: "Дата", type: "date" }, { key: "kind", label: "Тип", choices: Object.entries(kinds).map(([value, label]) => ({ value, label })) }, { key: "showInCalendar", label: "Показывать в календаре", type: "switch" }]}
        imageUri={String(form.imageUri || "") || null}
        onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
        onClose={close}
        onDelete={editing ? () => remove(editing, true) : undefined}
        onPickImage={chooseImage}
        onRemoveImage={() => {
          const draftImage = String(form.imageUri || "");
          if (draftImage && draftImage !== (editing?.imageUri ?? "")) deleteStoredImage(draftImage);
          setForm((current) => ({ ...current, imageUri: "" }));
        }}
        onSave={save}
        pickingImage={pickingImage}
        title={editing ? "Изменить момент" : "Новый момент"}
        values={form}
        visible={open}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rail: { paddingLeft: 40, position: "relative" },
  railLine: { backgroundColor: "rgba(33,30,41,0.13)", bottom: 12, left: 8, position: "absolute", top: 12, width: StyleSheet.hairlineWidth },
  year: { marginBottom: 11, marginTop: 18, position: "relative" },
  yearText: { color: ink.faint, ...materialType.kicker, letterSpacing: 1.6 },
  node: { backgroundColor: "rgba(255,255,255,0.90)", borderColor: "rgba(33,30,41,0.20)", borderRadius: 5, borderWidth: StyleSheet.hairlineWidth, height: 9, left: -36.5, position: "absolute", top: 2, width: 9 },
  monthList: { gap: 11 },
  card: { padding: 8, paddingBottom: 15 },
  image: { backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, height: 118, width: "100%" },
  cardBody: { paddingHorizontal: 10, paddingTop: 13 },
  title: { marginTop: 7 },
  calendarChip: { alignItems: "center", alignSelf: "flex-start", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 6, height: 26, marginTop: 12, paddingHorizontal: 11 },
  chipDot: { backgroundColor: "#8FAE9B", borderRadius: 3, height: 6, width: 6 },
  chipText: { color: ink.muted, fontFamily: materialType.label.fontFamily, fontSize: 11.5 },
  pair: { flexDirection: "row", gap: 11 },
  pairItem: { flex: 1, minWidth: 0 },
  compactCard: { minHeight: 92, paddingHorizontal: 15, paddingVertical: 14 },
  compactTitle: { color: ink.strong, fontFamily: materialType.title.fontFamily, fontSize: 14.5, fontWeight: "600", letterSpacing: -0.3, lineHeight: 18, marginTop: 8 },
  emptyCard: { marginTop: 18 },
});
