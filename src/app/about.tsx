import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { InnerGlass as Surface, InnerScreen as Screen, InnerScreenHeader, InnerSectionHeader, innerStyles } from "@/components/redesign/InnerScreenChrome";
import { memberName } from "@/domain/labels";
import type { AboutCategory, AboutItem, AboutOwner } from "@/domain/models";
import { useRemoteEntryCommand } from "@/hooks/useRemoteEntryCommand";
import { useAppData } from "@/state/AppDataContext";
import { fill, ink, materialType, rim, surfaceShadow } from "@/ui-v2/styleTokens";

const categories: Record<AboutCategory, string> = { support: "Поддержка", boundary: "Границы", preference: "Предпочтения", health: "Самочувствие", important: "Важное" };
const categoryOrder = Object.keys(categories) as AboutCategory[];
const categoryColors: Record<AboutCategory, string> = { support: "#8FAE9B", boundary: "#C79C8E", preference: "#9A8FB4", health: "#8FA8B4", important: "#B29A69" };
const empty: Record<string, FormValue> = { owner: "couple", category: "important", title: "", content: "" };

export default function AboutScreen() {
  const { snapshot, addAboutItem, updateAboutItem, deleteAboutItem, isHydrated, refreshRemote } = useAppData();
  const params = useLocalSearchParams<{ entryId?: string }>();
  const router = useRouter();
  const [editing, setEditing] = useState<AboutItem | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, FormValue>>(empty);
  const [selectedOwner, setSelectedOwner] = useState<AboutOwner>("couple");
  const ownerLabel = (owner: AboutOwner) => owner === "couple" ? "Мы вместе" : memberName(snapshot, owner);
  const ownerChoices = [{ value: "couple", label: "Мы вместе" }, ...snapshot.members.map((member) => ({ value: member.id, label: member.displayName }))];
  const visibleItems = snapshot.about.filter((item) => item.owner === selectedOwner);

  const begin = (item?: AboutItem) => {
    setEditing(item ?? null);
    setForm(item ? { owner: item.owner, category: item.category, title: item.title, content: item.content } : { ...empty, owner: selectedOwner });
    setOpen(true);
  };

  useRemoteEntryCommand({
    entryId: params.entryId,
    isHydrated,
    items: snapshot.about,
    missingMessage: "Возможно, она была удалена на другом устройстве.",
    missingTitle: "Карточка не найдена",
    onConsume: () => router.setParams({ entryId: undefined }),
    onFound: (item) => { setSelectedOwner(item.owner); begin(item); },
    refreshRemote,
  });
  const save = () => {
    const title = String(form.title).trim();
    const content = String(form.content).trim();
    if (!title || !content) return Alert.alert("Заполните карточку", "Нужны название и описание.");
    const input = { owner: form.owner as AboutOwner, category: form.category as AboutCategory, title, content };
    editing ? updateAboutItem(editing.id, input) : addAboutItem(input);
    setOpen(false);
  };
  const remove = (item: AboutItem, closeEditor = false) => Alert.alert("Удалить карточку?", item.title, [
    { text: "Отмена", style: "cancel" },
    { text: "Удалить", style: "destructive", onPress: () => { deleteAboutItem(item.id); if (closeEditor) setOpen(false); } },
  ]);

  return (
    <Screen header={<InnerScreenHeader addLabel="Добавить важное" kicker="Чтобы не догадываться" onAdd={() => begin()} title="Важное о нас" />}>
      <Surface style={styles.segmentSurface}>
        <View style={styles.segment}>
          {ownerChoices.map((owner) => {
            const selected = owner.value === selectedOwner;
            return (
              <Pressable key={owner.value} onPress={() => setSelectedOwner(owner.value as AboutOwner)} style={({ pressed }) => [styles.segmentItem, selected && styles.segmentSelected, pressed && styles.pressed]}>
                <Text numberOfLines={1} style={[styles.segmentText, selected && styles.segmentTextSelected]}>{owner.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Surface>
      {categoryOrder.map((category) => {
        const items = visibleItems.filter((item) => item.category === category);
        if (!items.length) return null;
        return (
          <View key={category}>
            <InnerSectionHeader count={items.length} label={categories[category]} />
            <View style={innerStyles.list}>
              {items.map((item) => (
                <SwipeToDelete key={item.id} onDelete={() => remove(item)}>
                  <Pressable accessibilityRole="button" onPress={() => begin(item)}>
                    <Surface style={styles.card}>
                      <View style={styles.metaRow}>
                        <View style={styles.categoryChip}><View style={[styles.categoryDot, { backgroundColor: categoryColors[item.category] }]} /><Text style={styles.categoryText}>{categories[item.category]}</Text></View>
                        <Text style={styles.owner}>{ownerLabel(item.owner)}</Text>
                      </View>
                      <Text style={[innerStyles.cardTitle, styles.title]}>{item.title}</Text>
                      <Text style={innerStyles.body}>{item.content}</Text>
                    </Surface>
                  </Pressable>
                </SwipeToDelete>
              ))}
            </View>
          </View>
        );
      })}
      {!visibleItems.length ? <Surface style={styles.emptyCard}><Text style={innerStyles.empty}>Для раздела «{ownerLabel(selectedOwner)}» пока ничего не добавлено.</Text></Surface> : null}
      <EntryFormModal
        fields={[{ key: "owner", label: "О ком", choices: ownerChoices }, { key: "category", label: "Категория", choices: Object.entries(categories).map(([value, label]) => ({ value, label })) }, { key: "title", label: "Название" }, { key: "content", label: "Описание", multiline: true }]}
        onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
        onClose={() => setOpen(false)}
        onDelete={editing ? () => remove(editing, true) : undefined}
        onSave={save}
        title={editing ? "Изменить карточку" : "Новая карточка"}
        values={form}
        visible={open}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segmentSurface: { borderRadius: 21, height: 42, padding: 4 },
  segment: { flex: 1, flexDirection: "row", gap: 2 },
  segmentItem: { alignItems: "center", borderRadius: 17, flex: 1, justifyContent: "center", minWidth: 0 },
  segmentSelected: { backgroundColor: fill.selected, borderColor: rim.hair, borderWidth: StyleSheet.hairlineWidth, ...surfaceShadow(34) },
  segmentText: { color: ink.muted, fontFamily: materialType.label.fontFamily, fontSize: 12.5, fontWeight: "500" },
  segmentTextSelected: { color: ink.strong },
  pressed: { opacity: 0.72 },
  card: { paddingHorizontal: 17, paddingVertical: 15 },
  metaRow: { alignItems: "center", flexDirection: "row", gap: 9 },
  categoryChip: { alignItems: "center", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 6, height: 22, paddingHorizontal: 10 },
  categoryDot: { borderRadius: 3, height: 5, width: 5 },
  categoryText: { color: ink.muted, fontFamily: materialType.label.fontFamily, fontSize: 10.5, fontWeight: "500" },
  owner: { color: ink.faint, fontFamily: materialType.label.fontFamily, fontSize: 10.5, marginLeft: "auto" },
  title: { marginTop: 11 },
  emptyCard: { marginTop: 22 },
});
