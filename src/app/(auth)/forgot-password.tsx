import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { type Href, useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { AuthScaffold } from "@/components/AuthScaffold";
import { backendClient } from "@/services/backendClient";
import { colors, radius, spacing } from "@/theme/tokens";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Введите корректную электронную почту"); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      await backendClient.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить код");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthScaffold title="Проверьте почту" subtitle={`Если аккаунт с адресом ${email.trim().toLowerCase()} существует, мы отправили код для сброса пароля.`}>
        <AppButton label="У меня есть код" onPress={() => router.push(`/(auth)/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}` as Href)} />
        <Pressable onPress={() => router.back()}><Text style={styles.link}>Назад ко входу</Text></Pressable>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title="Забыли пароль?" subtitle="Укажите почту — пришлём код для сброса пароля.">
      <TextInput accessibilityLabel="Электронная почта" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={254} onChangeText={setEmail} placeholder="Почта" placeholderTextColor={colors.muted} style={styles.input} value={email} />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <AppButton disabled={isSubmitting} label={isSubmitting ? "Отправляем…" : "Отправить код"} onPress={() => void submit()} />
      {isSubmitting ? <ActivityIndicator color={colors.sea} /> : null}
      <Pressable onPress={() => router.back()}><Text style={styles.link}>Назад ко входу</Text></Pressable>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: "rgba(255,255,255,0.30)", borderColor: "rgba(255,255,255,0.46)", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, color: "rgba(33,30,41,0.94)", fontSize: 15, minHeight: 50, paddingHorizontal: 15 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  link: { color: "rgba(33,30,41,0.60)", fontSize: 14, fontWeight: "600", paddingVertical: spacing.sm, textAlign: "center" },
});
