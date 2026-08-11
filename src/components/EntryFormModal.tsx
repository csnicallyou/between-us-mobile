import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Surface } from "@/components/Surface";
import { colors, radius, spacing } from "@/theme/tokens";
import { privateImageSource } from "@/services/backendClient";
import { useAuth } from "@/state/AuthContext";

export type FormValue = string | boolean;

export interface FormChoice {
  label: string;
  value: string;
}

export interface FormField {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  choices?: FormChoice[];
  type?: "text" | "switch" | "date";
}

interface EntryFormModalProps {
  visible: boolean;
  title: string;
  fields: FormField[];
  values: Record<string, FormValue>;
  onChange: (key: string, value: FormValue) => void;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  imageUri?: string | null;
  onPickImage?: () => void;
  pickingImage?: boolean;
}

export function EntryFormModal({ visible, title, fields, values, onChange, onClose, onSave, saveLabel = "Сохранить", imageUri, onPickImage, pickingImage = false }: EntryFormModalProps) {
  const { accessToken } = useAuth();
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  const dateValue = (key: string) => {
    const value = String(values[key] ?? "");
    const parsed = new Date(`${value || new Date().toISOString().slice(0, 10)}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };
  const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={onClose}>
      <View style={styles.page}>
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="Закрыть" onPress={onClose} style={styles.close}>
            <Ionicons color={colors.ink} name="close" size={22} />
          </Pressable>
          <Text numberOfLines={1} style={styles.heading}>{title}</Text>
          <View style={styles.closePlaceholder} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Surface style={styles.form}>
            {fields.map((field) => (
              <View key={field.key} style={styles.field}>
                {field.type === "switch" ? (
                  <View style={styles.switchRow}>
                    <Text style={styles.label}>{field.label}</Text>
                    <Switch onValueChange={(value) => onChange(field.key, value)} trackColor={{ true: colors.seaSoft }} thumbColor={Boolean(values[field.key]) ? colors.sea : colors.white} value={Boolean(values[field.key])} />
                  </View>
                ) : field.type === "date" ? <>
                  <Text style={styles.label}>{field.label}</Text>
                  <Pressable onPress={() => setActiveDateKey(activeDateKey === field.key ? null : field.key)} style={styles.dateButton}><Text style={styles.dateText}>{values[field.key] ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(dateValue(field.key)) : "Дата не выбрана"}</Text><Ionicons color={colors.muted} name="calendar-outline" size={19} /></Pressable>
                  {activeDateKey === field.key ? <DateTimePicker display={Platform.OS === "ios" ? "inline" : "default"} mode="date" onChange={(_, date) => { if (date) onChange(field.key, localDate(date)); if (Platform.OS !== "ios") setActiveDateKey(null); }} value={dateValue(field.key)} /> : null}
                </> : (
                  <>
                    <Text style={styles.label}>{field.label}</Text>
                    {field.choices ? (
                      <View style={styles.choices}>
                        {field.choices.map((choice) => {
                          const active = values[field.key] === choice.value;
                          return <Pressable key={choice.value} onPress={() => onChange(field.key, choice.value)} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{choice.label}</Text></Pressable>;
                        })}
                      </View>
                    ) : (
                      <TextInput
                        autoCapitalize="sentences"
                        multiline={field.multiline}
                        onChangeText={(value) => onChange(field.key, value)}
                        placeholder={field.placeholder}
                        placeholderTextColor={colors.muted}
                        style={[styles.input, field.multiline && styles.multiline]}
                        value={String(values[field.key] ?? "")}
                      />
                    )}
                  </>
                )}
              </View>
            ))}
            {onPickImage ? <View style={styles.field}><Text style={styles.label}>Изображение</Text>{imageUri ? <Image resizeMode="contain" source={privateImageSource(imageUri, accessToken)} style={styles.imagePreview} /> : null}{pickingImage ? <ActivityIndicator color={colors.sea} /> : <AppButton label={imageUri ? "Заменить изображение" : "Добавить изображение"} onPress={onPickImage} variant="secondary" />}</View> : null}
          </Surface>
          <View style={styles.actions}>
            <AppButton label="Отмена" onPress={onClose} style={styles.action} variant="secondary" />
            <AppButton label={saveLabel} onPress={onSave} style={styles.action} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1 },
  topBar: { alignItems: "center", flexDirection: "row", paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  close: { alignItems: "center", backgroundColor: colors.surfaceStrong, borderRadius: radius.pill, height: 42, justifyContent: "center", width: 42 },
  closePlaceholder: { width: 42 },
  heading: { color: colors.ink, flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  content: { padding: spacing.lg, paddingBottom: 48 },
  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  input: { backgroundColor: "rgba(255,255,255,0.76)", borderColor: colors.glassLine, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, color: colors.ink, fontSize: 16, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  multiline: { minHeight: 110, textAlignVertical: "top" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: { backgroundColor: colors.surfaceStrong, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  choiceActive: { backgroundColor: colors.sea },
  choiceText: { color: colors.muted, fontSize: 13 },
  choiceTextActive: { color: colors.white, fontWeight: "700" },
  switchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  dateButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.76)", borderColor: colors.glassLine, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 50, paddingHorizontal: spacing.md },
  dateText: { color: colors.ink, fontSize: 16 },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  action: { flex: 1 },
  imagePreview: { backgroundColor: "rgba(255,255,255,0.48)", borderRadius: radius.md, height: 190, width: "100%" },
});
