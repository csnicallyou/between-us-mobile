import { type PropsWithChildren, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { memberName } from "@/domain/labels";
import { OrbSinkItem } from "@/motion/ScrollSuction";
import { useAppData } from "@/state/AppDataContext";
import { V2Glass } from "@/ui-v2";

const CHAT_MAX_LENGTH = 4000;
const CHAT_COUNTER_THRESHOLD = 3500;
const ink = {
  strong: "rgba(255,255,255,0.96)",
  muted: "rgba(255,255,255,0.60)",
  faint: "rgba(255,255,255,0.38)",
  hair: "rgba(255,255,255,0.10)",
} as const;

function DarkGlass({ children, radius = 22, style }: PropsWithChildren<{ radius?: number; style?: StyleProp<ViewStyle> }>) {
  return <V2Glass dark plain radius={radius} style={[styles.glass, style]}>{children}</V2Glass>;
}

interface ChatContentProps {
  highlightedMessageId: string | null;
  onMessageLayout: (messageId: string, event: LayoutChangeEvent) => void;
  onThreadLayout: (event: LayoutChangeEvent) => void;
  pendingSyncCount: number;
}

export function AiChatContent({ highlightedMessageId, onMessageLayout, onThreadLayout, pendingSyncCount }: ChatContentProps) {
  const { snapshot } = useAppData();
  return <>
    <View style={styles.systemNotes}>
      <View style={styles.systemNote}>
        <Ionicons color={ink.faint} name="sparkles-outline" size={12} />
        <Text style={styles.systemNoteText}>Чат синхронизируется между вами · ИИ пока не подключён</Text>
      </View>
      {pendingSyncCount > 0 ? <View style={styles.queueNote}>
        <Ionicons color={ink.faint} name="cloud-upload-outline" size={12} />
        <Text style={styles.queueNoteText}>В общей очереди синхронизации: {pendingSyncCount}</Text>
      </View> : null}
    </View>
    {snapshot.chat.length ? <View onLayout={onThreadLayout} style={styles.thread}>
      {snapshot.chat.map((item, index) => {
        const mine = item.author === snapshot.currentMemberId;
        const ai = item.author === "ai";
        const author = ai ? "ИИ-посредник" : memberName(snapshot, item.author);
        const previous = snapshot.chat[index - 1];
        const next = snapshot.chat[index + 1];
        const newDay = !previous || chatDateKey(previous.createdAt) !== chatDateKey(item.createdAt);
        const sameAuthor = !newDay && previous?.author === item.author;
        const lastInGroup = !next || next.author !== item.author || chatDateKey(next.createdAt) !== chatDateKey(item.createdAt);
        return <View key={item.id} onLayout={(event) => onMessageLayout(item.id, event)}>
          {newDay ? <View style={styles.dayDivider}><View style={styles.dayLine} /><Text style={styles.dayText}>{formatChatDay(item.createdAt)}</Text><View style={styles.dayLine} /></View> : null}
          <OrbSinkItem style={[styles.messageRow, mine && styles.messageMine, sameAuthor && styles.messageSame]}>
            <View style={[styles.avatar, ai && styles.aiAvatar, sameAuthor && styles.avatarHidden]}>
              {ai ? <Ionicons color={ink.muted} name="sparkles-outline" size={12} /> : <Text style={styles.avatarText}>{author.slice(0, 1)}</Text>}
            </View>
            <DarkGlass radius={20} style={[styles.bubble, mine && styles.bubbleMine, highlightedMessageId === item.id && styles.bubbleHighlighted]}>
              {!sameAuthor ? <Text style={styles.bubbleAuthor}>{author}</Text> : null}
              <Text style={[styles.bubbleText, sameAuthor && styles.bubbleTextSame]}>{item.content}</Text>
              {lastInGroup ? <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{formatTime(item.createdAt)}</Text> : null}
            </DarkGlass>
          </OrbSinkItem>
        </View>;
      })}
    </View> : <View style={styles.chatEmpty}>
      <View style={styles.chatEmptyIcon}><Ionicons color={ink.muted} name="chatbubble-outline" size={24} /></View>
      <Text style={styles.chatEmptyTitle}>Начните общий разговор</Text>
      <Text style={styles.chatEmptyText}>Это общий чат — оба видят всё, что здесь написано. Позже сюда же подключится ИИ-посредник, третьим участником.</Text>
    </View>}
  </>;
}

export function AiChatComposer({ onSent }: { onSent: () => void }) {
  const { addChatMessage } = useAppData();
  const [message, setMessage] = useState("");
  const [inputHeight, setInputHeight] = useState(24);
  const sendLock = useRef(false);
  const send = () => {
    const content = message.trim();
    if (!content || sendLock.current) return;
    sendLock.current = true;
    addChatMessage(content);
    setMessage("");
    setInputHeight(24);
    onSent();
    requestAnimationFrame(() => { sendLock.current = false; });
  };
  return <View style={styles.composer}>
    <DarkGlass radius={22} style={styles.composerInput}>
      <TextInput
        maxLength={CHAT_MAX_LENGTH}
        multiline
        onChangeText={setMessage}
        onContentSizeChange={({ nativeEvent }) => setInputHeight(Math.max(24, Math.min(96, Math.ceil(nativeEvent.contentSize.height))))}
        placeholder="Сообщение для общего чата"
        placeholderTextColor={ink.faint}
        scrollEnabled={inputHeight >= 96}
        style={[styles.textInput, { height: inputHeight }]}
        value={message}
      />
      {message.length >= CHAT_COUNTER_THRESHOLD ? <Text style={styles.composerCounter}>{message.length}/{CHAT_MAX_LENGTH}</Text> : null}
    </DarkGlass>
    <Pressable accessibilityLabel="Отправить" accessibilityRole="button" disabled={!message.trim()} onPress={send} style={({ pressed }) => [styles.send, !message.trim() && styles.sendDisabled, pressed && styles.pressed]}>
      <Ionicons color="#211D2A" name="arrow-up" size={18} />
    </Pressable>
  </View>;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function chatDateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatChatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (chatDateKey(value) === chatDateKey(today.toISOString())) return "Сегодня";
  if (chatDateKey(value) === chatDateKey(yesterday.toISOString())) return "Вчера";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}

const font = "GolosText";
const styles = StyleSheet.create({
  glass: { backgroundColor: "rgba(255,255,255,0.085)", overflow: "hidden", shadowColor: "#000000", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.48, shadowRadius: 14 },
  systemNotes: { alignItems: "center", gap: 7, marginTop: 18 },
  systemNote: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(255,255,255,0.13)", borderColor: "rgba(255,255,255,0.18)", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 7, maxWidth: "100%", minHeight: 28, paddingHorizontal: 13, paddingVertical: 6 },
  systemNoteText: { color: ink.faint, flexShrink: 1, fontFamily: font, fontSize: 10.5, fontWeight: "500", letterSpacing: -0.04, textAlign: "center" },
  queueNote: { alignItems: "center", flexDirection: "row", gap: 6, minHeight: 24, paddingHorizontal: 10 },
  queueNoteText: { color: ink.faint, fontFamily: font, fontSize: 10.5, fontWeight: "500" },
  thread: { gap: 11, marginTop: 16 },
  dayDivider: { alignItems: "center", flexDirection: "row", gap: 9, marginBottom: 11, marginTop: 6 },
  dayLine: { backgroundColor: ink.hair, flex: 1, height: StyleSheet.hairlineWidth },
  dayText: { color: ink.faint, fontFamily: font, fontSize: 9.5, fontWeight: "600", letterSpacing: 1.2, textTransform: "uppercase" },
  messageRow: { alignItems: "flex-start", alignSelf: "flex-start", flexDirection: "row", gap: 9, maxWidth: "86%" },
  messageMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  messageSame: { marginTop: -6 },
  avatar: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.28)", borderColor: "rgba(255,255,255,0.30)", borderRadius: 13, borderTopColor: "rgba(255,255,255,0.70)", borderWidth: StyleSheet.hairlineWidth, height: 26, justifyContent: "center", marginTop: 2, width: 26 },
  aiAvatar: { backgroundColor: "rgba(255,255,255,0.10)" },
  avatarHidden: { opacity: 0 },
  avatarText: { color: ink.strong, fontFamily: font, fontSize: 10.5, fontWeight: "600" },
  bubble: { minWidth: 84, paddingHorizontal: 14, paddingVertical: 11 },
  bubbleMine: { backgroundColor: "rgba(255,255,255,0.17)" },
  bubbleHighlighted: { backgroundColor: "rgba(255,255,255,0.24)", borderColor: "rgba(255,255,255,0.52)", borderWidth: 1 },
  bubbleAuthor: { color: ink.faint, fontFamily: font, fontSize: 10.5, fontWeight: "600", letterSpacing: 0.2 },
  bubbleText: { color: ink.strong, fontFamily: font, fontSize: 14, fontWeight: "400", letterSpacing: -0.08, lineHeight: 18, marginTop: 2 },
  bubbleTextSame: { marginTop: 0 },
  bubbleTime: { color: ink.faint, fontFamily: font, fontSize: 9.5, fontWeight: "400", marginTop: 3, textAlign: "right" },
  bubbleTimeMine: { textAlign: "left" },
  chatEmpty: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 52 },
  chatEmptyIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 19, height: 54, justifyContent: "center", width: 54 },
  chatEmptyTitle: { color: ink.strong, fontFamily: font, fontSize: 18, fontWeight: "600", letterSpacing: -0.43, marginTop: 16 },
  chatEmptyText: { color: ink.muted, fontFamily: font, fontSize: 13.5, lineHeight: 20.5, marginTop: 9, maxWidth: 272, textAlign: "center" },
  composer: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
  composerInput: { flex: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 15, paddingVertical: 10 },
  textInput: { color: ink.strong, fontFamily: font, fontSize: 14, includeFontPadding: false, lineHeight: 20, maxHeight: 96, minHeight: 24, padding: 0, textAlignVertical: "center" },
  composerCounter: { alignSelf: "flex-end", color: ink.faint, fontFamily: font, fontSize: 9.5, lineHeight: 12, marginTop: 2 },
  send: { alignItems: "center", backgroundColor: "#E7E4EA", borderRadius: 22, height: 44, justifyContent: "center", shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.24, shadowRadius: 6, width: 44 },
  sendDisabled: { backgroundColor: "rgba(255,255,255,0.16)", opacity: 0.6 },
  pressed: { opacity: 0.76 },
});
