import { useRef, type PropsWithChildren, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { V2Backdrop, V2Glass, v2 } from "@/ui-v2";
import { fill, ink, materialRadius, materialType, rim } from "@/ui-v2/styleTokens";

interface AuthScaffoldProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  footer?: ReactNode;
  step?: 1 | 2 | 3;
}

export function AuthScaffold({ children, footer, step, subtitle, title }: AuthScaffoldProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <V2Backdrop />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.mark}>
            <View style={[styles.markCircle, styles.markLeft]} />
            <View style={[styles.markCircle, styles.markRight]} />
          </View>
          <Text style={styles.kicker}>Между нами</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <V2Glass radius={28} style={styles.card}>
            <View style={styles.cardBody}>{children}</View>
          </V2Glass>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
          {step ? (
            <View accessibilityLabel={`Шаг ${step} из 3`} style={styles.steps}>
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

export function AuthField({ multiline, style, ...props }: TextInputProps) {
  return <TextInput multiline={multiline} placeholderTextColor={ink.faint} selectionColor={ink.muted} style={[authStyles.field, multiline && authStyles.fieldTall, style]} {...props} />;
}

export function AuthError({ message }: { message: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={authStyles.errorBox}>
      <Ionicons color="#A9613F" name="alert-circle-outline" size={16} style={authStyles.errorIcon} />
      <Text style={authStyles.errorText}>{message}</Text>
    </View>
  );
}

export function AuthInfo({ message }: { message: string }) {
  return <Text accessibilityLiveRegion="polite" style={authStyles.info}>{message}</Text>;
}

export function AuthLink({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [authStyles.linkButton, pressed && authStyles.pressed]}>
      <Text style={authStyles.link}>{children}</Text>
    </Pressable>
  );
}

export function AuthButton({ disabled = false, label, onPress, style, variant = "primary" }: { disabled?: boolean; label: string; onPress: () => void; style?: object; variant?: "primary" | "secondary" }) {
  const content = (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [authStyles.actionPress, pressed && authStyles.actionPressed, disabled && authStyles.actionDisabled]}>
      <Text style={[authStyles.actionLabel, variant === "secondary" && authStyles.actionLabelSecondary]}>{label}</Text>
    </Pressable>
  );
  if (variant === "secondary") return <V2Glass radius={25} style={[authStyles.action, style]}>{content}</V2Glass>;
  return <View style={[authStyles.action, authStyles.actionPrimary, style]}>{content}</View>;
}

export function AuthCodeInput({ code, onChange }: { code: string; onChange: (value: string) => void }) {
  const inputRef = useRef<TextInput>(null);
  return (
    <Pressable accessibilityLabel="Шестизначный код" onPress={() => inputRef.current?.focus()} style={authStyles.codeRow}>
      {Array.from({ length: 6 }, (_, index) => {
        const value = code[index];
        const next = index === code.length;
        return (
          <View key={index} style={[authStyles.codeCell, value && authStyles.codeCellFilled]}>
            <Text style={authStyles.codeDigit}>{value ?? ""}</Text>
            {next ? <View style={authStyles.caret} /> : null}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        autoFocus
        caretHidden
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={(value) => onChange(value.replace(/\D/g, ""))}
        style={authStyles.hiddenCodeInput}
        value={code}
      />
    </Pressable>
  );
}

export const authStyles = StyleSheet.create({
  field: {
    backgroundColor: "rgba(255,255,255,0.30)",
    borderColor: "rgba(255,255,255,0.46)",
    borderRadius: materialRadius.field,
    borderWidth: StyleSheet.hairlineWidth,
    color: ink.strong,
    fontFamily: materialType.body.fontFamily,
    fontSize: 15,
    letterSpacing: -0.15,
    minHeight: 50,
    paddingHorizontal: 15,
  },
  fieldTall: { minHeight: 78, paddingTop: 14, textAlignVertical: "top" },
  label: { ...materialType.label, color: ink.strong, marginBottom: -2, marginTop: 5 },
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: "rgba(199,124,96,0.12)",
    borderColor: "rgba(199,124,96,0.22)",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  errorIcon: { marginTop: 1 },
  errorText: { color: "#8E5232", flex: 1, fontFamily: materialType.body.fontFamily, fontSize: 12.5, lineHeight: 18 },
  info: { color: "#337B74", fontFamily: materialType.body.fontFamily, fontSize: 12.5, lineHeight: 18, textAlign: "center" },
  linkButton: { alignItems: "center", justifyContent: "center", minHeight: 38, paddingHorizontal: 8 },
  link: { color: ink.muted, fontFamily: materialType.label.fontFamily, fontSize: 13.5, fontWeight: "500", letterSpacing: -0.14, textAlign: "center" },
  pressed: { opacity: 0.58 },
  codeRow: { flexDirection: "row", gap: 8, position: "relative" },
  codeCell: {
    alignItems: "center",
    backgroundColor: fill.control,
    borderColor: rim.hair,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    height: 56,
    justifyContent: "center",
  },
  codeCellFilled: { backgroundColor: fill.controlStrong },
  codeDigit: { color: ink.strong, fontFamily: materialType.title.fontFamily, fontSize: 22, fontWeight: "600" },
  caret: { backgroundColor: "rgba(33,30,41,0.44)", borderRadius: 1, height: 22, position: "absolute", width: 1.5 },
  hiddenCodeInput: { height: 1, opacity: 0, position: "absolute", width: 1 },
  action: { borderRadius: 25, height: 50, marginTop: 6, overflow: "hidden" },
  actionPrimary: { backgroundColor: v2.color.anchorHi, shadowColor: "#3C3254", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.24, shadowRadius: 11 },
  actionPress: { alignItems: "center", height: 50, justifyContent: "center", paddingHorizontal: 18 },
  actionPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  actionDisabled: { opacity: 0.48 },
  actionLabel: { color: "#F7F5FA", fontFamily: v2.font.family, fontSize: 15, fontWeight: "600", letterSpacing: -0.24 },
  actionLabelSecondary: { color: v2.color.ink },
});

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#EEF1F5", flex: 1 },
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
    shadowColor: "#3C3254",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    top: 0,
    width: 46,
  },
  markLeft: { left: 0 },
  markRight: { right: 0 },
  kicker: { ...materialType.kicker, color: ink.faint, textAlign: "center" },
  title: { ...v2.font.h1, color: v2.color.ink, marginTop: 9, textAlign: "center" },
  subtitle: { color: ink.muted, fontFamily: materialType.body.fontFamily, fontSize: 14.5, letterSpacing: -0.12, lineHeight: 22, marginTop: 11, textAlign: "center" },
  card: { marginTop: 26, padding: 18 },
  cardBody: { gap: 10 },
  footer: { marginTop: 8 },
  steps: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 18 },
  step: { backgroundColor: "rgba(33,30,41,0.14)", borderRadius: 3, height: 6, width: 6 },
  stepActive: { backgroundColor: "rgba(33,30,41,0.34)", width: 20 },
});
