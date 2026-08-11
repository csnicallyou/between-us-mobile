import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { type Href, useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { AuthScaffold } from "@/components/AuthScaffold";
import { useAuth } from "@/state/AuthContext";
import { colors, radius, spacing } from "@/theme/tokens";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !password) {
      setError("Введите корректную почту и пароль");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      router.replace("/(onboarding)" as Href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось войти");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScaffold title="Снова вместе" subtitle="Войдите, чтобы открыть ваше общее пространство.">
      <TextInput accessibilityLabel="Электронная почта" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={254} onChangeText={setEmail} placeholder="Почта" placeholderTextColor={colors.muted} style={styles.input} value={email} />
      <TextInput accessibilityLabel="Пароль" autoCapitalize="none" autoComplete="current-password" maxLength={200} onChangeText={setPassword} onSubmitEditing={() => void submit()} placeholder="Пароль" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} value={password} />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <AppButton disabled={isSubmitting} label={isSubmitting ? "Входим…" : "Войти"} onPress={() => void submit()} />
      {isSubmitting ? <ActivityIndicator color={colors.sea} /> : null}
      <Pressable accessibilityRole="link" onPress={() => router.push("/(auth)/sign-up" as Href)}><Text style={styles.link}>Нет аккаунта? Зарегистрироваться</Text></Pressable>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: colors.surfaceStrong, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.lg },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  link: { color: colors.sea, fontSize: 14, fontWeight: "600", paddingVertical: spacing.sm, textAlign: "center" },
});
