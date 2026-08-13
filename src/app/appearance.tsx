import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { V2Button as AppButton } from "@/ui-v2";
import { InnerGlass as Surface, InnerScreen as Screen, InnerScreenHeader } from "@/components/redesign/InnerScreenChrome";
import { privateImageSource } from "@/services/backendClient";
import { useAppData } from "@/state/AppDataContext";
import { useAuth } from "@/state/AuthContext";
import { normalizeHex, paletteForLuminance, relativeLuminance } from "@/theme/adaptivePalette";
import { fill, ink, materialRadius, materialSpacing, materialType, rim } from "@/ui-v2/styleTokens";
import { colors } from "@/theme/tokens";
import { analyzeImageLuminance, deleteStoredImage, selectAndStoreImage } from "@/services/imageService";

const presets = ["#F7FAFC", "#DDEBE7", "#E7E3F4", "#F4DED8", "#173246", "#253D36", "#3A3152", "#55332F"];

export default function AppearanceScreen() {
  const { appearanceSyncError, partnerAppearance, snapshot, setBackgroundColor, setBackgroundImage, resetBackground, setUsePartnerBackground, usePartnerBackground } = useAppData();
  const { accessToken } = useAuth();
  const [value, setValue] = useState(snapshot.appearance.backgroundKind === "color" ? snapshot.appearance.backgroundValue ?? "#F7FAFC" : "#F7FAFC");
  const [selectingPhoto, setSelectingPhoto] = useState(false);
  const apply = (candidate = value) => { const normalized = normalizeHex(candidate); if (!normalized) return Alert.alert("Неверный цвет", "Используйте формат #RRGGBB, например #173246."); if (snapshot.appearance.backgroundKind === "image") deleteStoredImage(snapshot.appearance.backgroundValue); setValue(normalized); setBackgroundColor(normalized, relativeLuminance(normalized)); };
  const luminance = relativeLuminance(value); const palette = paletteForLuminance(luminance);
  const choosePhoto = async () => {
    let selectedUri: string | null = null;
    try {
      setSelectingPhoto(true);
      const uri = await selectAndStoreImage("background");
      if (!uri) return;
      selectedUri = uri;
      const analysis = await analyzeImageLuminance(uri);
      if (snapshot.appearance.backgroundKind === "image") deleteStoredImage(snapshot.appearance.backgroundValue);
      setBackgroundImage(uri, analysis.luminance);
      selectedUri = null;
    } catch (error) {
      deleteStoredImage(selectedUri);
      Alert.alert("Не удалось выбрать фон", error instanceof Error && error.message === "PHOTO_PERMISSION_DENIED" ? "Разрешите доступ к фотографиям в настройках iPhone." : "Попробуйте выбрать другое изображение.");
    } finally { setSelectingPhoto(false); }
  };
  return <Screen header={<InnerScreenHeader kicker="Приложение" title="Фон и контраст" subtitle="Выберите основу — приложение автоматически подстроит заголовки, системную строку, защитный слой и стеклянные поверхности." />}>
    <Surface style={styles.partnerToggle}>
      <View style={styles.partnerToggleRow}>
        <View style={styles.partnerToggleText}>
          <Text style={styles.label}>Использовать фон партнёра</Text>
          <Text style={styles.photoText}>Показывать на этом телефоне фон, который выбрал партнёр, вместо своего.</Text>
        </View>
        <Switch disabled={!partnerAppearance} onValueChange={setUsePartnerBackground} value={usePartnerBackground} />
      </View>
      {!partnerAppearance ? <Text style={styles.photoText}>Партнёр ещё не выбирал фон.</Text> : null}
      {usePartnerBackground && partnerAppearance?.backgroundKind === "image" && partnerAppearance.backgroundValue ? (
        <Image resizeMode="cover" source={privateImageSource(partnerAppearance.backgroundValue, accessToken)} style={styles.photoPreview} />
      ) : null}
    </Surface>
    <Surface style={styles.preview}><View style={[styles.sample, { backgroundColor: normalizeHex(value) ?? colors.background }]}><Text style={[styles.sampleTitle, { color: palette.foreground }]}>Предпросмотр фона</Text><Text style={[styles.sampleText, { color: palette.mutedForeground }]}>Текст остаётся читаемым автоматически</Text><View style={styles.sampleGlass}><Text style={styles.sampleGlassText}>Стеклянная карточка</Text></View></View></Surface>
    <Text style={[styles.sectionTitle, snapshot.appearance.backgroundLuminance < 0.36 && snapshot.appearance.backgroundKind !== "default" && styles.lightText]}>Готовые оттенки</Text><View style={styles.presets}>{presets.map((color) => <Pressable accessibilityLabel={`Выбрать цвет ${color}`} key={color} onPress={() => apply(color)} style={[styles.swatch, { backgroundColor: color }, snapshot.appearance.backgroundValue === color && styles.selected]} />)}</View>
    <Surface style={styles.form}><Text style={styles.label}>Свой цвет</Text><TextInput autoCapitalize="characters" autoCorrect={false} onChangeText={setValue} placeholder="#173246" placeholderTextColor={colors.muted} style={styles.input} value={value} /><AppButton label="Применить цвет" onPress={() => apply()} /></Surface>
    <Surface style={styles.photo}><Text style={styles.photoTitle}>Фотография из галереи</Text><Text style={styles.photoText}>Приложение сохранит сжатую копию и автоматически подберёт контраст. Исходное фото в галерее не изменяется.</Text>{snapshot.appearance.backgroundKind === "image" && snapshot.appearance.backgroundValue ? <Image resizeMode="cover" source={{ uri: snapshot.appearance.backgroundValue }} style={styles.photoPreview} /> : null}{selectingPhoto ? <ActivityIndicator color={colors.sea} /> : <AppButton label="Выбрать фотографию" onPress={() => void choosePhoto()} variant="secondary" />}{snapshot.appearance.backgroundKind === "image" && appearanceSyncError ? <Text selectable style={styles.syncError}>Не удалось передать фон партнёру: {appearanceSyncError}</Text> : null}</Surface>
    <AppButton label="Вернуть стандартный фон" onPress={() => { if (snapshot.appearance.backgroundKind === "image") deleteStoredImage(snapshot.appearance.backgroundValue); resetBackground(); }} variant="secondary" style={styles.reset} />
  </Screen>;
}

const styles = StyleSheet.create({
  partnerToggle: { gap: materialSpacing.sm, marginBottom: materialSpacing.xl },
  partnerToggleRow: { alignItems: "center", flexDirection: "row", gap: materialSpacing.md, justifyContent: "space-between" },
  partnerToggleText: { flex: 1, gap: 2 },
  preview: { overflow: "hidden", padding: 0 },
  sample: { minHeight: 180, padding: materialSpacing.xl },
  sampleTitle: { fontFamily: "GolosText", fontSize: 23, fontWeight: "600", letterSpacing: -0.5 },
  sampleText: { fontFamily: "GolosText", fontSize: 14, marginTop: materialSpacing.sm },
  sampleGlass: { backgroundColor: fill.controlStrong, borderColor: rim.hair, borderRadius: materialRadius.field, borderWidth: StyleSheet.hairlineWidth, marginTop: materialSpacing.xl, padding: materialSpacing.md },
  sampleGlassText: { color: ink.strong, fontFamily: "GolosText", fontWeight: "600" },
  sectionTitle: { color: ink.strong, marginTop: materialSpacing.xl, ...materialType.section },
  lightText: { color: colors.white },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: materialSpacing.md, marginTop: materialSpacing.md },
  swatch: { borderColor: "rgba(255,255,255,0.82)", borderRadius: materialRadius.pill, borderWidth: 3, height: 48, width: 48 },
  selected: { borderColor: colors.sea, borderWidth: 4 },
  form: { gap: materialSpacing.md, marginTop: materialSpacing.xl },
  label: { color: ink.strong, fontFamily: "GolosText", fontSize: 13, fontWeight: "600" },
  input: { backgroundColor: fill.controlStrong, borderColor: rim.hair, borderRadius: materialRadius.field, borderWidth: StyleSheet.hairlineWidth, color: ink.strong, fontFamily: "GolosText", fontSize: 16, minHeight: 52, paddingHorizontal: materialSpacing.md },
  photo: { marginTop: materialSpacing.xl },
  photoTitle: { color: ink.strong, ...materialType.section },
  photoText: { color: ink.muted, marginBottom: materialSpacing.lg, marginTop: materialSpacing.sm, ...materialType.body, fontSize: 14 },
  photoPreview: { borderRadius: materialRadius.field, height: 180, marginBottom: materialSpacing.lg, width: "100%" },
  syncError: { color: colors.danger, fontFamily: "GolosText", fontSize: 12, lineHeight: 18, marginTop: materialSpacing.sm },
  reset: { marginTop: materialSpacing.xl },
});
