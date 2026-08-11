import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export default function QuietScreen() {
  const [concern, setConcern] = useState(""); const [change, setChange] = useState(""); const [preview, setPreview] = useState(false);
  return <Screen header={<SubpageHeader title="Тихий канал" subtitle="Личное обращение будущему ИИ-посреднику. Партнёр не увидит исходный текст." />}>
    <Surface style={styles.notice}><Text style={styles.noticeTitle}>Сейчас работает как безопасный черновик</Text><Text style={styles.copy}>До появления авторизации, шифрования и серверного ИИ текст не отправляется и не синхронизируется. Это защищает личное сообщение от случайной публикации.</Text></Surface>
    <Surface style={styles.form}><Text style={styles.label}>Что вас беспокоит или чего не хватает</Text><TextInput multiline onChangeText={setConcern} placeholder="Опишите ситуацию своими словами" placeholderTextColor={colors.muted} style={styles.input} value={concern} /><Text style={styles.label}>Какого изменения вы хотели бы</Text><TextInput multiline onChangeText={setChange} placeholder="Сформулируйте конкретную просьбу" placeholderTextColor={colors.muted} style={styles.input} value={change} /><AppButton disabled={!concern.trim() || !change.trim()} label="Проверить формулировку" onPress={() => setPreview(true)} /></Surface>
    {preview ? <Surface style={styles.preview}><Text style={styles.previewTitle}>Черновая подсказка</Text><Text style={styles.copy}>Попробуйте передать наблюдение без обвинения, назвать своё чувство и завершить одной выполнимой просьбой. Исходный текст остаётся только на этом экране и исчезнет после закрытия приложения.</Text></Surface> : null}
  </Screen>;
}
const styles = StyleSheet.create({ notice: { backgroundColor: colors.violetSoft }, noticeTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" }, copy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm }, form: { gap: spacing.md, marginTop: spacing.xl }, label: { color: colors.ink, fontSize: 13, fontWeight: "700" }, input: { backgroundColor: "rgba(255,255,255,0.72)", borderColor: colors.glassLine, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, color: colors.ink, fontSize: 16, minHeight: 112, padding: spacing.md, textAlignVertical: "top" }, preview: { marginTop: spacing.xl }, previewTitle: { color: colors.sea, fontFamily: typography.display, fontSize: 24 } });
