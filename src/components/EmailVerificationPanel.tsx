import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { useAuth } from "@/state/AuthContext";
import { colors, radius, spacing } from "@/theme/tokens";

const RESEND_COOLDOWN_SECONDS = 60;

export function EmailVerificationPanel() {
  const { resendVerification, user, verifyEmail } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const submit = async () => {
    if (!/^\d{6}$/.test(code)) { setError("Введите 6-значный код из письма"); return; }
    setError(null);
    setInfo(null);
    setIsSubmitting(true);
    try {
      await verifyEmail(code);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось подтвердить почту");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    setError(null);
    setInfo(null);
    setIsSubmitting(true);
    try {
      await resendVerification();
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      setInfo("Код отправлен повторно");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить код");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cooldownActive = cooldownUntil > Date.now();

  return (
    <View style={styles.group}>
      <Text style={styles.title}>Подтвердите почту</Text>
      <Text style={styles.subtitle}>Мы отправили 6-значный код на {user?.email}. Введите его, чтобы создать или присоединиться к паре.</Text>
      <TextInput
        accessibilityLabel="Код подтверждения"
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={(value) => setCode(value.replace(/\D/g, ""))}
        placeholder="000000"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={code}
      />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}
      <AppButton disabled={isSubmitting} label={isSubmitting ? "Проверяем…" : "Подтвердить"} onPress={() => void submit()} />
      <AppButton disabled={isSubmitting || cooldownActive} label={cooldownActive ? "Код уже отправлен" : "Отправить код ещё раз"} onPress={() => void resend()} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  title: { color: colors.ink, fontSize: 22, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  input: { backgroundColor: colors.surfaceStrong, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 24, letterSpacing: 8, minHeight: 56, paddingHorizontal: spacing.lg, textAlign: "center" },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  info: { color: colors.sea, fontSize: 13, lineHeight: 18 },
});
