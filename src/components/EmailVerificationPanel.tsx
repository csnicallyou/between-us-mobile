import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { AuthCodeInput, AuthError, AuthInfo } from "@/components/AuthScaffold";
import { useAuth } from "@/state/AuthContext";
import { ink, materialType } from "@/theme/material";

const RESEND_COOLDOWN_SECONDS = 60;

export function EmailVerificationPanel() {
  const { resendVerification, user, verifyEmail } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const submit = async () => {
    if (!/^\d{6}$/.test(code)) { setError("Введите 6-значный код из письма"); return; }
    setError(null); setInfo(null); setIsSubmitting(true);
    try { await verifyEmail(code); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось подтвердить почту"); }
    finally { setIsSubmitting(false); }
  };

  const resend = async () => {
    setError(null); setInfo(null); setIsSubmitting(true);
    try {
      await resendVerification();
      const until = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
      setCooldownUntil(until); setNow(Date.now()); setInfo("Код отправлен повторно");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось отправить код"); }
    finally { setIsSubmitting(false); }
  };

  const cooldownActive = cooldownUntil > now;
  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  return (
    <View style={styles.group}>
      <Text style={styles.note}>Мы отправили 6-значный код на {user?.email}</Text>
      <AuthCodeInput code={code} onChange={setCode} />
      {error ? <AuthError message={error} /> : null}
      {info ? <AuthInfo message={info} /> : null}
      <AppButton disabled={isSubmitting} label={isSubmitting ? "Проверяем…" : "Подтвердить"} onPress={() => void submit()} />
      <AppButton
        disabled={isSubmitting || cooldownActive}
        label={cooldownActive ? `Код уже отправлен · ${secondsLeft} с` : "Отправить код ещё раз"}
        onPress={() => void resend()}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  note: { color: ink.muted, fontFamily: materialType.body.fontFamily, fontSize: 13, lineHeight: 19, marginBottom: 5, textAlign: "center" },
});
