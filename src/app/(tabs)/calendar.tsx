import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GlassPanel } from "@/components/GlassPanel";
import { Screen } from "@/components/Screen";
import { anniversariesInRange } from "@/domain/anniversaries";
import { planKindLabels, planStatusLabels } from "@/domain/labels";
import { useAppData } from "@/state/AppDataContext";
import { anchor, fill, ink, surfaceShadow } from "@/theme/material";

const weekdays = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CalendarScreen() {
  const { snapshot } = useAppData();
  const router = useRouter();
  const now = new Date();
  const today = isoDate(now);
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(today);

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

  const anniversaries = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0);
    return anniversariesInRange(snapshot.relationshipStartedAt, from, to)
      .map((item) => ({ id: `anniversary-${item.date}`, title: item.label, date: item.date, source: "anniversary" as const }));
  }, [cursor, snapshot.relationshipStartedAt]);

  const calendarItems = useMemo(() => [
    ...snapshot.plans.filter((plan) => plan.date && plan.showInCalendar !== false).map((plan) => ({ id: plan.id, title: plan.title, date: plan.date!, source: "plan" as const, meta: `${planKindLabels[plan.kind]} · ${planStatusLabels[plan.status]}` })),
    ...snapshot.memories.filter((memory) => memory.showInCalendar).map((memory) => ({ id: memory.id, title: memory.title, date: memory.date, source: "memory" as const, meta: "Памятная дата" })),
    ...anniversaries.map((item) => ({ ...item, meta: "Годовщина" })),
  ], [anniversaries, snapshot.memories, snapshot.plans]);
  const selectedItems = calendarItems.filter((item) => item.date === selected);
  const weeks = useMemo(() => Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7)), [days]);
  const selectedDate = new Date(`${selected}T12:00:00`);
  const monthPrefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
  const monthItems = calendarItems.filter((item) => item.date.startsWith(monthPrefix));

  const moveMonth = (delta: number) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    setCursor(next);
    setSelected(isoDate(next));
  };

  return (
    <Screen>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerCopy}><Text style={styles.kicker}>Всё важное по датам</Text><Text style={styles.title}>Календарь</Text></View>
          <Tool icon="search-outline" label="Поиск" onPress={() => router.push("/search" as Href)} />
          <Tool primary icon="add-outline" label="Добавить план" onPress={() => router.push("/(tabs)/entries?filter=plans" as Href)} />
        </View>

        <GlassPanel radius={30} size={430} style={styles.monthPanel} tint="rgba(255,255,255,0.08)">
          <View style={styles.monthRow}>
            <Pressable accessibilityLabel="Предыдущий месяц" onPress={() => moveMonth(-1)} style={styles.arrow}><Ionicons color={ink.muted} name="chevron-back" size={18} /></Pressable>
            <Text style={styles.month}>{new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(cursor)}</Text>
            <Pressable accessibilityLabel="Следующий месяц" onPress={() => moveMonth(1)} style={styles.arrow}><Ionicons color={ink.muted} name="chevron-forward" size={18} /></Pressable>
          </View>
          <View style={styles.weekRow}>{weekdays.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}</View>
          <View style={styles.grid}>
            {weeks.map((week, weekIndex) => <View key={`week-${weekIndex}`} style={styles.dayRow}>{week.map((date) => {
              const value = isoDate(date);
              const selectedDay = value === selected;
              const todayDay = value === today;
              const outside = date.getMonth() !== cursor.getMonth();
              const items = calendarItems.filter((item) => item.date === value);
              return (
                <Pressable accessibilityLabel={new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date)} key={value} onPress={() => setSelected(value)} style={styles.dayCell}>
                  <View style={[styles.day, outside && styles.outsideDay, todayDay && styles.todayDay, selectedDay && styles.selectedDay]}>
                    <Text style={[styles.dayText, outside && styles.outsideText, selectedDay && styles.selectedDayText]}>{date.getDate()}</Text>
                  </View>
                  <View style={styles.marks}>
                    {items.some((item) => item.source === "plan") ? <View style={[styles.mark, styles.planMark]} /> : null}
                    {items.some((item) => item.source !== "plan") ? <View style={[styles.mark, styles.memoryMark]} /> : null}
                  </View>
                </Pressable>
              );
            })}</View>)}
          </View>
          <View style={styles.summary}>
            <Text style={styles.summaryText}>{monthItems.length} {monthItems.length === 1 ? "отметка" : monthItems.length > 1 && monthItems.length < 5 ? "отметки" : "отметок"} в {new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(cursor)}</Text>
            <View style={styles.legend}><Legend color="#8FAE9B" label="планы" /><Legend color="#C79C8E" label="памятные даты" /></View>
          </View>
        </GlassPanel>

        <View style={styles.agendaHeader}>
          <Text style={styles.agendaTitle}>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(selectedDate)}</Text>
          <Text style={styles.agendaWeekday}>{new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(selectedDate)}</Text>
        </View>
        <View style={styles.items}>
          {selectedItems.length ? selectedItems.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(item.source === "plan" ? "/(tabs)/entries?filter=plans" as Href : "/memories" as Href)}>
              <GlassPanel radius={22} size={86} style={styles.item} variant="clear">
                <View style={[styles.itemMark, item.source === "plan" ? styles.planItemMark : styles.memoryItemMark]} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemSource}>{item.source === "plan" ? `План · ${item.meta}` : item.meta}</Text>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                </View>
                <Ionicons color={ink.faint} name="chevron-forward" size={16} />
              </GlassPanel>
            </Pressable>
          )) : (
            <GlassPanel radius={22} size={76} style={styles.emptyPanel} variant="clear">
              <Text style={styles.empty}>На этот день пока ничего не добавлено.</Text>
            </GlassPanel>
          )}
        </View>
      </View>
    </Screen>
  );
}

function Tool({ icon, label, onPress, primary = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={[styles.tool, primary && styles.primaryTool]}><Ionicons color={primary ? anchor.label : ink.strong} name={icon} size={primary ? 22 : 19} /></Pressable>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.mark, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 4 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 9 },
  headerCopy: { flex: 1 },
  kicker: { color: ink.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: ink.strong, fontFamily: "GolosText", fontSize: 29, fontWeight: "600", letterSpacing: -0.93, lineHeight: 35, marginTop: 7 },
  tool: { alignItems: "center", backgroundColor: fill.quiet, borderColor: "rgba(255,255,255,0.46)", borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, height: 40, justifyContent: "center", marginTop: 5, width: 40, ...surfaceShadow(40) },
  primaryTool: { backgroundColor: anchor.high, borderWidth: 0 },
  monthPanel: { marginTop: 18, paddingBottom: 16, paddingHorizontal: 12, paddingTop: 15 },
  monthRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 12, paddingHorizontal: 4 },
  arrow: { alignItems: "center", backgroundColor: fill.quiet, borderColor: "rgba(255,255,255,0.46)", borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, height: 34, justifyContent: "center", width: 34 },
  month: { color: ink.strong, fontFamily: "GolosText", fontSize: 19, fontWeight: "600", letterSpacing: -0.5, textTransform: "capitalize" },
  weekRow: { flexDirection: "row" },
  weekday: { color: ink.faint, flex: 1, fontFamily: "GolosText", fontSize: 9.5, fontWeight: "600", letterSpacing: 0.75, paddingBottom: 8, paddingTop: 2, textAlign: "center", textTransform: "uppercase" },
  grid: { gap: 1 },
  dayRow: { flexDirection: "row" },
  dayCell: { alignItems: "center", flex: 1, height: 46, justifyContent: "center" },
  day: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.20)", borderColor: "rgba(255,255,255,0.24)", borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, height: 38, justifyContent: "center", width: 38 },
  outsideDay: { backgroundColor: "transparent", borderWidth: 0 },
  todayDay: { borderColor: "rgba(33,30,41,0.18)", borderWidth: 1.4 },
  selectedDay: { backgroundColor: anchor.high, borderWidth: 0, ...surfaceShadow(38) },
  dayText: { color: ink.strong, fontFamily: "GolosText", fontSize: 14.5, fontVariant: ["tabular-nums"], letterSpacing: -0.17 },
  outsideText: { color: "rgba(33,30,41,0.20)" },
  selectedDayText: { color: anchor.label },
  marks: { alignItems: "center", bottom: 0, flexDirection: "row", gap: 3, height: 4, position: "absolute" },
  mark: { borderRadius: 2, height: 4, width: 4 },
  planMark: { backgroundColor: "#8FAE9B" },
  memoryMark: { backgroundColor: "#C79C8E" },
  summary: { alignItems: "center", borderTopColor: ink.hairline, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", marginHorizontal: 9, marginTop: 12, paddingTop: 12 },
  summaryText: { color: ink.muted, fontFamily: "GolosText", fontSize: 11.5 },
  legend: { flexDirection: "row", gap: 14, marginLeft: "auto" },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  legendText: { color: ink.faint, fontFamily: "GolosText", fontSize: 11.5 },
  agendaHeader: { alignItems: "baseline", flexDirection: "row", gap: 9, marginBottom: 11, marginHorizontal: 2, marginTop: 22 },
  agendaTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 19, fontWeight: "600", letterSpacing: -0.5 },
  agendaWeekday: { color: ink.faint, fontFamily: "GolosText", fontSize: 12, marginLeft: "auto" },
  items: { gap: 10 },
  item: { alignItems: "center", flexDirection: "row", gap: 13, paddingHorizontal: 16, paddingVertical: 14 },
  itemMark: { borderRadius: 2, height: 38, width: 4 },
  planItemMark: { backgroundColor: "#8FAE9B" },
  memoryItemMark: { backgroundColor: "#C79C8E" },
  itemInfo: { flex: 1 },
  itemSource: { color: ink.faint, fontFamily: "GolosText", fontSize: 9.5, fontWeight: "600", letterSpacing: 1.3, textTransform: "uppercase" },
  itemTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 16, fontWeight: "600", letterSpacing: -0.35, lineHeight: 20, marginTop: 5 },
  emptyPanel: { alignItems: "center", paddingHorizontal: 16, paddingVertical: 20 },
  empty: { color: ink.muted, fontFamily: "GolosText", fontSize: 13, textAlign: "center" },
});
