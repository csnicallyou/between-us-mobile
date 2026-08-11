import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { privateImageSource } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { paletteForLuminance } from "@/theme/adaptivePalette";
import { colors, spacing } from "@/theme/tokens";

interface ScreenProps extends PropsWithChildren {
  header?: ReactNode;
  scroll?: boolean;
}

export function Screen({ children, header, scroll = true }: ScreenProps) {
  const { effectiveAppearance, isHydrated } = useAppData();
  const { accessToken } = useAuth();
  const customBackground = effectiveAppearance.backgroundKind !== "default" && effectiveAppearance.backgroundValue;
  const customColor = effectiveAppearance.backgroundKind === "color" ? effectiveAppearance.backgroundValue : null;
  const palette = paletteForLuminance(effectiveAppearance.backgroundLuminance);
  const adaptiveScrim = effectiveAppearance.backgroundKind === "image" ? (effectiveAppearance.backgroundLuminance < 0.36 ? "rgba(8,20,28,0.38)" : "rgba(247,250,252,0.46)") : palette.scrim;
  const content = <View style={styles.content}>{header}{children}</View>;
  if (!isHydrated) return <SafeAreaView style={[styles.safeArea, styles.loading]}><StatusBar style="dark" /><ActivityIndicator color={colors.sea} size="large" /></SafeAreaView>;
  return (
    <SafeAreaView style={[styles.safeArea, customColor ? { backgroundColor: customColor } : null]} edges={["top"]}>
      <StatusBar style={customBackground ? palette.statusBar : "dark"} />
      <View pointerEvents="none" style={styles.ambient}>
        {effectiveAppearance.backgroundKind === "image" && effectiveAppearance.backgroundValue ? <Image resizeMode="cover" source={privateImageSource(effectiveAppearance.backgroundValue, accessToken)} style={StyleSheet.absoluteFill} /> : null}
        {customBackground ? <View style={[StyleSheet.absoluteFill, { backgroundColor: adaptiveScrim }]} /> : <><View style={[styles.orb, styles.orbSea]} /><View style={[styles.orb, styles.orbViolet]} /><View style={[styles.orb, styles.orbCoral]} /></>}
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
  loading: { alignItems: "center", justifyContent: "center" },
});
