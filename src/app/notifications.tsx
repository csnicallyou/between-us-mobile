import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import { backendClient } from "@/services/backendClient";
import { registerPushToken } from "@/services/pushNotifications";
import { ALL_PUSH_CATEGORIES, readNotificationPrefs, writeNotificationPrefs, type NotificationPrefs, type PushCategory } from "@/services/notificationPrefs";
import { useAuth } from "@/state/AuthContext";
import { colors, spacing } from "@/theme/tokens";

const categoryLabels: Record<PushCategory, string> = {
  chat: "Сообщения в чате",
  plan: "Новые планы",
  journal: "Записи в дневнике",
  memory: "Памятные события",
  agreement: "Договорённости",
};

function hourLabel(hour: number | null) {
  return hour === null ? "—" : `${String(hour).padStart(2, "0")}:00`;
}

export default function NotificationsScreen() {
  const { accessToken } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void readNotificationPrefs().then(setPrefs); }, []);

  const persist = async (next: NotificationPrefs) => {
    setPrefs(next);
    setSaving(true);
    await writeNotificationPrefs(next);
    try {
      if (accessToken) await registerPushToken(accessToken);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: PushCategory, enabled: boolean) => {
    if (!prefs) return;
    const categories = enabled ? [...prefs.categories, category] : prefs.categories.filter((item) => item !== category);
    void persist({ ...prefs, categories });
  };

  const toggleQuietHours = (enabled: boolean) => {
    if (!prefs) return;
    void persist({ ...prefs, quietHoursStart: enabled ? 22 : null, quietHoursEnd: enabled ? 8 : null });
  };

  if (!prefs) return null;

  const quietHoursEnabled = prefs.quietHoursStart !== null && prefs.quietHoursEnd !== null;

  return (
    <Screen header={<SubpageHeader title="Уведомления" subtitle="Что присылать партнёру и в какие часы молчать." />}>
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Категории</Text>
        {ALL_PUSH_CATEGORIES.map((category) => (
          <View key={category} style={styles.row}>
            <Text style={styles.rowLabel}>{categoryLabels[category]}</Text>
            <Switch
              onValueChange={(value) => toggleCategory(category, value)}
              trackColor={{ true: colors.seaSoft }}
              thumbColor={prefs.categories.includes(category) ? colors.sea : colors.white}
              value={prefs.categories.includes(category)}
            />
          </View>
        ))}
      </Surface>
      <Surface style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Тихие часы</Text>
          <Switch onValueChange={toggleQuietHours} trackColor={{ true: colors.seaSoft }} thumbColor={quietHoursEnabled ? colors.sea : colors.white} value={quietHoursEnabled} />
        </View>
        {quietHoursEnabled ? (
          <>
            <Text style={styles.hint}>Уведомления не будут приходить в это окно (учитывается часовой пояс телефона).</Text>
            <View style={styles.timeRow}>
              <AppButton label={`С ${hourLabel(prefs.quietHoursStart)}`} onPress={() => setActivePicker("start")} style={styles.timeButton} variant="secondary" />
              <AppButton label={`До ${hourLabel(prefs.quietHoursEnd)}`} onPress={() => setActivePicker("end")} style={styles.timeButton} variant="secondary" />
            </View>
            {activePicker ? (
              <DateTimePicker
                display={Platform.OS === "ios" ? "spinner" : "default"}
                mode="time"
                onChange={(_, date) => {
                  if (Platform.OS !== "ios") setActivePicker(null);
                  if (!date || !prefs) return;
                  const hour = date.getHours();
                  void persist(activePicker === "start" ? { ...prefs, quietHoursStart: hour } : { ...prefs, quietHoursEnd: hour });
                }}
                value={new Date(2000, 0, 1, (activePicker === "start" ? prefs.quietHoursStart : prefs.quietHoursEnd) ?? 22)}
              />
            ) : null}
            {Platform.OS === "ios" && activePicker ? <AppButton label="Готово" onPress={() => setActivePicker(null)} style={styles.doneButton} /> : null}
          </>
        ) : null}
      </Surface>
      {saving ? <Text style={styles.hint}>Сохраняем…</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginBottom: spacing.lg },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { color: colors.ink, fontSize: 15 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  timeRow: { flexDirection: "row", gap: spacing.md },
  timeButton: { flex: 1 },
  doneButton: { marginTop: spacing.sm },
});
