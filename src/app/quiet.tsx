import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import { BackendError, backendClient } from "@/services/backendClient";
import { useAuth } from "@/state/AuthContext";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export default function QuietScreen() {
  const { accessToken, refreshSession } = useAuth();
  const [concern, setConcern] = useState("");
  const [change, setChange] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!accessToken || !concern.trim() || !change.trim()) return;
    setSending(true);
    const content = JSON.stringify({ concern: concern.trim(), requestedChange: change.trim() });
    try {
      try {
        await backendClient.submitFeedback(content, accessToken);
      } catch (error) {
        if (!(error instanceof BackendError) || error.status !== 401) throw error;
        const refreshed = await refreshSession();
        if (!refreshed) throw error;
        await backendClient.submitFeedback(content, refreshed.accessToken);
      }
      setConcern("");
      setChange("");
      Alert.alert("Обращение сохранено", "Партнёр не увидит исходный текст. Позже ИИ-посредник сможет использовать его только для безопасных персональных рекомендаций.");
    } catch (error) {
      Alert.alert("Не удалось отправить", error instanceof Error ? error.message : "Попробуйте ещё раз позже.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen header={<SubpageHeader title="Тихий канал" subtitle="Личное обращение будущему ИИ-посреднику. Партнёр не увидит исходный текст." />}>
      <Surface style={styles.notice}>
        <Text style={styles.noticeTitle}>Закрыто от партнёра</Text>
        <Text style={styles.copy}>Текст отправляется только в защищённое хранилище и шифруется на сервере. В приложении нет экрана, где второй участник сможет его прочитать.</Text>
      </Surface>
      <Surface style={styles.form}>
        <Text style={styles.label}>Что вас беспокоит или чего вам не хватает</Text>
        <TextInput maxLength={5000} multiline onChangeText={setConcern} placeholder="Опишите ситуацию своими словами" placeholderTextColor={colors.muted} style={styles.input} value={concern} />
        <Text style={styles.label}>Какого изменения вы хотели бы</Text>
        <TextInput maxLength={5000} multiline onChangeText={setChange} placeholder="Сформулируйте конкретную просьбу" placeholderTextColor={colors.muted} style={styles.input} value={change} />
        <AppButton disabled={sending || !concern.trim() || !change.trim()} label={sending ? "Шифруем и отправляем…" : "Зашифровать и отправить"} onPress={() => void submit()} />
      </Surface>
      <Surface style={styles.preview}>
        <Text style={styles.previewTitle}>Что будет дальше</Text>
        <Text style={styles.copy}>Пока обращение только надёжно сохраняется. Автоматический анализ и персональные подсказки будут подключены отдельным этапом после выбора ИИ-модели.</Text>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: colors.violetSoft },
  noticeTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  form: { gap: spacing.md, marginTop: spacing.xl },
  label: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  input: { backgroundColor: "rgba(255,255,255,0.72)", borderColor: colors.glassLine, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, color: colors.ink, fontSize: 16, minHeight: 112, padding: spacing.md, textAlignVertical: "top" },
  preview: { marginTop: spacing.xl },
  previewTitle: { color: colors.sea, fontFamily: typography.display, fontSize: 24 },
});
