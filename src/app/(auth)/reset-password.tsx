import { useState } from "react";
import { Text } from "react-native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { AuthButton, AuthCodeInput, AuthError, AuthField, AuthLink, AuthScaffold, authStyles } from "@/components/AuthScaffold";
import { backendClient } from "@/services/backendClient";

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
    setError(null); setIsSubmitting(true);
    try { await backendClient.resetPassword({ email: email.trim().toLowerCase(), code, newPassword }); setDone(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось сбросить пароль"); }
    finally { setIsSubmitting(false); }
  };

  if (done) {
    return (
      <AuthScaffold subtitle="Все устройства вышли из аккаунта в целях безопасности. Войдите заново с новым паролем." title="Пароль изменён">
        <AuthButton label="Ко входу" onPress={() => router.replace("/(auth)/sign-in" as Href)} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold footer={<AuthLink onPress={() => router.back()}>Назад</AuthLink>} subtitle="Введите код из письма и новый пароль." title="Новый пароль">
      <AuthField accessibilityLabel="Электронная почта" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={254} onChangeText={setEmail} placeholder="Почта" value={email} />
      <Text style={authStyles.label}>Код из письма</Text>
      <AuthCodeInput code={code} onChange={setCode} />
      <Text style={authStyles.label}>Новый пароль</Text>
      <AuthField accessibilityLabel="Новый пароль" autoCapitalize="none" autoComplete="new-password" maxLength={200} onChangeText={setNewPassword} placeholder="Минимум 10 символов" secureTextEntry value={newPassword} />
      {error ? <AuthError message={error} /> : null}
      <AuthButton disabled={isSubmitting} label={isSubmitting ? "Сохраняем…" : "Сбросить пароль"} onPress={() => void submit()} />
    </AuthScaffold>
  );
}
