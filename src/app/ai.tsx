import { type PropsWithChildren, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { AiOrb } from "@/components/AiOrb";
import { memberName } from "@/domain/labels";
import { BackendError, backendClient } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { OrbSinkItem, ScrollSuctionProvider } from "@/motion/ScrollSuction";
import { V2Glass } from "@/ui-v2";

type Mode = "quiet" | "chat" | "observations" | "info";

const ink = {
  strong: "rgba(255,255,255,0.96)",
  muted: "rgba(255,255,255,0.60)",
  faint: "rgba(255,255,255,0.38)",
  hair: "rgba(255,255,255,0.10)",
} as const;

function AiBackground() {
  const sparks = [[72, 120, 1.6], [298, 86, 2.1], [216, 248, 1.4], [118, 356, 1.8], [330, 420, 1.4], [54, 512, 1.6], [252, 588, 1.3], [160, 668, 1.7], [336, 742, 1.4], [88, 812, 1.6]] as const;
  return (
    <Svg height="100%" pointerEvents="none" preserveAspectRatio="none" style={StyleSheet.absoluteFill} viewBox="0 0 390 900" width="100%">
      <Defs>
        <LinearGradient id="ai-base" x1="0" x2="0.15" y1="0" y2="1">
          <Stop offset="0" stopColor="#1B1B1B" />
          <Stop offset="0.30" stopColor="#131313" />
          <Stop offset="0.65" stopColor="#0D0D0D" />
          <Stop offset="1" stopColor="#070707" />
        </LinearGradient>
        <RadialGradient cx="50%" cy="24%" id="ai-vignette" r="75%">
          <Stop offset="0" stopColor="#2A2A2A" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#2A2A2A" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect fill="url(#ai-base)" height="900" width="390" />
      <Ellipse cx="195" cy="200" fill="url(#ai-vignette)" rx="260" ry="220" />
      {sparks.map(([x, y, radius]) => <Circle cx={x} cy={y} fill="#FFFFFF" key={`${x}-${y}`} opacity="0.16" r={radius} />)}
      <Rect fill="#6A6A72" height="1" opacity="0.16" width="390" y="300" />
      <Rect fill="#5C5C64" height="1" opacity="0.16" width="390" y="520" />
      <Rect fill="#525258" height="1" opacity="0.16" width="390" y="700" />
    </Svg>
  );
}

function DarkGlass({ children, radius = 22, style }: PropsWithChildren<{ radius?: number; style?: StyleProp<ViewStyle> }>) {
  return (
    <V2Glass dark plain radius={radius} style={[styles.glass, style]}>
      {children}
    </V2Glass>
  );
}

export function AiSpaceContent() {
  const [mode, setMode] = useState<Mode>("chat");
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const scrollOffsetNow = useRef(0);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <StatusBar style="light" />
      <AiBackground />
      <ScrollSuctionProvider offset={scrollOffset} offsetNow={scrollOffsetNow}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <Animated.ScrollView
            contentContainerStyle={[styles.content, mode === "chat" && styles.chatContent]}
            keyboardShouldPersistTaps="handled"
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollOffset } } }], {
              listener: (event: { nativeEvent: { contentOffset: { y: number } } }) => { scrollOffsetNow.current = event.nativeEvent.contentOffset.y; },
              useNativeDriver: true,
            })}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <Header info={mode === "info"} onBack={() => setMode("chat")} onInfo={() => setMode("info")} />
            {mode !== "info" ? <ModeSelector mode={mode} setMode={setMode} /> : null}
            {mode === "chat" ? <ChatContent /> : null}
            {mode === "quiet" ? <QuietContent /> : null}
            {mode === "observations" ? <ObservationsContent /> : null}
            {mode === "info" ? <AccessContent /> : null}
          </Animated.ScrollView>
          {mode === "chat" ? <ChatComposer /> : null}
        </KeyboardAvoidingView>
      </ScrollSuctionProvider>
    </SafeAreaView>
  );
}

export default function AiSpaceDeepLink() {
  return <Redirect href={"/(tabs)/ai-space" as Href} />;
}

function Header({ info, onBack, onInfo }: { info: boolean; onBack: () => void; onInfo: () => void }) {
  return (
    <View style={styles.header}>
      {info ? (
        <Pressable accessibilityLabel="Назад" onPress={onBack} style={({ pressed }) => [styles.tool, pressed && styles.pressed]}>
          <Ionicons color={ink.muted} name="chevron-back" size={20} />
        </Pressable>
      ) : <AiOrb dark size={36} />}
      <View style={styles.heading}>
        <Text style={styles.kicker}>Пространство ИИ</Text>
        <Text style={styles.title}>{info ? "Что видит ИИ" : "Мы и ИИ"}</Text>
      </View>
      {!info ? (
        <Pressable accessibilityLabel="Что видит ИИ" onPress={onInfo} style={({ pressed }) => [styles.tool, pressed && styles.pressed]}>
          <Ionicons color={ink.muted} name="information-circle-outline" size={19} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ModeSelector({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return (
    <DarkGlass radius={25} style={styles.segment}>
      <ModeButton icon="lock-closed-outline" label="Тихий канал" onPress={() => setMode("quiet")} selected={mode === "quiet"} />
      <ModeButton hero icon="chatbubble-outline" label="Разговор" onPress={() => setMode("chat")} selected={mode === "chat"} />
      <ModeButton icon="eye-outline" label="Наблюдения" onPress={() => setMode("observations")} selected={mode === "observations"} />
    </DarkGlass>
  );
}

function ModeButton({ hero = false, icon, label, onPress, selected }: { hero?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.mode, hero && styles.modeHero, selected && (hero ? styles.modeHeroSelected : styles.modeSelected), pressed && styles.pressed]}
    >
      <Ionicons color={selected && hero ? "#211D2A" : selected ? ink.strong : ink.faint} name={icon} size={hero ? 15 : 13} />
      <Text numberOfLines={1} style={[styles.modeLabel, hero && styles.modeHeroLabel, selected && styles.modeLabelSelected, selected && hero && styles.modeHeroLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function ChatContent() {
  const { snapshot } = useAppData();

  return (
    <>
      <View style={styles.systemNote}>
        <Ionicons color={ink.faint} name="sparkles-outline" size={12} />
        <Text style={styles.systemNoteText}>ИИ подключится на следующем этапе</Text>
      </View>

      {snapshot.chat.length ? (
        <View style={styles.thread}>
          {snapshot.chat.map((item) => {
            const mine = item.author === snapshot.currentMemberId;
            const ai = item.author === "ai";
            const author = ai ? "ИИ-посредник" : memberName(snapshot, item.author);
            return (
              <OrbSinkItem key={item.id} style={[styles.messageRow, mine && styles.messageMine]}>
                <View style={[styles.avatar, ai && styles.aiAvatar]}>
                  {ai ? <Ionicons color={ink.muted} name="sparkles-outline" size={12} /> : <Text style={styles.avatarText}>{author.slice(0, 1)}</Text>}
                </View>
                <DarkGlass radius={20} style={[styles.bubble, mine && styles.bubbleMine]}>
                  <Text style={styles.bubbleAuthor}>{author}</Text>
                  <Text style={styles.bubbleText}>{item.content}</Text>
                  <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{formatTime(item.createdAt)}</Text>
                </DarkGlass>
              </OrbSinkItem>
            );
          })}
        </View>
      ) : (
        <View style={styles.chatEmpty}>
          <View style={styles.chatEmptyIcon}><Ionicons color={ink.muted} name="chatbubble-outline" size={24} /></View>
          <Text style={styles.chatEmptyTitle}>Начните общий разговор</Text>
          <Text style={styles.chatEmptyText}>Это общий чат — оба видят всё, что здесь написано. Позже сюда же подключится ИИ-посредник, третьим участником.</Text>
        </View>
      )}

    </>
  );
}

function ChatComposer() {
  const { addChatMessage } = useAppData();
  const [message, setMessage] = useState("");
  const send = () => {
    const content = message.trim();
    if (!content) return;
    addChatMessage(content);
    setMessage("");
  };
  return <View style={styles.composerDock}>
    <View style={styles.composer}>
      <DarkGlass radius={22} style={styles.composerInput}>
        <TextInput
          maxLength={5000}
          multiline
          onChangeText={setMessage}
          placeholder="Сообщение для общего разговора"
          placeholderTextColor={ink.faint}
          style={styles.textInput}
          value={message}
        />
      </DarkGlass>
      <Pressable accessibilityLabel="Отправить" disabled={!message.trim()} onPress={send} style={({ pressed }) => [styles.send, !message.trim() && styles.sendDisabled, pressed && styles.pressed]}>
        <Ionicons color="#211D2A" name="arrow-up" size={18} />
      </Pressable>
    </View>
  </View>;
}

function QuietContent() {
  const { accessToken, refreshSession } = useAuth();
  const [concern, setConcern] = useState("");
  const [change, setChange] = useState("");
  const [sending, setSending] = useState(false);
  const disabled = sending || !concern.trim() || !change.trim();

  const submit = async () => {
    if (!accessToken || disabled) return;
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
      Alert.alert("Обращение сохранено", "Партнёр не увидит исходный текст. ИИ использует его только для безопасных персональных рекомендаций.");
    } catch (error) {
      Alert.alert("Не удалось отправить", error instanceof Error ? error.message : "Попробуйте ещё раз позже.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <DarkGlass radius={24} style={styles.lockCard}>
        <View style={styles.lockRow}>
          <View style={styles.lockIcon}><Ionicons color={ink.muted} name="lock-closed-outline" size={17} /></View>
          <View style={styles.lockCopy}>
            <Text style={styles.lockTitle}>Личное обращение</Text>
            <Text style={styles.lockDescription}>После отправки его нельзя будет открыть даже здесь. Партнёр не увидит исходный текст.</Text>
          </View>
        </View>
      </DarkGlass>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Что вас беспокоит или чего вам не хватает</Text>
        <DarkGlass radius={18} style={styles.fieldBox}>
          <TextInput editable={!sending} maxLength={5000} multiline onChangeText={setConcern} placeholder="Опишите ситуацию своими словами" placeholderTextColor={ink.faint} style={styles.fieldInput} value={concern} />
        </DarkGlass>
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Какого изменения вы хотели бы</Text>
        <DarkGlass radius={18} style={styles.fieldBox}>
          <TextInput editable={!sending} maxLength={5000} multiline onChangeText={setChange} placeholder="Сформулируйте конкретную просьбу" placeholderTextColor={ink.faint} style={styles.fieldInput} value={change} />
        </DarkGlass>
      </View>
      <Pressable disabled={disabled} onPress={() => void submit()} style={({ pressed }) => [styles.quietSend, disabled && styles.quietSendDisabled, pressed && styles.pressed]}>
        <Ionicons color={disabled ? ink.muted : "#211D2A"} name="lock-closed-outline" size={16} />
        <Text style={[styles.quietSendText, disabled && styles.quietSendTextDisabled]}>{sending ? "Шифруем и отправляем…" : "Зашифровать и отправить"}</Text>
      </Pressable>
      <DarkGlass radius={20} style={styles.infoCard}>
        <Text style={styles.infoTitle}>Что будет дальше</Text>
        <Text style={styles.infoDescription}>Пока обращение только надёжно сохраняется. Анализ появится после подключения ИИ-модели.</Text>
      </DarkGlass>
    </>
  );
}

function ObservationsContent() {
  return (
    <View style={styles.observations}>
      <AiOrb dark size={64} />
      <Text style={styles.observationsTitle}>Наблюдений пока нет</Text>
      <Text style={styles.observationsText}>Здесь появятся закономерности, которые ИИ заметит только в общих данных — тех же, что видите вы оба.</Text>
      <Text style={styles.observationsTag}>Ожидается на следующем этапе</Text>
    </View>
  );
}

function AccessContent() {
  return (
    <View style={styles.access}>
      <SectionTitle>Доступно ИИ</SectionTitle>
      <DarkGlass radius={24} style={styles.accessList}>
        <AccessRow detail="Сообщения, которые вы оба и так видите" title="Общий чат" />
        <AccessRow detail="Общее пространство пары" title="Записи, планы и календарь" />
        <AccessRow detail="Только то, что вы вносили вместе" title="Договорённости и разборы ссор" />
      </DarkGlass>
      <SectionTitle>Закрыто навсегда</SectionTitle>
      <DarkGlass radius={24} style={styles.accessList}>
        <AccessRow denied detail="Партнёр никогда не увидит исходный текст" title="Исходный текст тихого канала" />
        <AccessRow denied detail="Ни переписки, ни файлов, ни данных с устройства" title="Что-либо за пределами пары" />
      </DarkGlass>
      <DarkGlass radius={22} style={styles.ruleCard}>
        <Text style={styles.ruleTitle}>ИИ ничего не меняет молча</Text>
        <Text style={styles.ruleText}>Любое изменение в ваших данных проходит один и тот же путь. Отменить можно на любом шаге и после.</Text>
        <View style={styles.steps}>
          {["Предпросмотр изменения", "Ваше подтверждение", "Запись в журнале", "Отмена в любой момент"].map((label, index) => (
            <View key={label} style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
              <Text style={styles.stepText}>{label}</Text>
            </View>
          ))}
        </View>
      </DarkGlass>
    </View>
  );
}

function SectionTitle({ children }: PropsWithChildren) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionTitleText}>{children}</Text><View style={styles.sectionLine} /></View>;
}

function AccessRow({ denied = false, detail, title }: { denied?: boolean; detail: string; title: string }) {
  return (
    <View style={styles.accessRow}>
      <View style={[styles.accessMark, denied && styles.accessMarkDenied]}>
        <Ionicons color={ink.muted} name={denied ? "close" : "checkmark"} size={15} />
      </View>
      <View style={styles.accessCopy}><Text style={styles.accessTitle}>{title}</Text><Text style={styles.accessDetail}>{detail}</Text></View>
    </View>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
}

const font = "GolosText";
const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { backgroundColor: "#070707", flex: 1 },
  content: { paddingBottom: 126, paddingHorizontal: 20, paddingTop: 4 },
  chatContent: { paddingBottom: 194 },
  header: { alignItems: "center", flexDirection: "row", gap: 11 },
  heading: { flex: 1, minWidth: 0 },
  kicker: { color: ink.faint, fontFamily: font, fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: ink.strong, fontFamily: font, fontSize: 23, fontWeight: "600", letterSpacing: -0.64, marginTop: 4 },
  tool: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 19, borderTopColor: "rgba(255,255,255,0.42)", borderTopWidth: StyleSheet.hairlineWidth, height: 38, justifyContent: "center", width: 38 },
  glass: { backgroundColor: "rgba(255,255,255,0.085)", overflow: "hidden", shadowColor: "#000000", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.48, shadowRadius: 14 },
  segment: { alignItems: "center", flexDirection: "row", gap: 5, height: 54, marginTop: 16, padding: 5 },
  mode: { alignItems: "center", borderRadius: 20, flex: 1, flexDirection: "row", gap: 5, height: 44, justifyContent: "center", minWidth: 0, paddingHorizontal: 4 },
  modeHero: { flex: 1.2, marginHorizontal: -1 },
  modeSelected: { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.16)", borderTopColor: "rgba(255,255,255,0.40)", borderWidth: StyleSheet.hairlineWidth },
  modeHeroSelected: { backgroundColor: "#E7E4EA", shadowColor: "#000000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.42, shadowRadius: 8 },
  modeLabel: { color: ink.faint, fontFamily: font, fontSize: 11, fontWeight: "500", letterSpacing: -0.13 },
  modeHeroLabel: { color: ink.muted, fontSize: 12.5, fontWeight: "600" },
  modeLabelSelected: { color: ink.strong },
  modeHeroLabelSelected: { color: "#211D2A" },
  systemNote: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(255,255,255,0.13)", borderColor: "rgba(255,255,255,0.18)", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 7, height: 28, marginTop: 18, paddingHorizontal: 13 },
  systemNoteText: { color: ink.faint, fontFamily: font, fontSize: 11, fontWeight: "500", letterSpacing: -0.04 },
  thread: { gap: 11, marginTop: 16 },
  messageRow: { alignItems: "flex-start", alignSelf: "flex-start", flexDirection: "row", gap: 9, maxWidth: "86%" },
  messageMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  avatar: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.28)", borderColor: "rgba(255,255,255,0.30)", borderRadius: 13, borderTopColor: "rgba(255,255,255,0.70)", borderWidth: StyleSheet.hairlineWidth, height: 26, justifyContent: "center", marginTop: 2, width: 26 },
  aiAvatar: { backgroundColor: "rgba(255,255,255,0.10)" },
  avatarText: { color: ink.strong, fontFamily: font, fontSize: 10.5, fontWeight: "600" },
  bubble: { minWidth: 84, paddingHorizontal: 12, paddingVertical: 7 },
  bubbleMine: { backgroundColor: "rgba(255,255,255,0.17)" },
  bubbleAuthor: { color: ink.faint, fontFamily: font, fontSize: 10.5, fontWeight: "600", letterSpacing: 0.2 },
  bubbleText: { color: ink.strong, fontFamily: font, fontSize: 14, fontWeight: "400", letterSpacing: -0.08, lineHeight: 18, marginTop: 2 },
  bubbleTime: { color: ink.faint, fontFamily: font, fontSize: 9.5, fontWeight: "400", marginTop: 3, textAlign: "right" },
  bubbleTimeMine: { textAlign: "left" },
  chatEmpty: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 52 },
  chatEmptyIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 19, height: 54, justifyContent: "center", width: 54 },
  chatEmptyTitle: { color: ink.strong, fontFamily: font, fontSize: 18, fontWeight: "600", letterSpacing: -0.43, marginTop: 16 },
  chatEmptyText: { color: ink.muted, fontFamily: font, fontSize: 13.5, lineHeight: 20.5, marginTop: 9, maxWidth: 272, textAlign: "center" },
  composerDock: { bottom: 86, left: 0, paddingHorizontal: 20, position: "absolute", right: 0 },
  composer: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
  composerInput: { flex: 1, minHeight: 42, paddingHorizontal: 15, paddingVertical: 8 },
  textInput: { color: ink.strong, fontFamily: font, fontSize: 14, lineHeight: 20, maxHeight: 110, minHeight: 24, padding: 0 },
  send: { alignItems: "center", backgroundColor: "#E7E4EA", borderRadius: 21, height: 42, justifyContent: "center", shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.24, shadowRadius: 6, width: 42 },
  sendDisabled: { backgroundColor: "rgba(255,255,255,0.16)", opacity: 0.6 },
  pressed: { opacity: 0.76 },
  lockCard: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 17 },
  lockRow: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  lockIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderColor: "rgba(255,255,255,0.22)", borderRadius: 12, borderTopColor: "rgba(255,255,255,0.52)", borderWidth: StyleSheet.hairlineWidth, height: 36, justifyContent: "center", width: 36 },
  lockCopy: { flex: 1 },
  lockTitle: { color: ink.strong, fontFamily: font, fontSize: 15.5, fontWeight: "600", letterSpacing: -0.31 },
  lockDescription: { color: ink.muted, fontFamily: font, fontSize: 12.5, lineHeight: 18.2, marginTop: 5 },
  field: { marginTop: 14 },
  fieldLabel: { color: ink.strong, fontFamily: font, fontSize: 12.5, fontWeight: "600", letterSpacing: -0.1 },
  fieldBox: { marginTop: 8, minHeight: 84, paddingHorizontal: 14, paddingVertical: 13 },
  fieldInput: { color: ink.strong, fontFamily: font, fontSize: 13.5, lineHeight: 20.25, minHeight: 58, padding: 0, textAlignVertical: "top" },
  quietSend: { alignItems: "center", backgroundColor: "#E7E4EA", borderRadius: 23, flexDirection: "row", gap: 8, height: 46, justifyContent: "center", marginTop: 16 },
  quietSendDisabled: { backgroundColor: "rgba(255,255,255,0.16)" },
  quietSendText: { color: "#211D2A", fontFamily: font, fontSize: 14, fontWeight: "600", letterSpacing: -0.2 },
  quietSendTextDisabled: { color: ink.muted },
  infoCard: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 14 },
  infoTitle: { color: ink.faint, fontFamily: font, fontSize: 9.5, fontWeight: "600", letterSpacing: 1.33, textTransform: "uppercase" },
  infoDescription: { color: ink.muted, fontFamily: font, fontSize: 12.5, lineHeight: 18.2, marginTop: 6 },
  observations: { alignItems: "center", paddingBottom: 8, paddingHorizontal: 26, paddingTop: 44 },
  observationsTitle: { color: ink.strong, fontFamily: font, fontSize: 19, fontWeight: "600", letterSpacing: -0.49, lineHeight: 24, marginTop: 20, textAlign: "center" },
  observationsText: { color: ink.muted, fontFamily: font, fontSize: 13.5, lineHeight: 20.5, marginTop: 10, maxWidth: 290, textAlign: "center" },
  observationsTag: { backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.28)", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, color: ink.faint, fontFamily: font, fontSize: 11, fontWeight: "500", marginTop: 16, overflow: "hidden", paddingHorizontal: 13, paddingVertical: 6 },
  access: { paddingTop: 0 },
  sectionTitle: { alignItems: "center", flexDirection: "row", gap: 9, marginHorizontal: 2, marginTop: 22 },
  sectionTitleText: { color: ink.faint, fontFamily: font, fontSize: 10, fontWeight: "600", letterSpacing: 1.6, textTransform: "uppercase" },
  sectionLine: { backgroundColor: ink.hair, flex: 1, height: StyleSheet.hairlineWidth },
  accessList: { marginTop: 10, padding: 6 },
  accessRow: { alignItems: "flex-start", flexDirection: "row", gap: 12, minHeight: 54, paddingHorizontal: 10, paddingVertical: 11 },
  accessMark: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.20)", borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, height: 30, justifyContent: "center", marginTop: 1, width: 30 },
  accessMarkDenied: { backgroundColor: "rgba(255,255,255,0.07)" },
  accessCopy: { flex: 1, minWidth: 0 },
  accessTitle: { color: ink.strong, fontFamily: font, fontSize: 14, fontWeight: "600", letterSpacing: -0.2 },
  accessDetail: { color: ink.faint, fontFamily: font, fontSize: 12, lineHeight: 17, marginTop: 3 },
  ruleCard: { marginTop: 14, paddingHorizontal: 17, paddingVertical: 15 },
  ruleTitle: { color: ink.strong, fontFamily: font, fontSize: 14.5, fontWeight: "600", letterSpacing: -0.26 },
  ruleText: { color: ink.muted, fontFamily: font, fontSize: 12.5, lineHeight: 18.5, marginTop: 6 },
  steps: { marginTop: 13 },
  step: { alignItems: "center", flexDirection: "row", gap: 11, height: 29 },
  stepNumber: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.11)", borderColor: "rgba(255,255,255,0.18)", borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, height: 19, justifyContent: "center", width: 19 },
  stepNumberText: { color: ink.muted, fontFamily: font, fontSize: 9.5, fontWeight: "600" },
  stepText: { color: ink.muted, fontFamily: font, fontSize: 12.5, fontWeight: "500", letterSpacing: -0.1 },
});
