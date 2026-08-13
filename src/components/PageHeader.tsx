import { StyleSheet, Text, View } from "react-native";
import { ink, materialSpacing, materialType } from "@/theme/material";
import { useAppData } from "@/state/AppDataContext";
import { paletteForLuminance } from "@/theme/adaptivePalette";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  kicker?: string;
}

/**
 * Шапка вкладки. Заголовок стал заметно меньше прежних 38 px: в макетах
 * вес держит не размер буквы, а воздух вокруг неё и плотность стекла ниже.
 */
export function PageHeader({ title, subtitle, kicker }: PageHeaderProps) {
  const { effectiveAppearance } = useAppData();
  const palette = paletteForLuminance(effectiveAppearance.backgroundLuminance);
  const custom = effectiveAppearance.backgroundKind !== "default";
  return (
    <View style={styles.container}>
      {kicker ? <Text style={[styles.kicker, custom && { color: palette.mutedForeground }]}>{kicker}</Text> : null}
      <Text style={[styles.title, custom && { color: palette.foreground }]}>{title}</Text>
      <Text style={[styles.subtitle, custom && { color: palette.mutedForeground }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: materialSpacing.xl, paddingTop: materialSpacing.xs },
  kicker: { color: ink.faint, marginBottom: 7, ...materialType.kicker },
  title: { color: ink.strong, lineHeight: 34, ...materialType.title },
  subtitle: { color: ink.muted, marginTop: 9, maxWidth: 560, ...materialType.body },
});
