import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, StyleSheet, Switch, Text, View } from "react-native";
import { V2Button as AppButton } from "@/ui-v2";
import { InnerGlass as Surface, InnerScreen as Screen, InnerScreenHeader } from "@/components/redesign/InnerScreenChrome";
import { backendClient } from "@/services/backendClient";
import { registerPushToken } from "@/services/pushNotifications";
import { ALL_PUSH_CATEGORIES, readNotificationPrefs, writeNotificationPrefs, type NotificationPrefs, type PushCategory } from "@/services/notificationPrefs";
import { useAuth } from "@/state/AuthContext";
import { fill, ink, materialSpacing, materialType, rim } from "@/ui-v2/styleTokens";
import { colors } from "@/theme/tokens";

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
  const [draftHour, setDraftHour] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [permission, setPermission] = useState<Notifications.PermissionStatus | null>(null);

  const refreshPermission = async () => setPermission((await Notifications.getPermissionsAsync()).status);

  useEffect(() => {
    void readNotificationPrefs().then(setPrefs);
  }, []);

  useFocusEffect(useCallback(() => {
    void refreshPermission();
  }, []));

  const enableNotifications = async () => {
    if (!accessToken) return;
    setSaving(true);
    setSaveError(null);
    try {
      const token = await registerPushToken(accessToken, true);
      await refreshPermission();
      if (!token) setSaveError("Разрешение не получено или push-токен недоступен для этой подписи приложения.");
    } finally {
      setSaving(false);
    }
  };

  const persist = async (next: NotificationPrefs) => {
    const previous = prefs;
    setPrefs(next);
    setSaving(true);
    setSaveError(null);
    try {
      await writeNotificationPrefs(next);
      if (accessToken) await registerPushToken(accessToken);
    } catch (caught) {
      if (previous) setPrefs(previous);
      setSaveError(caught instanceof Error ? caught.message : "Не удалось сохранить настройки");
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
    setActivePicker(null);
    setDraftHour(null);
    void persist({ ...prefs, quietHoursStart: enabled ? 22 : null, quietHoursEnd: enabled ? 8 : null });
  };

  const openHourPicker = (kind: "start" | "end") => {
    if (!prefs) return;
    setDraftHour((kind === "start" ? prefs.quietHoursStart : prefs.quietHoursEnd) ?? (kind === "start" ? 22 : 8));
    setActivePicker(kind);
  };

  const finishHourPicker = () => {
    if (!prefs || !activePicker || draftHour === null) { setActivePicker(null); return; }
    const next = activePicker === "start" ? { ...prefs, quietHoursStart: draftHour } : { ...prefs, quietHoursEnd: draftHour };
    setActivePicker(null);
    setDraftHour(null);
    void persist(next);
  };

  if (!prefs) return null;

  const quietHoursEnabled = prefs.quietHoursStart !== null && prefs.quietHoursEnd !== null;

  return (
    <Screen header={<InnerScreenHeader kicker="Приложение" title="Уведомления" subtitle="Какие уведомления получать на этом устройстве и в какие часы молчать." />}>
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Разрешение устройства</Text>
        <Text style={styles.hint}>{permission === Notifications.PermissionStatus.GRANTED ? "Уведомления разрешены в iOS. Доставка всё ещё зависит от возможностей подписи приложения." : permission === Notifications.PermissionStatus.DENIED ? "Уведомления запрещены в настройках iPhone." : "Приложение ещё не запрашивало разрешение на уведомления."}</Text>
        {permission === Notifications.PermissionStatus.DENIED
          ? <AppButton label="Открыть настройки iPhone" onPress={() => void Linking.openSettings()} variant="secondary" />
          : <AppButton disabled={saving} label={permission === Notifications.PermissionStatus.GRANTED ? "Обновить регистрацию" : "Разрешить уведомления"} onPress={() => void enableNotifications()} variant="secondary" />}
      </Surface>
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Категории</Text>
        {ALL_PUSH_CATEGORIES.map((category) => (
          <View key={category} style={styles.row}>
            <Text style={styles.rowLabel}>{categoryLabels[category]}</Text>
            <Switch
              disabled={saving}
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
          <Switch disabled={saving} onValueChange={toggleQuietHours} trackColor={{ true: colors.seaSoft }} thumbColor={quietHoursEnabled ? colors.sea : colors.white} value={quietHoursEnabled} />
        </View>
        {quietHoursEnabled ? (
          <>
            <Text style={styles.hint}>Уведомления не будут приходить в это окно (учитывается часовой пояс телефона).</Text>
            <View style={styles.timeRow}>
              <AppButton disabled={saving} label={`С ${hourLabel(prefs.quietHoursStart)}`} onPress={() => openHourPicker("start")} style={styles.timeButton} variant="secondary" />
              <AppButton disabled={saving} label={`До ${hourLabel(prefs.quietHoursEnd)}`} onPress={() => openHourPicker("end")} style={styles.timeButton} variant="secondary" />
            </View>
            {activePicker ? (
              <DateTimePicker
                display={Platform.OS === "ios" ? "spinner" : "default"}
                mode="time"
                onChange={(_, date) => {
                  if (!date || !prefs) { if (Platform.OS !== "ios") setActivePicker(null); return; }
                  const hour = date.getHours();
                  if (Platform.OS === "ios") setDraftHour(hour);
                  else {
                    setActivePicker(null);
                    void persist(activePicker === "start" ? { ...prefs, quietHoursStart: hour } : { ...prefs, quietHoursEnd: hour });
                  }
                }}
                value={new Date(2000, 0, 1, draftHour ?? (activePicker === "start" ? prefs.quietHoursStart : prefs.quietHoursEnd) ?? 22)}
              />
            ) : null}
            {Platform.OS === "ios" && activePicker ? <AppButton label="Готово" onPress={finishHourPicker} style={styles.doneButton} /> : null}
          </>
        ) : null}
      </Surface>
      {saving ? <Text style={styles.hint}>Сохраняем…</Text> : null}
      {saveError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{saveError}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: materialSpacing.md, marginBottom: materialSpacing.lg },
  sectionTitle: { color: ink.strong, ...materialType.section },
  row: { alignItems: "center", backgroundColor: fill.quiet, borderColor: rim.hair, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 54, paddingHorizontal: materialSpacing.md },
  rowLabel: { color: ink.strong, fontFamily: "GolosText", fontSize: 14.5 },
  hint: { color: ink.muted, ...materialType.body },
  error: { color: colors.danger, ...materialType.body },
  timeRow: { flexDirection: "row", gap: materialSpacing.md },
  timeButton: { flex: 1 },
  doneButton: { marginTop: materialSpacing.sm },
});
