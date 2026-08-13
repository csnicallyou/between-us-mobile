import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { PageHeader } from "@/components/PageHeader";
import { Screen } from "@/components/Screen";
import { Surface } from "@/components/Surface";
import { anniversariesInRange } from "@/domain/anniversaries";
import { useAppData } from "@/state/AppDataContext";
import { colors, radius, spacing, typography } from "@/theme/tokens";
import { useBackgroundPalette } from "@/theme/useBackgroundPalette";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CalendarScreen() {
  const { snapshot } = useAppData();
  const router = useRouter();
  const { custom, palette } = useBackgroundPalette();
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(isoDate(now));

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);

  // Годовщины не хранятся, а вычисляются от даты начала отношений: держать
  // их копиями в базе значило бы рассинхронизировать при правке даты.
  const anniversaries = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0);
    return anniversariesInRange(snapshot.relationshipStartedAt, from, to)
      .map((item) => ({ id: `anniversary-${item.date}`, title: item.label, date: item.date, source: "anniversary" as const }));
  }, [cursor, snapshot.relationshipStartedAt]);

  const calendarItems = useMemo(() => [
    ...snapshot.plans.filter((plan) => plan.date && plan.showInCalendar !== false).map((plan) => ({ id: plan.id, title: plan.title, date: plan.date!, source: "plan" as const })),
    ...snapshot.memories.filter((memory) => memory.showInCalendar).map((memory) => ({ id: memory.id, title: memory.title, date: memory.date, source: "memory" as const })),
    ...anniversaries,
  ], [anniversaries, snapshot.memories, snapshot.plans]);
  const selectedItems = calendarItems.filter((item) => item.date === selected);
  const weeks = useMemo(() => Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7)), [days]);

  return (
    <Screen header={<PageHeader kicker="Всё важное по датам" title="Календарь" subtitle="Планы, поездки и памятные события собираются в общей хронологии." />}>
      <Surface style={styles.calendar}>
        <View style={styles.monthRow}>
          <Pressable accessibilityLabel="Предыдущий месяц" onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} style={styles.arrow}><Ionicons color={colors.ink} name="chevron-back" size={22} /></Pressable>
          <Text style={styles.month}>{new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(cursor)}</Text>
          <Pressable accessibilityLabel="Следующий месяц" onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} style={styles.arrow}><Ionicons color={colors.ink} name="chevron-forward" size={22} /></Pressable>
        </View>
        <View style={styles.weekRow}>{weekdays.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}</View>
        <View style={styles.grid}>
          {weeks.map((week, weekIndex) => <View key={`week-${weekIndex}`} style={styles.dayRow}>{week.map((date) => {
            const value = isoDate(date);
            const active = value === selected;
            const outside = date.getMonth() !== cursor.getMonth();
            const hasItem = calendarItems.some((item) => item.date === value);
            return (
              <Pressable accessibilityLabel={new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date)} key={value} onPress={() => setSelected(value)} style={styles.dayCell}>
                <View style={[styles.day, active && styles.activeDay]}>
                <Text style={[styles.dayText, outside && styles.outsideText, active && styles.activeDayText]}>{date.getDate()}</Text>
                {hasItem ? <View style={styles.dot} /> : null}
                </View>
              </Pressable>
            );
          })}</View>)}
        </View>
      </Surface>
      <View style={styles.agendaHeader}><Text style={[styles.agendaTitle, custom && { color: palette.foreground }]}>Выбранный день</Text><Text style={[styles.agendaDate, custom && { color: palette.mutedForeground }]}>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(`${selected}T12:00:00`))}</Text></View>
      {selectedItems.length ? selectedItems.map((item) => <Surface key={item.id} style={styles.item}><Text style={styles.itemSource}>{item.source === "plan" ? "План" : item.source === "anniversary" ? "Годовщина" : "Событие"}</Text><Text style={styles.itemTitle}>{item.title}</Text></Surface>) : <Text style={[styles.empty, custom && { color: palette.mutedForeground }]}>На этот день пока ничего не добавлено.</Text>}
      <View style={styles.actions}><AppButton label="Добавить событие" onPress={() => router.push("/memories" as Href)} variant="secondary" style={styles.action} /><AppButton label="Новый план" onPress={() => router.push("/(tabs)/entries?filter=plans" as Href)} style={styles.action} /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  calendar: { backgroundColor: "rgba(250,252,253,0.9)", paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  monthRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  arrow: { alignItems: "center", backgroundColor: colors.surfaceStrong, borderRadius: radius.pill, height: 44, justifyContent: "center", width: 44 },
  month: { color: colors.ink, flexShrink: 1, fontFamily: typography.display, fontSize: 21, fontWeight: "600", textAlign: "center", textTransform: "capitalize" },
  weekRow: { flexDirection: "row" },
  weekday: { color: colors.muted, flex: 1, fontSize: 10, fontWeight: "600", paddingVertical: spacing.sm, textAlign: "center" },
  grid: { gap: 2 },
  dayRow: { flexDirection: "row" },
  dayCell: { alignItems: "center", flex: 1, height: 44, justifyContent: "center" },
  day: { alignItems: "center", borderRadius: radius.pill, height: 38, justifyContent: "center", width: 38 },
  activeDay: { backgroundColor: colors.sea },
  dayText: { color: colors.ink, fontSize: 15, fontVariant: ["tabular-nums"] },
  outsideText: { color: "#AAB8BC" },
  activeDayText: { color: colors.white, fontWeight: "700" },
  dot: { backgroundColor: colors.coral, borderRadius: radius.pill, height: 4, marginTop: 3, width: 4 },
  agendaHeader: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md, marginTop: spacing.xl },
  agendaTitle: { color: colors.ink, fontFamily: typography.display, fontSize: 24, fontWeight: "600" },
  agendaDate: { color: colors.muted, fontSize: 12 },
  item: { marginBottom: spacing.md },
  itemSource: { color: colors.sea, fontSize: 11, fontWeight: "700" },
  itemTitle: { color: colors.ink, fontSize: 15, fontWeight: "600", marginTop: spacing.sm },
  empty: { color: colors.muted, fontSize: 14, paddingVertical: spacing.xl, textAlign: "center" },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  action: { flex: 1 },
});
