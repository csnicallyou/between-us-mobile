import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { GlassPanel } from "@/components/GlassPanel";
import { BackendError, backendClient } from "@/services/backendClient";
import { useAuth } from "@/state/AuthContext";
import { materialType } from "@/theme/material";

const aiInk = { strong: "rgba(255,255,255,0.96)", muted: "rgba(255,255,255,0.60)", faint: "rgba(255,255,255,0.38)" } as const;

export function QuietSection() {
  const { accessToken, refreshSession } = useAuth();
  const [concern, setConcern] = useState("");
  const [change, setChange] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!accessToken || !concern.trim() || !change.trim()) return;
    setSending(true);
    const content = JSON.stringify({ concern: concern.trim(), requestedChange: change.trim() });
    try {
      try { await backendClient.submitFeedback(content, accessToken); }
      catch (error) {
        if (!(error instanceof BackendError) || error.status !== 401) throw error;
        const refreshed = await refreshSession();
        if (!refreshed) throw error;
        await backendClient.submitFeedback(content, refreshed.accessToken);
      }
      setConcern(""); setChange("");
      Alert.alert("Обращение сохранено", "Партнёр не увидит исходный текст. ИИ сможет использовать его только для безопасных персональных рекомендаций.");
    } catch (error) {
      Alert.alert("Не удалось отправить", error instanceof Error ? error.message : "Попробуйте ещё раз позже.");
    } finally { setSending(false); }
  };

  return <>
    <GlassPanel radius={20} size={84} style={styles.notice}><Text style={styles.noticeTitle}>Закрыто от партнёра</Text><Text style={styles.copy}>Текст шифруется на сервере. В приложении нет экрана, где второй участник сможет его прочитать.</Text></GlassPanel>
    <GlassPanel radius={24} size={320} style={styles.form}>
      <Text style={styles.label}>Что вас беспокоит или чего вам не хватает</Text>
      <TextInput maxLength={5000} multiline onChangeText={setConcern} placeholder="Опишите ситуацию своими словами" placeholderTextColor={aiInk.faint} style={styles.input} value={concern} />
      <Text style={styles.label}>Какого изменения вы хотели бы</Text>
      <TextInput maxLength={5000} multiline onChangeText={setChange} placeholder="Сформулируйте конкретную просьбу" placeholderTextColor={aiInk.faint} style={styles.input} value={change} />
      <Pressable disabled={sending || !concern.trim() || !change.trim()} onPress={() => void submit()} style={({ pressed }) => [styles.submit, pressed && styles.submitPressed, (sending || !concern.trim() || !change.trim()) && styles.submitDisabled]}><Text style={styles.submitText}>{sending ? "Шифруем и отправляем…" : "Зашифровать и отправить"}</Text></Pressable>
    </GlassPanel>
    <GlassPanel radius={22} size={120} style={styles.preview}><Text style={styles.previewTitle}>Что будет дальше</Text><Text style={styles.copy}>Пока обращение только надёжно сохраняется. Анализ появится после подключения ИИ-модели.</Text></GlassPanel>
  </>;
}

const styles = StyleSheet.create({
  notice: { marginTop: 18, padding: 15 },
  noticeTitle: { color: aiInk.strong, ...materialType.section, fontSize: 16 },
  copy: { color: aiInk.muted, ...materialType.body, marginTop: 8 },
  form: { gap: 12, marginTop: 14, padding: 16 },
  label: { color: aiInk.strong, ...materialType.label, fontWeight: "600" },
  input: { backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.14)", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, color: aiInk.strong, ...materialType.body, minHeight: 104, padding: 14, textAlignVertical: "top" },
  preview: { marginTop: 14, padding: 16 },
  previewTitle: { color: aiInk.strong, ...materialType.section },
  submit: { alignItems: "center", backgroundColor: "#EEEAF1", borderRadius: 18, justifyContent: "center", minHeight: 52, paddingHorizontal: 18 },
  submitPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  submitDisabled: { opacity: 0.38 },
  submitText: { color: "#211D2A", ...materialType.label, fontWeight: "600" },
});
