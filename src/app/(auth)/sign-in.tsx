import { useState } from "react";
import { View } from "react-native";
import { type Href, useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { AuthError, AuthField, AuthLink, AuthScaffold } from "@/components/AuthScaffold";
import { useAuth } from "@/state/AuthContext";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !password) { setError("Введите корректную почту и пароль"); return; }
    setError(null); setIsSubmitting(true);
    try { await signIn(email, password); router.replace("/(onboarding)" as Href); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось войти"); }
    finally { setIsSubmitting(false); }
  };

  return (
    <AuthScaffold
      footer={<View><AuthLink onPress={() => router.push("/(auth)/forgot-password" as Href)}>Забыли пароль?</AuthLink><AuthLink onPress={() => router.push("/(auth)/sign-up" as Href)}>Нет аккаунта? Зарегистрироваться</AuthLink></View>}
      subtitle="Войдите, чтобы открыть ваше общее пространство."
      title="Снова вместе"
    >
      <AuthField accessibilityLabel="Электронная почта" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={254} onChangeText={setEmail} placeholder="Почта" value={email} />
      <AuthField accessibilityLabel="Пароль" autoCapitalize="none" autoComplete="current-password" maxLength={200} onChangeText={setPassword} onSubmitEditing={() => void submit()} placeholder="Пароль" secureTextEntry value={password} />
      {error ? <AuthError message={error} /> : null}
      <AppButton disabled={isSubmitting} label={isSubmitting ? "Входим…" : "Войти"} onPress={() => void submit()} />
    </AuthScaffold>
  );
}
