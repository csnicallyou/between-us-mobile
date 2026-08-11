import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { AuthScaffold } from "@/components/AuthScaffold";
import { backendClient } from "@/services/backendClient";
import { colors, radius, spacing } from "@/theme/tokens";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Введите корректную электронную почту"); return; }
    if (!/^\d{6}$/.test(code)) { setError("Введите 6-значный код из письма"); return; }
    if (newPassword.length < 10) { setError("Пароль должен содержать не менее 10 символов"); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      await backendClient.resetPassword({ email: email.trim().toLowerCase(), code, newPassword });
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сбросить пароль");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthScaffold title="Пароль изменён" subtitle="Все устройства вышли из аккаунта в целях безопасности. Войдите заново с новым паролем.">
        <AppButton label="Ко входу" onPress={() => router.replace("/(auth)/sign-in" as Href)} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title="Новый пароль" subtitle="Введите код из письма и новый пароль.">
      <TextInput accessibilityLabel="Электронная почта" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={254} onChangeText={setEmail} placeholder="Почта" placeholderTextColor={colors.muted} style={styles.input} value={email} />
      <TextInput accessibilityLabel="Код из письма" keyboardType="number-pad" maxLength={6} onChangeText={(value) => setCode(value.replace(/\D/g, ""))} placeholder="000000" placeholderTextColor={colors.muted} style={styles.input} value={code} />
      <TextInput accessibilityLabel="Новый пароль" autoCapitalize="none" autoComplete="new-password" maxLength={200} onChangeText={setNewPassword} placeholder="Новый пароль, минимум 10 символов" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} value={newPassword} />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <AppButton disabled={isSubmitting} label={isSubmitting ? "Сохраняем…" : "Сбросить пароль"} onPress={() => void submit()} />
      {isSubmitting ? <ActivityIndicator color={colors.sea} /> : null}
      <Pressable onPress={() => router.back()}><Text style={styles.link}>Назад</Text></Pressable>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: colors.surfaceStrong, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.lg },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  link: { color: colors.sea, fontSize: 14, fontWeight: "600", paddingVertical: spacing.sm, textAlign: "center" },
});
