import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Surface } from "@/components/Surface";
import { journalKindLabels, memberName, moodLabels, planKindLabels, planStatusLabels } from "@/domain/labels";
import type { JournalEntry, Plan } from "@/domain/models";
import { privateImageSource } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { fill, ink, rim } from "@/theme/material";

type TimelineItem = { type: "plan"; item: Plan; date: string } | { type: "journal"; item: JournalEntry; date: string };

function formatDate(value: string | null) {
  if (!value) return "без даты";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function period(value: string) {
  const now = new Date();
  const date = new Date(value);
  if (date.toDateString() === now.toDateString()) return "Сегодня";
  const diff = now.getTime() - date.getTime();
  if (Math.abs(diff) < 7 * 86400000) return "На этой неделе";
  return "Ранее";
}

export function EntriesTimeline({ onOpenJournal, onOpenPlans }: { onOpenJournal: () => void; onOpenPlans: () => void }) {
  const { snapshot } = useAppData();
  const { accessToken } = useAuth();
  const items: TimelineItem[] = [
    ...snapshot.journal.map((item): TimelineItem => ({ type: "journal", item, date: item.createdAt })),
    ...snapshot.plans.map((item): TimelineItem => ({ type: "plan", item, date: item.date ? `${item.date}T12:00:00` : item.createdAt })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const grouped = ["Сегодня", "На этой неделе", "Ранее"].map((label) => ({ label, items: items.filter((item) => period(item.date) === label) })).filter((group) => group.items.length);

  if (!items.length) return <View style={styles.empty}><Text style={styles.emptyTitle}>Здесь появится ваша общая хронология</Text><Text style={styles.emptyText}>Планы и записи дневника собираются в одной нити.</Text></View>;

  return <View style={styles.rail}>
    <View pointerEvents="none" style={styles.railLine} />
    {grouped.map((group, groupIndex) => <View key={group.label}>
      <View style={styles.timelineLabel}><View style={[styles.node, groupIndex === 0 && styles.nodeNow]} /><Text style={styles.labelText}>{group.label}</Text></View>
      <View style={styles.group}>{group.items.map((timelineItem) => timelineItem.type === "journal" ? (
        <Pressable key={`journal-${timelineItem.item.id}`} onPress={onOpenJournal} style={({ pressed }) => pressed && styles.pressed}>
          <Surface style={styles.note}>
            <View style={styles.noteHead}><View style={styles.avatar}><Text style={styles.avatarText}>{memberName(snapshot, timelineItem.item.authorId)[0]}</Text></View><Text style={styles.kicker}>{memberName(snapshot, timelineItem.item.authorId)} · {new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(timelineItem.item.createdAt))}</Text></View>
            <Text style={styles.noteTitle}>{timelineItem.item.title}</Text>
            <Text numberOfLines={3} style={styles.noteText}>{timelineItem.item.content}</Text>
            <View style={styles.chips}>{timelineItem.item.mood ? <Chip active label={moodLabels[timelineItem.item.mood]} /> : null}<Chip label={journalKindLabels[timelineItem.item.kind]} /></View>
          </Surface>
        </Pressable>
      ) : (
        <Pressable key={`plan-${timelineItem.item.id}`} onPress={onOpenPlans} style={({ pressed }) => pressed && styles.pressed}>
          <Surface style={timelineItem.item.imageUri ? styles.plan : styles.compactPlan}>
            {timelineItem.item.imageUri ? <View style={styles.planPhoto}>
              <Image resizeMode="contain" source={privateImageSource(timelineItem.item.imageUri, accessToken)} style={StyleSheet.absoluteFill} />
              <View style={styles.dateBadge}><Text style={styles.dateBadgeText}>{formatDate(timelineItem.item.date)}</Text></View>
            </View> : null}
            <View style={timelineItem.item.imageUri ? styles.planBody : undefined}>
              <Text style={timelineItem.item.imageUri ? styles.planTitle : styles.noteTitle}>{timelineItem.item.title}</Text>
              {timelineItem.item.description ? <Text numberOfLines={3} style={styles.noteText}>{timelineItem.item.description}</Text> : null}
              <View style={styles.chips}><Chip active label={planKindLabels[timelineItem.item.kind]} /><Chip label={planStatusLabels[timelineItem.item.status]} />{timelineItem.item.showInCalendar ? <Text style={styles.calendarLabel}>в календаре</Text> : null}</View>
            </View>
          </Surface>
        </Pressable>
      ))}</View>
    </View>)}
  </View>;
}

function Chip({ active, label }: { active?: boolean; label: string }) {
  return <View style={[styles.chip, active && styles.activeChip]}>{active ? <View style={styles.chipDot} /> : null}<Text style={styles.chipText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  rail: { marginTop: 6, paddingLeft: 42, position: "relative" },
  railLine: { backgroundColor: "rgba(33,30,41,0.14)", bottom: 14, left: 9, position: "absolute", top: 14, width: StyleSheet.hairlineWidth },
  timelineLabel: { marginBottom: 11, marginTop: 20, position: "relative" },
  node: { backgroundColor: "rgba(255,255,255,0.92)", borderColor: "rgba(40,30,62,0.22)", borderRadius: 5, borderWidth: StyleSheet.hairlineWidth, height: 10, left: -37.5, position: "absolute", top: 1, width: 10 },
  nodeNow: { backgroundColor: "#26222E" },
  labelText: { color: ink.faint, fontFamily: "GolosText", fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  group: { gap: 11 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  note: { paddingHorizontal: 16, paddingVertical: 15 },
  noteHead: { alignItems: "center", flexDirection: "row", gap: 8 },
  avatar: { alignItems: "center", backgroundColor: fill.control, borderColor: rim.hair, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, height: 25, justifyContent: "center", width: 25 },
  avatarText: { color: ink.strong, fontFamily: "GolosText", fontSize: 10.5 },
  kicker: { color: ink.faint, fontFamily: "GolosText", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase" },
  noteTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 17, letterSpacing: -0.4, lineHeight: 21, marginTop: 10 },
  noteText: { color: ink.muted, fontFamily: "GolosText", fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  chips: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  chip: { alignItems: "center", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 6 },
  activeChip: { backgroundColor: fill.control },
  chipDot: { backgroundColor: "#8FAE9B", borderRadius: 3, height: 6, width: 6 },
  chipText: { color: ink.muted, fontFamily: "GolosText", fontSize: 11.5 },
  calendarLabel: { color: ink.faint, fontFamily: "GolosText", fontSize: 11.5, marginLeft: "auto" },
  plan: { padding: 8, paddingBottom: 15 },
  compactPlan: { paddingHorizontal: 16, paddingVertical: 15 },
  planPhoto: { alignItems: "center", backgroundColor: fill.quiet, borderRadius: 19, height: 104, justifyContent: "center", overflow: "hidden" },
  dateBadge: { backgroundColor: "rgba(38,32,48,0.48)", borderRadius: 13, left: 10, paddingHorizontal: 12, paddingVertical: 6, position: "absolute", top: 10 },
  dateBadgeText: { color: "rgba(255,255,255,0.98)", fontFamily: "GolosText", fontSize: 11 },
  planBody: { paddingHorizontal: 10, paddingTop: 13 },
  planTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 19, letterSpacing: -0.5, lineHeight: 23 },
  empty: { alignItems: "center", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, marginTop: 22, padding: 24 },
  emptyTitle: { color: ink.strong, fontFamily: "GolosText", fontSize: 16.5, textAlign: "center" },
  emptyText: { color: ink.muted, fontFamily: "GolosText", fontSize: 12.5, lineHeight: 18, marginTop: 6, textAlign: "center" },
});
