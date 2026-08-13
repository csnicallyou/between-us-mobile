import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AmbientBackground } from "@/components/AmbientBackground";
import { privateImageSource } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { paletteForLuminance } from "@/theme/adaptivePalette";
import { colors, spacing, typography } from "@/theme/tokens";

interface ScreenProps extends PropsWithChildren {
  header?: ReactNode;
  scroll?: boolean;
}

function changesLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "изменений";
  if (mod10 === 1) return "изменение";
  if (mod10 >= 2 && mod10 <= 4) return "изменения";
  return "изменений";
}

export function Screen({ children, header, scroll = true }: ScreenProps) {
  const { effectiveAppearance, isHydrated, pendingSyncCount, syncConflictMessage } = useAppData();
  const { accessToken } = useAuth();
  const customBackground = effectiveAppearance.backgroundKind !== "default" && effectiveAppearance.backgroundValue;
  const customColor = effectiveAppearance.backgroundKind === "color" ? effectiveAppearance.backgroundValue : null;
  const palette = paletteForLuminance(effectiveAppearance.backgroundLuminance);
  const adaptiveScrim = effectiveAppearance.backgroundKind === "image" ? (effectiveAppearance.backgroundLuminance < 0.36 ? "rgba(8,20,28,0.38)" : "rgba(247,250,252,0.46)") : palette.scrim;
  const content = (
    <View style={styles.content}>
      {syncConflictMessage ? <View style={[styles.banner, styles.bannerConflict]}><Text style={styles.bannerText}>{syncConflictMessage}</Text></View> : pendingSyncCount > 0 ? (
        <View style={styles.banner}><Text style={styles.bannerText}>Нет связи — {pendingSyncCount} {changesLabel(pendingSyncCount)} ждут синхронизации</Text></View>
      ) : null}
      {header}{children}
    </View>
  );
  if (!isHydrated) return <SafeAreaView style={[styles.safeArea, styles.loading]}><StatusBar style="dark" /><ActivityIndicator color={colors.sea} size="large" /></SafeAreaView>;
  return (
    <SafeAreaView style={[styles.safeArea, customColor ? { backgroundColor: customColor } : null]} edges={["top"]}>
      <StatusBar style={customBackground ? palette.statusBar : "dark"} />
      <View pointerEvents="none" style={styles.ambient}>
        {effectiveAppearance.backgroundKind === "image" && effectiveAppearance.backgroundValue ? <Image resizeMode="cover" source={privateImageSource(effectiveAppearance.backgroundValue, accessToken)} style={StyleSheet.absoluteFill} /> : null}
        {customBackground ? <View style={[StyleSheet.absoluteFill, { backgroundColor: adaptiveScrim }]} /> : <AmbientBackground />}
      </View>
      {scroll ? <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F1F6" },
  ambient: { bottom: 0, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 108 },
  loading: { alignItems: "center", justifyContent: "center" },
  banner: { backgroundColor: colors.sunSoft, borderRadius: 12, marginBottom: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bannerConflict: { backgroundColor: colors.coralSoft },
  bannerText: { color: colors.ink, fontFamily: typography.body, fontSize: 12, fontWeight: "600" },
});
