import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Surface } from "@/components/Surface";
import { memberName } from "@/domain/labels";
import { useAppData } from "@/state/AppDataContext";
import { colors, radius, spacing } from "@/theme/tokens";

export function ChatSection() {
  const { snapshot, addChatMessage } = useAppData(); const [text, setText] = useState("");
  const send = () => { if (!text.trim()) return; addChatMessage(text.trim()); setText(""); };
  return <>
    <Surface style={styles.notice}><Text style={styles.noticeTitle}>ИИ пока не подключён</Text><Text style={styles.noticeText}>Сообщения работают локально как прототип. После серверного этапа ИИ сможет по подтверждённой просьбе добавлять планы, события и договорённости.</Text></Surface>
    <View style={styles.messages}>{snapshot.chat.length ? snapshot.chat.map((message) => <View key={message.id} style={[styles.bubble, message.author === snapshot.currentMemberId && styles.mine]}><Text style={styles.author}>{message.author === "ai" ? "ИИ-посредник" : memberName(snapshot, message.author)}</Text><Text style={styles.message}>{message.content}</Text><Text style={styles.time}>{new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</Text></View>) : <Text style={styles.empty}>Начните общий разговор.</Text>}</View>
    <Surface style={styles.composer}><TextInput multiline onChangeText={setText} placeholder="Сообщение для общего чата" placeholderTextColor={colors.muted} style={styles.input} value={text} /><AppButton label="Отправить" onPress={send} /></Surface>
  </>;
}
const styles = StyleSheet.create({ notice: { backgroundColor: colors.seaSoft }, noticeTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" }, noticeText: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm }, messages: { gap: spacing.md, marginTop: spacing.xl }, bubble: { alignSelf: "flex-start", backgroundColor: colors.violetSoft, borderRadius: radius.lg, maxWidth: "88%", padding: spacing.md }, mine: { alignSelf: "flex-end", backgroundColor: colors.seaSoft }, author: { color: colors.sea, fontSize: 11, fontWeight: "700" }, message: { color: colors.ink, fontSize: 15, lineHeight: 21, marginTop: spacing.xs }, time: { color: colors.muted, fontSize: 10, marginTop: spacing.sm, textAlign: "right" }, empty: { color: colors.muted, paddingVertical: spacing.xl, textAlign: "center" }, composer: { gap: spacing.md, marginTop: spacing.xl }, input: { backgroundColor: "rgba(255,255,255,0.72)", borderRadius: radius.md, color: colors.ink, fontSize: 16, minHeight: 80, padding: spacing.md, textAlignVertical: "top" } });
