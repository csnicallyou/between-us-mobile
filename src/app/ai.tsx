import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, type Href, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  KeyboardAvoidingView,
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { AiOrb } from "@/components/AiOrb";
import { AiChatComposer, AiChatContent } from "@/components/ai/AiChat";
import { AccessContent, ObservationsContent, QuietContent } from "@/components/ai/AiSecondaryModes";
import { readQuietDraft, writeQuietDraft } from "@/services/quietDraftStorage";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { ScrollSuctionProvider } from "@/motion/ScrollSuction";
import { V2Glass } from "@/ui-v2";
import { DOCK_COMPOSITE_HEIGHT, DOCK_CONTENT_BOTTOM } from "@/components/dockGeometry";

type Mode = "quiet" | "chat" | "observations" | "info";
type PrimaryMode = Exclude<Mode, "info">;

const CHAT_BOTTOM_THRESHOLD = 72;

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
  const params = useLocalSearchParams<{ mode?: string; messageId?: string }>();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("chat");
  const [quietConcern, setQuietConcern] = useState("");
  const [quietChange, setQuietChange] = useState("");
  const [quietSending, setQuietSending] = useState(false);
  const [quietDraftHydrated, setQuietDraftHydrated] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const previousMode = useRef<PrimaryMode>("chat");
  const quietSubmissionLock = useRef(false);
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const scrollOffsetNow = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const chatOpened = useRef(false);
  const isNearChatBottom = useRef(true);
  const shouldScrollChatToBottom = useRef(true);
  const { pendingSyncCount, snapshot, syncNow } = useAppData();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const latestChatId = snapshot.chat[snapshot.chat.length - 1]?.id ?? null;
  const observedChatId = useRef<string | null>(null);
  const threadOffset = useRef<number | null>(null);
  const messageOffsets = useRef(new Map<string, number>());
  const revealedMessageId = useRef("");
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (params.mode !== "chat") return;
    previousMode.current = "chat";
    shouldScrollChatToBottom.current = !params.messageId;
    setMode("chat");
    router.setParams({ mode: undefined });
  }, [params.messageId, params.mode, router]);

  const revealMessage = useCallback((messageId: string) => {
    const threadY = threadOffset.current;
    const messageY = messageOffsets.current.get(messageId);
    if (threadY === null || messageY === undefined || revealedMessageId.current === messageId) return;
    revealedMessageId.current = messageId;
    shouldScrollChatToBottom.current = false;
    scrollRef.current?.scrollTo({ animated: true, y: Math.max(0, threadY + messageY - 86) });
    setHighlightedMessageId(messageId);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedMessageId(null), 2200);
    router.setParams({ messageId: undefined, mode: undefined });
  }, [router]);

  useEffect(() => {
    if (!params.messageId) {
      revealedMessageId.current = "";
      return;
    }
    revealMessage(params.messageId);
  }, [params.messageId, revealMessage, snapshot.chat]);

  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
  }, []);

  useEffect(() => {
    let active = true;
    setQuietDraftHydrated(false);
    setQuietConcern("");
    setQuietChange("");
    if (!user?.id) return () => { active = false; };
    void readQuietDraft(user.id).then((draft) => {
      if (!active) return;
      setQuietConcern(draft?.concern ?? "");
      setQuietChange(draft?.change ?? "");
      setQuietDraftHydrated(true);
    }).catch(() => { if (active) setQuietDraftHydrated(true); });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!quietDraftHydrated || !user?.id) return;
    const timeout = setTimeout(() => {
      void writeQuietDraft(user.id, { change: quietChange, concern: quietConcern }).catch(() => undefined);
    }, 250);
    return () => clearTimeout(timeout);
  }, [quietChange, quietConcern, quietDraftHydrated, user?.id]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const scrollChatToBottom = useCallback((animated: boolean) => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated }));
  }, []);

  useEffect(() => {
    const changed = observedChatId.current !== latestChatId;
    observedChatId.current = latestChatId;
    if (!params.messageId && changed && (!chatOpened.current || isNearChatBottom.current)) {
      shouldScrollChatToBottom.current = true;
    }
    if (mode === "chat" && shouldScrollChatToBottom.current) {
      const animated = chatOpened.current;
      shouldScrollChatToBottom.current = false;
      chatOpened.current = true;
      isNearChatBottom.current = true;
      scrollChatToBottom(animated);
    }
  }, [latestChatId, mode, params.messageId, scrollChatToBottom]);

  const selectMode = (nextMode: PrimaryMode) => {
    previousMode.current = nextMode;
    setMode(nextMode);
  };

  const openInfo = () => {
    if (mode !== "info") previousMode.current = mode;
    setMode("info");
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    scrollOffsetNow.current = contentOffset.y;
    if (mode === "chat") {
      isNearChatBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - CHAT_BOTTOM_THRESHOLD;
    }
  };

  const handleContentSizeChange = () => {
    if (mode !== "chat" || !shouldScrollChatToBottom.current) return;
    const animated = chatOpened.current;
    shouldScrollChatToBottom.current = false;
    chatOpened.current = true;
    isNearChatBottom.current = true;
    scrollChatToBottom(animated);
  };

  const handleOwnMessageSent = () => {
    shouldScrollChatToBottom.current = true;
    isNearChatBottom.current = true;
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await syncNow();
    } catch {
      // Offline state is already shown inside the chat; avoid an unhandled pull
      // to refresh rejection while retaining the optimistic local messages.
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (mode === "chat" && keyboardVisible && isNearChatBottom.current) scrollChatToBottom(true);
  }, [keyboardVisible, mode, scrollChatToBottom]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <StatusBar style="light" />
      <AiBackground />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.chrome}>
          <Header info={mode === "info"} onBack={() => setMode(previousMode.current)} onInfo={openInfo} />
          {mode !== "info" ? <ModeSelector mode={mode} setMode={selectMode} /> : null}
        </View>
        <ScrollSuctionProvider dark offset={scrollOffset} offsetNow={scrollOffsetNow}>
          <Animated.ScrollView
            contentContainerStyle={[styles.content, mode === "chat" ? styles.chatContent : { paddingBottom: DOCK_CONTENT_BOTTOM + insets.bottom }]}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={handleContentSizeChange}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollOffset } } }], {
              listener: handleScroll,
              useNativeDriver: true,
            })}
            ref={scrollRef}
            refreshControl={<RefreshControl onRefresh={() => void refresh()} refreshing={refreshing} tintColor="rgba(255,255,255,0.72)" />}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {mode === "chat" ? <AiChatContent
              highlightedMessageId={highlightedMessageId}
              onMessageLayout={(messageId, event) => {
                messageOffsets.current.set(messageId, event.nativeEvent.layout.y);
                if (params.messageId === messageId) revealMessage(messageId);
              }}
              onThreadLayout={(event) => {
                threadOffset.current = event.nativeEvent.layout.y;
                if (params.messageId) revealMessage(params.messageId);
              }}
              pendingSyncCount={pendingSyncCount}
            /> : null}
            {mode === "quiet" ? (
              <QuietContent
                change={quietChange}
                concern={quietConcern}
                sending={quietSending}
                setChange={setQuietChange}
                setConcern={setQuietConcern}
                setSending={setQuietSending}
                submissionLock={quietSubmissionLock}
              />
            ) : null}
            {mode === "observations" ? <ObservationsContent /> : null}
            {mode === "info" ? <AccessContent /> : null}
          </Animated.ScrollView>
        </ScrollSuctionProvider>
        {mode === "chat" ? (
          <View style={[styles.composerDock, { paddingBottom: keyboardVisible ? 8 : DOCK_COMPOSITE_HEIGHT + insets.bottom + 8 }]}>
            <AiChatComposer onSent={handleOwnMessageSent} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
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
        <Pressable accessibilityLabel="Назад" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.tool, pressed && styles.pressed]}>
          <Ionicons color={ink.muted} name="chevron-back" size={20} />
        </Pressable>
      ) : <AiOrb dark size={36} />}
      <View style={styles.heading}>
        <Text style={styles.kicker}>Пространство ИИ</Text>
        <Text style={styles.title}>{info ? "Что видит ИИ" : "Мы и ИИ"}</Text>
      </View>
      {!info ? (
        <Pressable accessibilityLabel="Что видит ИИ" accessibilityRole="button" onPress={onInfo} style={({ pressed }) => [styles.tool, pressed && styles.pressed]}>
          <Ionicons color={ink.muted} name="information-circle-outline" size={19} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ModeSelector({ mode, setMode }: { mode: PrimaryMode; setMode: (mode: PrimaryMode) => void }) {
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

const font = "GolosText";
const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { backgroundColor: "#070707", flex: 1 },
  chrome: { paddingBottom: 2, paddingHorizontal: 20, paddingTop: 4, zIndex: 2 },
  content: { flexGrow: 1, paddingHorizontal: 20 },
  chatContent: { paddingBottom: 16 },
  header: { alignItems: "center", flexDirection: "row", gap: 11 },
  heading: { flex: 1, minWidth: 0 },
  kicker: { color: ink.faint, fontFamily: font, fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: ink.strong, fontFamily: font, fontSize: 23, fontWeight: "600", letterSpacing: -0.64, marginTop: 4 },
  tool: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 22, borderTopColor: "rgba(255,255,255,0.42)", borderTopWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  glass: { backgroundColor: "rgba(255,255,255,0.085)", overflow: "hidden", shadowColor: "#000000", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.48, shadowRadius: 14 },
  segment: { alignItems: "center", flexDirection: "row", gap: 5, height: 54, marginTop: 16, padding: 5 },
  mode: { alignItems: "center", borderRadius: 20, flex: 1, flexDirection: "row", gap: 5, height: 44, justifyContent: "center", minWidth: 0, paddingHorizontal: 4 },
  modeHero: { flex: 1.2, marginHorizontal: -1 },
  modeSelected: { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.16)", borderTopColor: "rgba(255,255,255,0.40)", borderWidth: StyleSheet.hairlineWidth },
  modeHeroSelected: { backgroundColor: "#E7E4EA", shadowColor: "#000000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.42, shadowRadius: 8, zIndex: 2 },
  modeLabel: { color: ink.faint, fontFamily: font, fontSize: 11, fontWeight: "500", letterSpacing: -0.13 },
  modeHeroLabel: { color: ink.muted, fontSize: 12.5, fontWeight: "600" },
  modeLabelSelected: { color: ink.strong },
  modeHeroLabelSelected: { color: "#211D2A" },
  composerDock: { paddingHorizontal: 20 },
  pressed: { opacity: 0.76 },
});
