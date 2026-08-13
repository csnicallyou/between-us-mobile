import { useState } from "react";
import { type Href, useRouter } from "expo-router";
import { AuthButton, AuthError, AuthField, AuthLink, AuthScaffold } from "@/components/AuthScaffold";
import { useAuth } from "@/state/AuthContext";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (displayName.trim().length < 2 || displayName.trim().length > 80) { setError("Имя должно содержать от 2 до 80 символов"); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Введите корректную электронную почту"); return; }
    if (password.length < 10) { setError("Пароль должен содержать не менее 10 символов"); return; }
    setError(null); setIsSubmitting(true);
    try { await signUp({ displayName, email, password }); router.replace("/(onboarding)" as Href); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось создать аккаунт"); }
    finally { setIsSubmitting(false); }
  };

  return (
    <AuthScaffold
      footer={<AuthLink onPress={() => router.back()}>Уже есть аккаунт? Войти</AuthLink>}
      subtitle="У каждого свой вход. Общее пространство появится после приглашения партнёра."
      title="Создайте аккаунт"
    >
      <AuthField accessibilityLabel="Ваше имя" autoCapitalize="words" autoComplete="name" maxLength={80} onChangeText={setDisplayName} placeholder="Как вас называть" value={displayName} />
      <AuthField accessibilityLabel="Электронная почта" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={254} onChangeText={setEmail} placeholder="Почта" value={email} />
      <AuthField accessibilityLabel="Пароль" autoCapitalize="none" autoComplete="new-password" maxLength={200} onChangeText={setPassword} onSubmitEditing={() => void submit()} placeholder="Пароль, минимум 10 символов" secureTextEntry value={password} />
      {error ? <AuthError message={error} /> : null}
      <AuthButton disabled={isSubmitting} label={isSubmitting ? "Создаём…" : "Создать аккаунт"} onPress={() => void submit()} />
    </AuthScaffold>
  );
}
