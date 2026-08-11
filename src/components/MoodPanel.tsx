import { Pressable, StyleSheet, Text, View } from "react-native";
import { memberLabels, moodLabels } from "@/domain/labels";
import type { MemberId, MemberMood, Mood } from "@/domain/models";
import { colors, controlShadow, radius, spacing, typography } from "@/theme/tokens";

interface MoodPanelProps {
  currentMemberId: MemberId;
  moods: Record<MemberId, MemberMood>;
  onChangeMood: (mood: Mood) => void;
}

const quickMoods: Mood[] = ["calm", "happy", "tender", "anxious", "tired"];

export function MoodPanel({ currentMemberId, moods, onChangeMood }: MoodPanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>Как мы сейчас</Text>
        <Text style={styles.caption}>Каждый меняет только своё состояние</Text>
      </View>
      <View style={styles.people}>
        {(["anton", "lisa"] as const).map((memberId) => (
          <View key={memberId} style={[styles.person, memberId === "lisa" && styles.lisaPerson]}>
            <View style={[styles.avatar, memberId === "lisa" && styles.lisaAvatar]}><Text style={styles.avatarText}>{memberLabels[memberId][0]}</Text></View>
            <Text style={styles.name}>{memberLabels[memberId]}</Text>
            <Text style={styles.value}>{moods[memberId].mood ? moodLabels[moods[memberId].mood] : "Не выбрано"}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.selectLabel}>Моё настроение</Text>
      <View style={styles.options}>
        {quickMoods.map((mood) => {
          const active = moods[currentMemberId].mood === mood;
          return (
            <Pressable key={mood} onPress={() => onChangeMood(mood)} style={[styles.option, active && styles.activeOption]}>
              <Text style={[styles.optionText, active && styles.activeOptionText]}>{moodLabels[mood]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  heading: { marginBottom: spacing.md },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 26 },
  caption: { color: colors.muted, fontSize: 12, marginTop: 2 },
  people: { flexDirection: "row", gap: spacing.md },
  person: { backgroundColor: colors.coralSoft, borderColor: "rgba(255,255,255,0.82)", borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, flex: 1, padding: spacing.md, ...controlShadow },
  lisaPerson: { backgroundColor: colors.violetSoft },
  avatar: { alignItems: "center", backgroundColor: colors.coral, borderRadius: radius.pill, height: 34, justifyContent: "center", width: 34 },
  lisaAvatar: { backgroundColor: colors.violet },
  avatarText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  name: { color: colors.ink, fontSize: 13, fontWeight: "700", marginTop: spacing.sm },
  value: { color: colors.muted, fontSize: 12, marginTop: 2 },
  selectLabel: { color: colors.muted, fontSize: 12, marginBottom: spacing.sm, marginTop: spacing.lg },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: { backgroundColor: "rgba(255,255,255,0.72)", borderColor: colors.glassLine, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, minHeight: 38, paddingHorizontal: spacing.md, paddingVertical: 10, ...controlShadow },
  activeOption: { backgroundColor: colors.seaSoft, borderColor: "rgba(51,123,116,0.34)" },
  optionText: { color: colors.muted, fontFamily: typography.body, fontSize: 12 },
  activeOptionText: { color: colors.sea, fontWeight: "700" },
});
