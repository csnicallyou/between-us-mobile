import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme/tokens";

interface ScreenProps extends PropsWithChildren {
  header?: ReactNode;
  scroll?: boolean;
}

export function Screen({ children, header, scroll = true }: ScreenProps) {
  const content = <View style={styles.content}>{header}{children}</View>;
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View pointerEvents="none" style={styles.ambient}>
        <View style={[styles.orb, styles.orbSea]} />
        <View style={[styles.orb, styles.orbViolet]} />
        <View style={[styles.orb, styles.orbCoral]} />
      </View>
      {scroll ? <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  ambient: { bottom: 0, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0 },
  orb: { borderRadius: 999, opacity: 0.52, position: "absolute" },
  orbSea: { backgroundColor: "#D9F2EE", height: 280, right: -130, top: -90, width: 280 },
  orbViolet: { backgroundColor: "#ECE8FF", height: 230, left: -120, top: 330, width: 230 },
  orbCoral: { backgroundColor: "#FFE8E3", bottom: 80, height: 220, right: -120, width: 220 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
});
