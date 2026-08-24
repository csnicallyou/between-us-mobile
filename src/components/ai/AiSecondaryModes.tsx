import { type PropsWithChildren, useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { AiOrb } from "@/components/AiOrb";
import { BackendError, backendClient } from "@/services/backendClient";
import { memberName, moodLabels } from "@/domain/labels";
import { formatDateSafe } from "@/domain/dataSafety";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { V2Glass } from "@/ui-v2";

const ink = {
  strong: "rgba(255,255,255,0.96)",
  muted: "rgba(255,255,255,0.60)",
  faint: "rgba(255,255,255,0.38)",
  hair: "rgba(255,255,255,0.10)",
} as const;

function DarkGlass({ children, radius = 22, style }: PropsWithChildren<{ radius?: number; style?: StyleProp<ViewStyle> }>) {
  return (
    <V2Glass dark plain radius={radius} style={[styles.glass, style]}>
      {children}
    </V2Glass>
  );
}

export interface QuietContentProps {
  change: string;
  concern: string;
  sending: boolean;
  setChange: (value: string) => void;
  setConcern: (value: string) => void;
  setSending: (value: boolean) => void;
  submissionLock: { current: boolean };
}

export function QuietContent({
  change,
  concern,
  sending,
  setChange,
  setConcern,
  setSending,
  submissionLock,
}: QuietContentProps) {
  const { accessToken, refreshSession } = useAuth();
  const disabled = sending || !accessToken || !concern.trim() || !change.trim();

  const submit = async () => {
    if (!accessToken || disabled || submissionLock.current) return;
    submissionLock.current = true;
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
      Alert.alert("Обращение сохранено", "Текст сохранён в зашифрованном виде для будущего анализа. Сейчас ИИ его не обрабатывает, а партнёр не увидит исходный текст.");
    } catch (error) {
      Alert.alert("Не удалось отправить", error instanceof Error ? error.message : "Попробуйте ещё раз позже.");
    } finally {
      submissionLock.current = false;
      setSending(false);
    }
  };

  return (
    <>
      <DarkGlass radius={24} style={styles.lockCard}>
        <View style={styles.lockRow}>
          <View style={styles.lockIcon}><Ionicons color={ink.muted} name="lock-closed-outline" size={17} /></View>
          <View style={styles.lockCopy}>
            <Text style={styles.lockTitle}>Закрыто от партнёра</Text>
            <Text style={styles.lockDescription}>До отправки черновик хранится только в защищённом хранилище этого устройства. После отправки партнёр не увидит исходный текст, а ИИ пока его не обрабатывает.</Text>
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
      <Pressable accessibilityLabel="Зашифровать и отправить" accessibilityRole="button" disabled={disabled} onPress={() => void submit()} style={({ pressed }) => [styles.quietSend, disabled && styles.quietSendDisabled, pressed && styles.pressed]}>
        <Ionicons color={disabled ? ink.muted : "#211D2A"} name="lock-closed-outline" size={16} />
        <Text style={[styles.quietSendText, disabled && styles.quietSendTextDisabled]}>{sending ? "Шифруем и отправляем…" : "Зашифровать и отправить"}</Text>
      </Pressable>
      <DarkGlass radius={20} style={styles.infoCard}>
        <Text style={styles.infoTitle}>Что будет дальше</Text>
        <Text style={styles.infoDescription}>Пока обращение только зашифрованно сохраняется. Анализ появится отдельным этапом после подключения ИИ-модели.</Text>
      </DarkGlass>
    </>
  );
}

export function ObservationsContent() {
  const { snapshot } = useAppData();
  const observations = useMemo(() => {
    const result: Array<{ detail: string; icon: keyof typeof Ionicons.glyphMap; title: string; type: string }> = [];
    const pendingAgreements = snapshot.agreements.filter((agreement) => !snapshot.members.every((member) => Boolean(agreement.acceptedBy?.[member.id])));
    if (pendingAgreements.length) {
      result.push({
        detail: pendingAgreements.slice(0, 2).map((agreement) => agreement.title).join(" · "),
        icon: "checkmark-circle-outline",
        title: `${pendingAgreements.length} ${pendingAgreements.length === 1 ? "договорённость ждёт" : "договорённости ждут"} подтверждения`,
        type: "Договорённости",
      });
    }
    const nextPlan = [...snapshot.plans]
      .filter((plan) => plan.status !== "done")
      .sort((left, right) => (left.date ?? "9999-12-31").localeCompare(right.date ?? "9999-12-31"))[0];
    if (nextPlan) {
      result.push({
        detail: nextPlan.date ? formatDateSafe(nextPlan.date, { day: "numeric", month: "long" }, "Дата не указана") : "Дата пока не выбрана",
        icon: "calendar-outline",
        title: nextPlan.title,
        type: "Ближайший план",
      });
    }
    const moods = snapshot.members.flatMap((member) => {
      const mood = snapshot.moods[member.id]?.mood;
      return mood ? [`${memberName(snapshot, member.id)} — ${moodLabels[mood].toLowerCase()}`] : [];
    });
    if (moods.length) {
      result.push({ detail: moods.join(" · "), icon: "heart-outline", title: "Как вы себя отмечаете сейчас", type: "Настроения" });
    }
    const latestLesson = [...snapshot.conflicts]
      .filter((entry) => entry.lesson.trim())
      .sort((left, right) => right.date.localeCompare(left.date))[0];
    if (latestLesson) {
      result.push({ detail: latestLesson.lesson, icon: "sparkles-outline", title: latestLesson.title, type: "Последний сохранённый вывод" });
    }
    return result;
  }, [snapshot]);

  return (
    <View style={styles.observations}>
      <View style={styles.observationsIntro}>
        <AiOrb dark size={52} />
        <View style={styles.observationsIntroCopy}>
          <Text style={styles.observationsTitle}>Сводка общего пространства</Text>
          <Text style={styles.observationsText}>Рассчитано на устройстве из данных, которые вы оба уже видите. ИИ пока не подключён.</Text>
        </View>
      </View>
      {observations.length ? <View style={styles.observationList}>{observations.map((item) => (
        <DarkGlass key={item.type} radius={20} style={styles.observationCard}>
          <View style={styles.observationIcon}><Ionicons color={ink.muted} name={item.icon} size={17} /></View>
          <View style={styles.observationCopy}>
            <Text style={styles.observationType}>{item.type}</Text>
            <Text style={styles.observationTitle}>{item.title}</Text>
            <Text style={styles.observationDetail}>{item.detail}</Text>
          </View>
        </DarkGlass>
      ))}</View> : <DarkGlass radius={20} style={styles.observationsEmpty}>
        <Text style={styles.observationsEmptyTitle}>Пока нечего собирать в сводку</Text>
        <Text style={styles.observationsEmptyText}>Добавьте настроение, план, договорённость или полезный вывод из разговора.</Text>
      </DarkGlass>}
      <Text style={styles.observationsTag}>Без анализа моделью</Text>
    </View>
  );
}

export function AccessContent() {
  return (
    <View style={styles.access}>
      <DarkGlass radius={20} style={styles.betaStatus}>
        <View style={styles.betaStatusTitle}>
          <Ionicons color={ink.muted} name="information-circle-outline" size={16} />
          <Text style={styles.betaStatusTitleText}>ИИ пока не подключён</Text>
        </View>
        <Text style={styles.betaStatusText}>Сейчас данные приложения не анализируются моделью. Ниже показаны правила для будущего подключения.</Text>
      </DarkGlass>
      <SectionTitle>После подключения</SectionTitle>
      <DarkGlass radius={24} style={styles.accessList}>
        <AccessRow detail="Сообщения, которые вы оба и так видите" title="Общий чат" />
        <AccessRow detail="Общее пространство пары" title="Записи, планы и календарь" />
        <AccessRow detail="Только то, что вы вносили вместе" title="Договорённости и разборы ссор" />
      </DarkGlass>
      <SectionTitle>Ограничения</SectionTitle>
      <DarkGlass radius={24} style={styles.accessList}>
        <AccessRow denied detail="Сейчас только зашифрованно хранится; партнёр никогда не увидит исходный текст" title="Исходный текст тихого канала" />
        <AccessRow denied detail="Ни переписки, ни файлов, ни данных с устройства" title="Что-либо за пределами пары" />
      </DarkGlass>
      <DarkGlass radius={22} style={styles.ruleCard}>
        <Text style={styles.ruleTitle}>ИИ не сможет менять данные молча</Text>
        <Text style={styles.ruleText}>После подключения любое изменение в ваших данных будет проходить один и тот же путь. Отменить можно на любом шаге и после.</Text>
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

const font = "GolosText";
const styles = StyleSheet.create({
  glass: { backgroundColor: "rgba(255,255,255,0.085)", overflow: "hidden", shadowColor: "#000000", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.48, shadowRadius: 14 },
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
  observations: { paddingBottom: 8, paddingTop: 20 },
  observationsIntro: { alignItems: "center", flexDirection: "row", gap: 13, paddingHorizontal: 4 },
  observationsIntroCopy: { flex: 1, minWidth: 0 },
  observationsTitle: { color: ink.strong, fontFamily: font, fontSize: 18, fontWeight: "600", letterSpacing: -0.43, lineHeight: 23 },
  observationsText: { color: ink.muted, fontFamily: font, fontSize: 12.5, lineHeight: 18.5, marginTop: 5 },
  observationList: { gap: 10, marginTop: 18 },
  observationCard: { alignItems: "flex-start", flexDirection: "row", gap: 12, paddingHorizontal: 15, paddingVertical: 14 },
  observationIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.13)", borderColor: "rgba(255,255,255,0.20)", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, height: 36, justifyContent: "center", width: 36 },
  observationCopy: { flex: 1, minWidth: 0 },
  observationType: { color: ink.faint, fontFamily: font, fontSize: 9.5, fontWeight: "600", letterSpacing: 1.25, textTransform: "uppercase" },
  observationTitle: { color: ink.strong, fontFamily: font, fontSize: 14, fontWeight: "600", lineHeight: 18.5, marginTop: 5 },
  observationDetail: { color: ink.muted, fontFamily: font, fontSize: 12, lineHeight: 17.5, marginTop: 4 },
  observationsEmpty: { alignItems: "center", marginTop: 18, paddingHorizontal: 24, paddingVertical: 28 },
  observationsEmptyTitle: { color: ink.strong, fontFamily: font, fontSize: 15, fontWeight: "600", textAlign: "center" },
  observationsEmptyText: { color: ink.muted, fontFamily: font, fontSize: 12.5, lineHeight: 18.5, marginTop: 7, textAlign: "center" },
  observationsTag: { alignSelf: "center", backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.28)", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, color: ink.faint, fontFamily: font, fontSize: 11, fontWeight: "500", marginTop: 16, overflow: "hidden", paddingHorizontal: 13, paddingVertical: 6 },
  access: { paddingTop: 0 },
  betaStatus: { marginTop: 20, paddingHorizontal: 16, paddingVertical: 14 },
  betaStatusTitle: { alignItems: "center", flexDirection: "row", gap: 8 },
  betaStatusTitleText: { color: ink.strong, fontFamily: font, fontSize: 14, fontWeight: "600", letterSpacing: -0.2 },
  betaStatusText: { color: ink.muted, fontFamily: font, fontSize: 12.5, lineHeight: 18.5, marginTop: 7 },
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
