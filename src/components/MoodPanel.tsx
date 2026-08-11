import { Pressable, StyleSheet, Text, View } from "react-native";
import { NativeGlassLayer } from "@/components/NativeGlassLayer";
import { memberLabels, moodLabels } from "@/domain/labels";
import type { MemberId, MemberMood, Mood } from "@/domain/models";
import { supportsNativeLiquidGlass } from "@/platform/glass";
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
          <View key={memberId} style={[styles.person, memberId === "lisa" && styles.lisaPerson, supportsNativeLiquidGlass && styles.nativeGlass]}>
            {supportsNativeLiquidGlass ? (
              <NativeGlassLayer
                cornerRadius={radius.lg}
                tintColor={memberId === "lisa" ? "rgba(104,89,172,0.11)" : "rgba(209,100,87,0.10)"}
              />
            ) : null}
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
            <Pressable key={mood} onPress={() => onChangeMood(mood)} style={[styles.option, active && styles.activeOption, supportsNativeLiquidGlass && styles.nativeGlass]}>
              {supportsNativeLiquidGlass ? (
                <NativeGlassLayer
                  cornerRadius={radius.pill}
                  interactive
                  tintColor={active ? "rgba(51,123,116,0.16)" : "rgba(255,255,255,0.08)"}
                  variant="clear"
                />
              ) : null}
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
  person: { backgroundColor: colors.coralSoft, borderColor: colors.glassLine, borderRadius: radius.lg, borderWidth: 1, flex: 1, padding: spacing.md, ...controlShadow },
  lisaPerson: { backgroundColor: colors.violetSoft },
  avatar: { alignItems: "center", backgroundColor: colors.coral, borderRadius: radius.pill, height: 34, justifyContent: "center", width: 34 },
  lisaAvatar: { backgroundColor: colors.violet },
  avatarText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  name: { color: colors.ink, fontSize: 13, fontWeight: "700", marginTop: spacing.sm },
  value: { color: colors.muted, fontSize: 12, marginTop: 2 },
  selectLabel: { color: colors.muted, fontSize: 12, marginBottom: spacing.sm, marginTop: spacing.lg },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: { backgroundColor: "rgba(255,255,255,0.86)", borderColor: colors.glassLine, borderRadius: radius.pill, borderWidth: 1, minHeight: 38, paddingHorizontal: spacing.md, paddingVertical: 10, ...controlShadow },
  activeOption: { backgroundColor: colors.seaSoft, borderColor: "rgba(51,123,116,0.48)" },
  optionText: { color: colors.muted, fontFamily: typography.body, fontSize: 12 },
  activeOptionText: { color: colors.sea, fontWeight: "700" },
  nativeGlass: { backgroundColor: "transparent", borderWidth: 0, elevation: 0 },
});
