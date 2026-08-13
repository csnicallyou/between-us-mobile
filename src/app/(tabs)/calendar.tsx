import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { anniversariesInRange } from "@/domain/anniversaries";
import { planKindLabels, planStatusLabels } from "@/domain/labels";
import { useAppData } from "@/state/AppDataContext";
import { V2Glass, V2Screen } from "@/ui-v2";

const weekdays = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const colors = { text: "#211E29", muted: "rgba(33,30,41,.62)", faint: "rgba(33,30,41,.38)", hair: "rgba(33,30,41,.10)", anchor: "#3C3748", plan: "#8FAE9B", memory: "#C79C8E" };

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
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);

  const anniversaries = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0);
    return anniversariesInRange(snapshot.relationshipStartedAt, from, to).map((item) => ({ id: `anniversary-${item.date}`, title: item.label, date: item.date, source: "anniversary" as const, meta: "Годовщина" }));
  }, [cursor, snapshot.relationshipStartedAt]);

  const items = useMemo(() => [
    ...snapshot.plans.filter((plan) => plan.date && plan.showInCalendar !== false).map((plan) => ({ id: plan.id, title: plan.title, date: plan.date!, source: "plan" as const, meta: `${planKindLabels[plan.kind]} · ${planStatusLabels[plan.status]}` })),
    ...snapshot.memories.filter((memory) => memory.showInCalendar).map((memory) => ({ id: memory.id, title: memory.title, date: memory.date, source: "memory" as const, meta: "Памятная дата" })),
    ...anniversaries,
  ], [anniversaries, snapshot.memories, snapshot.plans]);

  const weeks = Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7));
  const selectedDate = new Date(`${selected}T12:00:00`);
  const selectedItems = items.filter((item) => item.date === selected);
  const prefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
  const monthItems = items.filter((item) => item.date.startsWith(prefix));
  const moveMonth = (delta: number) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    setCursor(next);
    setSelected(isoDate(next));
  };

  return (
    <V2Screen>
      <View style={styles.header}>
        <View style={styles.copy}><Text style={styles.kicker}>Всё важное по датам</Text><Text style={styles.h1}>Календарь</Text></View>
        <RoundButton icon="search-outline" label="Поиск" onPress={() => router.push("/search" as Href)} />
        <RoundButton dark icon="add-outline" label="Добавить план" onPress={() => router.push("/(tabs)/entries?filter=plans" as Href)} />
      </View>

      <V2Glass depth="pronounced" nativeApple radius={30} style={styles.monthCard}>
        <View style={styles.monthHeader}>
          <RoundButton compact icon="chevron-back" label="Предыдущий месяц" onPress={() => moveMonth(-1)} />
          <Text style={styles.monthName}>{new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(cursor).replace(" г.", "")}</Text>
          <RoundButton compact icon="chevron-forward" label="Следующий месяц" onPress={() => moveMonth(1)} />
        </View>
        <View style={styles.weekdays}>{weekdays.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}</View>
        <View style={styles.grid}>
          {weeks.map((week, row) => <View key={row} style={styles.week}>{week.map((date) => {
            const value = isoDate(date);
            const outside = date.getMonth() !== cursor.getMonth();
            const selectedDay = value === selected;
            const todayDay = value === today;
            const marks = items.filter((item) => item.date === value);
            return <Pressable key={value} onPress={() => setSelected(value)} style={styles.cell}>
              <View style={[styles.date, todayDay && styles.today, selectedDay && styles.selected]}><Text style={[styles.dateText, outside && styles.outside, selectedDay && styles.selectedText]}>{date.getDate()}</Text></View>
              <View style={styles.marks}>{marks.some((item) => item.source === "plan") && <View style={[styles.mark, styles.planMark]} />}{marks.some((item) => item.source !== "plan") && <View style={[styles.mark, styles.memoryMark]} />}</View>
            </Pressable>;
          })}</View>)}
        </View>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>{monthItems.length} {monthItems.length === 1 ? "отметка" : monthItems.length < 5 ? "отметки" : "отметок"} в {new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(cursor)}</Text>
          <View style={styles.legend}><Legend color={colors.plan} label="планы" /><Legend color={colors.memory} label="памятные даты" /></View>
        </View>
      </V2Glass>

      <View style={styles.agendaHeader}><Text style={styles.agendaDate}>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(selectedDate)}</Text><Text style={styles.agendaDay}>{new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(selectedDate)}</Text></View>
      <View style={styles.agendaItems}>{selectedItems.length ? selectedItems.map((item) => <Pressable key={item.id} onPress={() => router.push(item.source === "plan" ? "/(tabs)/entries?filter=plans" as Href : "/memories" as Href)}><V2Glass depth="pronounced" nativeApple radius={22} style={styles.agendaItem}><View style={[styles.itemBar, item.source === "plan" ? styles.planBar : styles.memoryBar]} /><View style={styles.itemCopy}><Text style={styles.itemMeta}>{item.source === "plan" ? `План · ${item.meta}` : item.meta}</Text><Text style={styles.itemTitle}>{item.title}</Text></View><Ionicons color={colors.faint} name="chevron-forward" size={16} /></V2Glass></Pressable>) : <V2Glass depth="pronounced" nativeApple radius={22} style={styles.empty}><Text style={styles.emptyText}>На этот день пока ничего не добавлено.</Text></V2Glass>}</View>
    </V2Screen>
  );
}

function RoundButton({ icon, label, onPress, dark = false, compact = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; dark?: boolean; compact?: boolean }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={[styles.roundButton, compact && styles.compact, dark && styles.darkButton]}><Ionicons color={dark ? "#fff" : colors.text} name={icon} size={compact ? 16 : dark ? 22 : 19} /></Pressable>;
}
function Legend({ color, label }: { color: string; label: string }) { return <View style={styles.legendItem}><View style={[styles.mark, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>; }

const styles = StyleSheet.create({
  header: { alignItems: "flex-start", flexDirection: "row", gap: 9 },
  copy: { flex: 1 },
  kicker: { color: colors.faint, fontFamily: "GolosText", fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" },
  h1: { color: colors.text, fontFamily: "GolosText", fontSize: 29, fontWeight: "600", letterSpacing: -0.93, lineHeight: 35, marginTop: 7 },
  roundButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,.12)", borderRadius: 20, height: 40, justifyContent: "center", marginTop: 5, width: 40 },
  compact: { backgroundColor: "rgba(255,255,255,.14)", borderRadius: 17, height: 34, marginTop: 0, width: 34 },
  darkButton: { backgroundColor: colors.anchor },
  monthCard: { marginTop: 18, paddingBottom: 16, paddingHorizontal: 12, paddingTop: 15 },
  monthHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 12, paddingHorizontal: 4 },
  monthName: { color: colors.text, fontFamily: "GolosText", fontSize: 19, fontWeight: "600", letterSpacing: -0.5, textTransform: "capitalize" },
  weekdays: { flexDirection: "row" },
  weekday: { color: colors.faint, flex: 1, fontFamily: "GolosText", fontSize: 9.5, fontWeight: "600", letterSpacing: 0.76, paddingBottom: 8, paddingTop: 2, textAlign: "center", textTransform: "uppercase" },
  grid: { gap: 1 },
  week: { flexDirection: "row" },
  cell: { alignItems: "center", flex: 1, height: 46, justifyContent: "center" },
  date: { alignItems: "center", borderRadius: 13, height: 38, justifyContent: "center", width: 38 },
  today: { borderColor: "rgba(33,30,41,.18)", borderWidth: 1.4 },
  selected: { backgroundColor: colors.anchor, borderWidth: 0 },
  dateText: { color: colors.text, fontFamily: "GolosText", fontSize: 14.5, fontVariant: ["tabular-nums"], fontWeight: "500", letterSpacing: -0.17 },
  outside: { color: "rgba(33,30,41,.20)" },
  selectedText: { color: "#fff" },
  marks: { alignItems: "center", bottom: 0, flexDirection: "row", gap: 3, height: 4, position: "absolute" },
  mark: { borderRadius: 2, height: 4, width: 4 }, planMark: { backgroundColor: colors.plan }, memoryMark: { backgroundColor: colors.memory },
  summary: { alignItems: "center", borderTopColor: colors.hair, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", marginHorizontal: 9, marginTop: 12, paddingTop: 12 },
  summaryText: { color: colors.muted, fontFamily: "GolosText", fontSize: 11.5 },
  legend: { flexDirection: "row", gap: 14, marginLeft: "auto" }, legendItem: { alignItems: "center", flexDirection: "row", gap: 6 }, legendText: { color: colors.faint, fontFamily: "GolosText", fontSize: 11.5 },
  agendaHeader: { alignItems: "baseline", flexDirection: "row", gap: 9, marginBottom: 11, marginHorizontal: 2, marginTop: 22 },
  agendaDate: { color: colors.text, fontFamily: "GolosText", fontSize: 19, fontWeight: "600", letterSpacing: -0.5 }, agendaDay: { color: colors.faint, fontFamily: "GolosText", fontSize: 12, marginLeft: "auto" },
  agendaItems: { gap: 10 }, agendaItem: { alignItems: "center", flexDirection: "row", gap: 13, paddingHorizontal: 16, paddingVertical: 14 }, itemBar: { borderRadius: 2, height: 38, width: 4 }, planBar: { backgroundColor: colors.plan }, memoryBar: { backgroundColor: colors.memory }, itemCopy: { flex: 1 }, itemMeta: { color: colors.faint, fontFamily: "GolosText", fontSize: 9.5, fontWeight: "600", letterSpacing: 1.3, textTransform: "uppercase" }, itemTitle: { color: colors.text, fontFamily: "GolosText", fontSize: 16, fontWeight: "600", letterSpacing: -0.35, lineHeight: 20, marginTop: 5 },
  empty: { alignItems: "center", paddingHorizontal: 16, paddingVertical: 20 }, emptyText: { color: colors.muted, fontFamily: "GolosText", fontSize: 13, textAlign: "center" },
});
