import { useState } from "react";
import { type Href, useRouter } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { AuthError, AuthField, AuthLink, AuthScaffold } from "@/components/AuthScaffold";
import { backendClient } from "@/services/backendClient";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Введите корректную почту"); return; }
    setError(null); setIsSubmitting(true);
    try { await backendClient.forgotPassword(email.trim().toLowerCase()); setSent(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось отправить код"); }
    finally { setIsSubmitting(false); }
  };

  if (sent) {
    return (
      <AuthScaffold
        footer={<AuthLink onPress={() => router.back()}>Назад ко входу</AuthLink>}
        subtitle={`Если аккаунт с адресом ${email.trim().toLowerCase()} существует, мы отправили код для сброса пароля.`}
        title="Проверьте почту"
      >
        <AppButton label="У меня есть код" onPress={() => router.push(`/(auth)/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}` as Href)} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold footer={<AuthLink onPress={() => router.back()}>Назад ко входу</AuthLink>} subtitle="Укажите почту — пришлём код для сброса пароля." title="Забыли пароль?">
      <AuthField accessibilityLabel="Электронная почта" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={254} onChangeText={setEmail} placeholder="Почта" value={email} />
      {error ? <AuthError message={error} /> : null}
      <AppButton disabled={isSubmitting} label={isSubmitting ? "Отправляем…" : "Отправить код"} onPress={() => void submit()} />
    </AuthScaffold>
  );
}
