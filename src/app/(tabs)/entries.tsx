import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { GlassPanel } from "@/components/GlassPanel";
import { Screen } from "@/components/Screen";
import { JournalSection } from "@/features/entries/JournalSection";
import { PlansSection } from "@/features/entries/PlansSection";
import { EntriesTimeline } from "@/features/redesign/entries-timeline";
import { anchor, fill, ink, rim } from "@/theme/material";

type Filter = "all" | "plans" | "journal";
const filters: { key: Filter; label: string }[] = [{ key: "all", label: "Всё" }, { key: "plans", label: "Планы" }, { key: "journal", label: "Дневник" }];

export default function EntriesScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const router = useRouter();
  const initial = params.filter === "plans" || params.filter === "journal" ? params.filter : "all";
  const [filter, setFilter] = useState<Filter>(initial);
  const [planCreateRequest, setPlanCreateRequest] = useState(0);
  const [journalCreateRequest, setJournalCreateRequest] = useState(0);

  const createPlan = () => { setFilter("plans"); setPlanCreateRequest((value) => value + 1); };
  const createJournal = () => { setFilter("journal"); setJournalCreateRequest((value) => value + 1); };
  const add = () => {
    if (filter === "plans") return createPlan();
    if (filter === "journal") return createJournal();
    Alert.alert("Что добавить?", "Выберите тип новой записи.", [
      { text: "Отмена", style: "cancel" },
      { text: "План", onPress: createPlan },
      { text: "Запись в дневник", onPress: createJournal },
    ]);
  };

  return <Screen header={<>
    <View style={styles.header}>
      <View style={styles.headings}><Text style={styles.kicker}>Планы и дневник</Text><Text style={styles.title}>Записи</Text></View>
      <Pressable accessibilityLabel="Поиск" accessibilityRole="button" onPress={() => router.push("/search" as Href)} style={({ pressed }) => [styles.tool, pressed && styles.pressed]}><Ionicons color={ink.strong} name="search-outline" size={19} /></Pressable>
    </View>
    <View style={styles.toolRow}>
      <GlassPanel radius={21} size={42} style={styles.filter}>
        {filters.map((item) => {
          const active = filter === item.key;
          return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={item.key} onPress={() => setFilter(item.key)} style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.optionPressed]}><Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{item.label}</Text></Pressable>;
        })}
      </GlassPanel>
      <Pressable accessibilityLabel="Добавить" accessibilityRole="button" onPress={add} style={({ pressed }) => [styles.add, pressed && styles.addPressed]}><Ionicons color={anchor.label} name="add" size={20} /></Pressable>
    </View>
  </>}>
    {filter === "all" ? <EntriesTimeline onOpenJournal={() => setFilter("journal")} onOpenPlans={() => setFilter("plans")} /> : null}
    {filter === "plans" ? <PlansSection createRequest={planCreateRequest} /> : null}
    {filter === "journal" ? <JournalSection createRequest={journalCreateRequest} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12, paddingTop: 4 },
  headings: { flex: 1 },
  kicker: { color: ink.faint, fontFamily: "GolosText", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: ink.strong, fontFamily: "GolosText", fontSize: 29, letterSpacing: -0.93, lineHeight: 35, marginTop: 7 },
  tool: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderColor: rim.hair, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, height: 40, justifyContent: "center", marginTop: 5, width: 40 },
  toolRow: { alignItems: "center", flexDirection: "row", gap: 9, marginTop: 18 },
  filter: { flex: 1, flexDirection: "row", gap: 2, height: 42, padding: 4 },
  option: { alignItems: "center", borderRadius: 17, flex: 1, justifyContent: "center" },
  optionActive: { backgroundColor: fill.selected, borderColor: rim.hair, borderWidth: StyleSheet.hairlineWidth },
  optionPressed: { opacity: 0.76 },
  optionLabel: { color: ink.muted, fontFamily: "GolosText", fontSize: 12.5, letterSpacing: -0.15 },
  optionLabelActive: { color: ink.strong },
  add: { alignItems: "center", backgroundColor: anchor.high, borderRadius: 21, height: 42, justifyContent: "center", width: 42, shadowColor: "#26222E", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 9 },
  addPressed: { backgroundColor: anchor.low, transform: [{ scale: 0.96 }] },
  pressed: { opacity: 0.76, transform: [{ scale: 0.96 }] },
});
