import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

interface AuthScaffoldProps extends PropsWithChildren {
  title: string;
  subtitle: string;
}

export function AuthScaffold({ children, subtitle, title }: AuthScaffoldProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.orb, styles.seaOrb]} />
        <View style={[styles.orb, styles.violetOrb]} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>МЕЖДУ НАМИ</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.xl },
  eyebrow: { color: colors.sea, fontSize: 12, fontWeight: "800", letterSpacing: 2.2 },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 34, fontWeight: "700", lineHeight: 40, marginTop: spacing.md },
  subtitle: { color: colors.muted, fontFamily: typography.body, fontSize: 16, lineHeight: 23, marginTop: spacing.sm },
  card: { backgroundColor: "rgba(255,255,255,0.90)", borderColor: colors.glassLine, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, marginTop: spacing.xl, padding: spacing.lg, ...shadow },
  orb: { borderRadius: 999, position: "absolute" },
  seaOrb: { backgroundColor: "#C9EEE8", height: 320, right: -150, top: -90, width: 320 },
  violetOrb: { backgroundColor: "#E4DFFF", bottom: -100, height: 300, left: -145, width: 300 },
});
