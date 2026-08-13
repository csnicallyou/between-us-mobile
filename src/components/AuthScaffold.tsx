import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AmbientBackground } from "@/components/AmbientBackground";
import { GlassPanel } from "@/components/GlassPanel";
import { ink, materialRadius, materialSpacing, rim } from "@/theme/material";
import { typography } from "@/theme/tokens";

interface AuthScaffoldProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  /** Шаг онбординга 1..3. Без него индикатор не показывается. */
  step?: 1 | 2 | 3;
}

/**
 * Оболочка входа и онбординга — единственная часть приложения без нижней
 * панели, поэтому карточка стоит по центру экрана.
 *
 * Знак — два полупрозрачных круга внахлёст: пересечение плотнее, потому
 * что заливка удваивается. Это буквально «между нами» — общее у двоих.
 * Знак намеренно не стеклянный: на 46 px размытие даёт тёмную кромку по
 * краю, а удвоение заливки читается и без него.
 */
export function AuthScaffold({ children, step, subtitle, title }: AuthScaffoldProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <AmbientBackground />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.mark}>
            <View style={[styles.markCircle, styles.markLeft]} />
            <View style={[styles.markCircle, styles.markRight]} />
          </View>
          <Text style={styles.kicker}>Между нами</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <GlassPanel radius={materialRadius.panel} size={260} style={styles.card}>
            <View style={styles.cardBody}>{children}</View>
          </GlassPanel>
          {step ? (
            <View style={styles.steps}>
              {[1, 2, 3].map((index) => (
                <View key={index} style={[styles.step, index === step && styles.stepActive]} />
              ))}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#F4F1F6", flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  mark: { alignSelf: "center", height: 46, marginBottom: 24, width: 70 },
  markCircle: {
    backgroundColor: "rgba(255,255,255,0.34)",
    borderColor: rim.hair,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    height: 46,
    position: "absolute",
    top: 0,
    width: 46,
  },
  markLeft: { left: 0 },
  markRight: { right: 0 },
  kicker: { color: ink.faint, fontFamily: typography.body, fontSize: 10, letterSpacing: 1.9, textAlign: "center", textTransform: "uppercase" },
  title: { color: ink.strong, fontFamily: typography.display, fontSize: 28, letterSpacing: -0.9, lineHeight: 33, marginTop: 9, textAlign: "center" },
  subtitle: { color: ink.muted, fontFamily: typography.body, fontSize: 14.5, lineHeight: 21, marginTop: 11, textAlign: "center" },
  card: { gap: materialSpacing.md, marginTop: 26, padding: 18 },
  cardBody: { gap: materialSpacing.md },
  steps: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", marginTop: materialSpacing.xl },
  step: { backgroundColor: "rgba(33,30,41,0.14)", borderRadius: 3, height: 6, width: 6 },
  stepActive: { backgroundColor: "rgba(33,30,41,0.34)", width: 20 },
});
