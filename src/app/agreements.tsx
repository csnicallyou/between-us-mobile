import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { EntryFormModal, type FormValue } from "@/components/EntryFormModal";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { InnerGlass as Surface, InnerScreen as Screen, InnerScreenHeader, InnerSectionHeader, innerStyles } from "@/components/redesign/InnerScreenChrome";
import { memberName } from "@/domain/labels";
import type { Agreement } from "@/domain/models";
import { useRemoteEntryCommand } from "@/hooks/useRemoteEntryCommand";
import { useAppData } from "@/state/AppDataContext";
import { fill, ink, materialRadius, materialType, rim } from "@/ui-v2/styleTokens";

const empty: Record<string, FormValue> = { title: "", description: "" };

export default function AgreementsScreen() {
  const { snapshot, addAgreement, updateAgreement, deleteAgreement, toggleAgreement, isHydrated, refreshRemote } = useAppData();
  const params = useLocalSearchParams<{ entryId?: string }>();
  const router = useRouter();
  const [editing, setEditing] = useState<Agreement | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, FormValue>>(empty);
  const isActive = (item: Agreement) => snapshot.members.every((member) => Boolean(item.acceptedBy[member.id]));
  const pending = snapshot.agreements.filter((item) => !isActive(item));
  const active = snapshot.agreements.filter(isActive);

  const begin = (item?: Agreement) => {
    setEditing(item ?? null);
    setForm(item ? { title: item.title, description: item.description } : empty);
    setOpen(true);
  };

  useRemoteEntryCommand({
    entryId: params.entryId,
    isHydrated,
    items: snapshot.agreements,
    missingMessage: "Возможно, она была удалена на другом устройстве.",
    missingTitle: "Договорённость не найдена",
    onConsume: () => router.setParams({ entryId: undefined }),
    onFound: begin,
    refreshRemote,
  });
  const save = () => {
    const title = String(form.title).trim();
    if (!title) return Alert.alert("Добавьте название");
    const input = { title, description: String(form.description).trim() };
    editing ? updateAgreement(editing.id, input) : addAgreement(input);
    setOpen(false);
  };
  const remove = (item: Agreement, closeEditor = false) => Alert.alert("Удалить договорённость?", item.title, [
    { text: "Отмена", style: "cancel" },
    { text: "Удалить", style: "destructive", onPress: () => { deleteAgreement(item.id); if (closeEditor) setOpen(false); } },
  ]);

  const renderAgreement = (item: Agreement) => {
    const acceptedByMe = Boolean(item.acceptedBy[snapshot.currentMemberId]);
    return (
      <SwipeToDelete key={item.id} onDelete={() => remove(item)}>
        <Pressable accessibilityRole="button" onPress={() => begin(item)}>
          <Surface style={styles.card}>
            <Text style={innerStyles.cardTitle}>{item.title}</Text>
            {item.description ? <Text style={innerStyles.body}>{item.description}</Text> : null}
            <View style={styles.people}>
              {snapshot.members.map((member) => {
                const accepted = Boolean(item.acceptedBy[member.id]);
                return (
                  <View key={member.id} style={[styles.person, accepted && styles.personAccepted]}>
                    <View style={[styles.personIcon, accepted && styles.personIconAccepted]}>
                      <Ionicons color={accepted ? "#FFFFFF" : ink.faint} name={accepted ? "checkmark" : "time-outline"} size={11} />
                    </View>
                    <Text style={styles.personText}>{memberName(snapshot, member.id)}{accepted ? "" : " ещё не подтвердил(а)"}</Text>
                  </View>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={(event) => { event.stopPropagation(); toggleAgreement(item.id); }}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            >
              <Ionicons color={ink.muted} name={acceptedByMe ? "checkmark" : "checkmark-circle-outline"} size={15} />
              <Text style={styles.actionText}>{acceptedByMe ? "Отозвать моё согласие" : "Я согласен(на)"}</Text>
            </Pressable>
          </Surface>
        </Pressable>
      </SwipeToDelete>
    );
  };

  return (
    <Screen header={<InnerScreenHeader addLabel="Новая договорённость" kicker={`${snapshot.agreements.length} правил · ${active.length} действуют`} onAdd={() => begin()} title="Договорённости" />}>
      {pending.length ? <><InnerSectionHeader count={pending.length} label="Ждёт подтверждения" /><View style={innerStyles.list}>{pending.map(renderAgreement)}</View></> : null}
      {active.length ? <><InnerSectionHeader count={active.length} label="Действуют" /><View style={innerStyles.list}>{active.map(renderAgreement)}</View></> : null}
      {!snapshot.agreements.length ? <Surface style={styles.emptyCard}><Text style={innerStyles.empty}>Добавьте первую общую договорённость.</Text></Surface> : null}
      <EntryFormModal
        fields={[{ key: "title", label: "Название", placeholder: "Коротко и конкретно" }, { key: "description", label: "Как это работает", multiline: true }]}
        onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
        onClose={() => setOpen(false)}
        onDelete={editing ? () => remove(editing, true) : undefined}
        onSave={save}
        title={editing ? "Изменить" : "Новая договорённость"}
        values={form}
        visible={open}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 18, paddingVertical: 17 },
  emptyCard: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 17 },
  people: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  person: { alignItems: "center", alignSelf: "flex-start", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: materialRadius.pill, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 7, minHeight: 29, paddingLeft: 8, paddingRight: 11 },
  personAccepted: { backgroundColor: fill.control },
  personIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.50)", borderRadius: 9, height: 17, justifyContent: "center", width: 17 },
  personIconAccepted: { backgroundColor: "#8FAE9B" },
  personText: { color: ink.muted, fontFamily: materialType.label.fontFamily, fontSize: 12, fontWeight: "500" },
  action: { alignItems: "center", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 8, height: 40, justifyContent: "center", marginTop: 14 },
  actionPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  actionText: { color: ink.muted, fontFamily: materialType.label.fontFamily, fontSize: 13.5, fontWeight: "500", letterSpacing: -0.2 },
});
