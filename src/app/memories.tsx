import { useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { InnerGlass as Surface, InnerScreen as Screen, InnerScreenHeader, innerStyles } from "@/components/redesign/InnerScreenChrome";
import type { Memory, MemoryKind } from "@/domain/models";
import { deleteStoredImage, selectAndStoreImage } from "@/services/imageService";
import { privateImageSource } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { fill, ink, materialRadius, materialType, rim } from "@/ui-v2/styleTokens";

const kinds: Record<MemoryKind, string> = { anniversary: "Важная дата", trip: "Поездка", first: "Впервые", gift: "Подарок", everyday: "Обычный день", other: "Другое" };
const empty: Record<string, FormValue> = { title: "", description: "", date: new Date().toISOString().slice(0, 10), kind: "other", showInCalendar: true, imageUri: "" };
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
  const { snapshot, addMemory, updateMemory, deleteMemory } = useAppData();
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

  const begin = (item?: Memory) => {
    setEditing(item ?? null);
    setForm(item ? { title: item.title, description: item.description, date: item.date, kind: item.kind, showInCalendar: item.showInCalendar, imageUri: item.imageUri ?? "" } : empty);
    setOpen(true);
  };
  const save = () => {
    const title = String(form.title).trim();
    const date = String(form.date).trim();
    if (!title || !date) return Alert.alert("Заполните событие", "Нужны название и дата.");
    const input = { title, description: String(form.description).trim(), date, kind: form.kind as MemoryKind, imageUri: String(form.imageUri).trim() || null, showInCalendar: Boolean(form.showInCalendar) };
    if (editing?.imageUri && editing.imageUri !== input.imageUri) deleteStoredImage(editing.imageUri);
    editing ? updateMemory(editing.id, input) : addMemory(input);
    setOpen(false);
  };
  const pickImage = async () => {
    try {
      setPickingImage(true);
      const uri = await selectAndStoreImage("memory");
      if (uri) {
        const currentDraft = String(form.imageUri || "");
        if (currentDraft && currentDraft !== (editing?.imageUri ?? "")) deleteStoredImage(currentDraft);
        setForm((current) => ({ ...current, imageUri: uri }));
      }
    } catch (error) {
      Alert.alert("Не удалось добавить изображение", error instanceof Error && error.message === "PHOTO_PERMISSION_DENIED" ? "Разрешите доступ к фотографиям в настройках iPhone." : "Попробуйте другое изображение.");
    } finally {
      setPickingImage(false);
    }
  };
  const close = () => {
    const draftImage = String(form.imageUri || "");
    if (draftImage && draftImage !== (editing?.imageUri ?? "")) deleteStoredImage(draftImage);
    setOpen(false);
  };
  const remove = (item: Memory) => Alert.alert("Удалить событие?", item.title, [
    { text: "Отмена", style: "cancel" },
    { text: "Удалить", style: "destructive", onPress: () => { deleteStoredImage(item.imageUri); deleteMemory(item.id); } },
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
        onPickImage={() => void pickImage()}
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
