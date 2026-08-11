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
  orb: { borderRadius: 999, opacity: 0.72, position: "absolute" },
  orbSea: { backgroundColor: "#BFEAE3", height: 310, right: -135, top: -100, width: 310 },
  orbViolet: { backgroundColor: "#DDD7FF", height: 270, left: -145, top: 315, width: 270 },
  orbCoral: { backgroundColor: "#FFD9D1", bottom: 45, height: 260, right: -135, width: 260 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
});
