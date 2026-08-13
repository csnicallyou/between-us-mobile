import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { PageHeader } from "@/components/PageHeader";
import { Screen } from "@/components/Screen";
import { JournalSection } from "@/features/entries/JournalSection";
import { PlansSection } from "@/features/entries/PlansSection";
import { fill, ink, materialRadius, rim } from "@/theme/material";

type Filter = "all" | "plans" | "journal";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "Всё" },
  { key: "plans", label: "Планы" },
  { key: "journal", label: "Дневник" },
];

/**
 * «Записи» — бывшие вкладки «Планы» и «Дневник» под одной крышей.
 *
 * Слияние только навигационное: модели данных, формы и все действия внутри
 * остались ровно теми же, что были в `(tabs)/plans.tsx` и
 * `(tabs)/journal.tsx` — их тела просто переехали в `features/entries`.
 */
export default function EntriesScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const initial = params.filter === "plans" || params.filter === "journal" ? params.filter : "all";
  const [filter, setFilter] = useState<Filter>(initial);

  return (
    <Screen header={<PageHeader kicker="Планы и мысли" title="Записи" subtitle="Всё, что вы записали вдвоём — от идеи на вечер до мысли, к которой стоит вернуться." />}>
      <View style={styles.segment}>
        {filters.map((item) => {
          const active = filter === item.key;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {filter !== "journal" ? <PlansSection /> : null}
      {filter !== "plans" ? <JournalSection /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    backgroundColor: fill.quiet,
    borderColor: rim.hair,
    borderRadius: materialRadius.control,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
    padding: 4,
  },
  option: { alignItems: "center", borderRadius: materialRadius.field, flex: 1, justifyContent: "center", paddingVertical: 9 },
  optionActive: { backgroundColor: fill.controlStrong },
  optionLabel: { color: ink.muted, fontSize: 13, fontWeight: "500" },
  optionLabelActive: { color: ink.strong, fontWeight: "600" },
});
