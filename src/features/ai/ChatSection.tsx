import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AiOrb } from "@/components/AiOrb";
import { GlassPanel } from "@/components/GlassPanel";
import { memberName } from "@/domain/labels";
import { useAppData } from "@/state/AppDataContext";
import { materialType } from "@/theme/material";

const aiInk = { strong: "rgba(255,255,255,0.96)", muted: "rgba(255,255,255,0.60)", faint: "rgba(255,255,255,0.38)" } as const;

export function ChatSection() {
  const { snapshot, addChatMessage } = useAppData();
  const [text, setText] = useState("");
  const send = () => {
    const value = text.trim();
    if (!value) return;
    addChatMessage(value);
    setText("");
  };

  return (
    <>
      <View style={styles.status}><Ionicons color={aiInk.faint} name="sparkles-outline" size={12} /><Text style={styles.statusText}>ИИ подключится на следующем этапе</Text></View>
      <View style={styles.thread}>
        {snapshot.chat.length ? snapshot.chat.map((message) => {
          const mine = message.author === snapshot.currentMemberId;
          const ai = message.author === "ai";
          return (
            <View key={message.id} style={[styles.messageRow, mine && styles.mineRow]}>
              <View style={[styles.avatar, ai && styles.aiAvatar]}>{ai ? <AiOrb size={22} /> : <Text style={styles.avatarText}>{memberName(snapshot, message.author)[0]}</Text>}</View>
              <GlassPanel radius={20} size={92} style={[styles.bubble, mine && styles.mineBubble]} tint={mine ? "rgba(255,255,255,0.10)" : undefined}>
                <Text style={styles.who}>{ai ? "ИИ-посредник" : memberName(snapshot, message.author)}</Text>
                <Text style={styles.message}>{message.content}</Text>
                <Text style={styles.time}>{new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</Text>
              </GlassPanel>
            </View>
          );
        }) : (
          <View style={styles.empty}>
            <AiOrb size={70} />
            <Text style={styles.emptyTitle}>Разговор ещё не начат</Text>
            <Text style={styles.emptyText}>Это общее пространство для вас двоих и будущего ИИ-посредника.</Text>
          </View>
        )}
      </View>
      <View style={styles.composer}>
        <GlassPanel radius={22} size={48} style={styles.inputPanel}>
          <TextInput multiline onChangeText={setText} placeholder="Сообщение для общего разговора" placeholderTextColor={aiInk.faint} style={styles.input} value={text} />
        </GlassPanel>
        <Pressable accessibilityLabel="Отправить" disabled={!text.trim()} onPress={send} style={({ pressed }) => [styles.send, !text.trim() && styles.sendDisabled, pressed && styles.pressed]}>
          <Ionicons color="#211D2A" name="arrow-up" size={19} />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  status: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 14, flexDirection: "row", gap: 7, height: 28, marginTop: 18, paddingHorizontal: 13 },
  statusText: { color: aiInk.faint, ...materialType.caption, fontSize: 11 },
  thread: { gap: 11, marginTop: 16 },
  messageRow: { alignItems: "flex-start", alignSelf: "flex-start", flexDirection: "row", gap: 9, maxWidth: "88%" },
  mineRow: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  avatar: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.28)", borderRadius: 13, height: 26, justifyContent: "center", marginTop: 2, overflow: "hidden", width: 26 },
  aiAvatar: { backgroundColor: "transparent" },
  avatarText: { color: aiInk.strong, ...materialType.caption, fontWeight: "600" },
  bubble: { minWidth: 120, paddingHorizontal: 14, paddingVertical: 11 },
  mineBubble: { backgroundColor: "rgba(255,255,255,0.10)" },
  who: { color: aiInk.faint, ...materialType.caption, fontSize: 10.5, fontWeight: "600" },
  message: { color: aiInk.strong, ...materialType.body, fontSize: 14, lineHeight: 20, marginTop: 4 },
  time: { color: aiInk.faint, ...materialType.caption, fontSize: 9.5, marginTop: 6, textAlign: "right" },
  empty: { alignItems: "center", paddingHorizontal: 28, paddingVertical: 34 },
  emptyTitle: { color: aiInk.strong, ...materialType.section, marginTop: 15 },
  emptyText: { color: aiInk.muted, ...materialType.body, marginTop: 7, textAlign: "center" },
  composer: { alignItems: "flex-end", flexDirection: "row", gap: 8, marginTop: 18 },
  inputPanel: { flex: 1, minHeight: 44, paddingHorizontal: 16, paddingVertical: 10 },
  input: { color: aiInk.strong, ...materialType.body, maxHeight: 110, minHeight: 24, padding: 0 },
  send: { alignItems: "center", backgroundColor: "#E8E5EB", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  sendDisabled: { opacity: 0.38 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
