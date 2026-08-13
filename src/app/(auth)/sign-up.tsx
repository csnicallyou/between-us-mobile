import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { type Href, useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { AuthScaffold } from "@/components/AuthScaffold";
import { useAuth } from "@/state/AuthContext";
import { colors, radius, spacing } from "@/theme/tokens";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (displayName.trim().length < 2 || displayName.trim().length > 80) {
      setError("Имя должно содержать от 2 до 80 символов");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Введите корректную электронную почту");
      return;
    }
    if (password.length < 10) {
      setError("Пароль должен содержать не менее 10 символов");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await signUp({ displayName, email, password });
      router.replace("/(onboarding)" as Href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать аккаунт");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScaffold title="Создайте аккаунт" subtitle="У каждого свой вход. Общее пространство появится после приглашения партнёра.">
      <TextInput accessibilityLabel="Ваше имя" autoCapitalize="words" autoComplete="name" maxLength={80} onChangeText={setDisplayName} placeholder="Как вас называть" placeholderTextColor={colors.muted} style={styles.input} value={displayName} />
      <TextInput accessibilityLabel="Электронная почта" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={254} onChangeText={setEmail} placeholder="Почта" placeholderTextColor={colors.muted} style={styles.input} value={email} />
      <TextInput accessibilityLabel="Пароль" autoCapitalize="none" autoComplete="new-password" maxLength={200} onChangeText={setPassword} onSubmitEditing={() => void submit()} placeholder="Пароль, минимум 10 символов" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} value={password} />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <AppButton disabled={isSubmitting} label={isSubmitting ? "Создаём…" : "Создать аккаунт"} onPress={() => void submit()} />
      {isSubmitting ? <ActivityIndicator color={colors.sea} /> : null}
      <Pressable accessibilityRole="link" onPress={() => router.back()}><Text style={styles.link}>Уже есть аккаунт? Войти</Text></Pressable>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: "rgba(255,255,255,0.30)", borderColor: "rgba(255,255,255,0.46)", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, color: "rgba(33,30,41,0.94)", fontSize: 15, minHeight: 50, paddingHorizontal: 15 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  link: { color: "rgba(33,30,41,0.60)", fontSize: 14, fontWeight: "600", paddingVertical: spacing.sm, textAlign: "center" },
});
