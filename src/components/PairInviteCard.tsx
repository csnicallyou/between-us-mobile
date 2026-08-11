import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { AppButton } from "@/components/AppButton";
import type { PairInviteDto } from "@/services/backendClient";
import { colors, radius, spacing } from "@/theme/tokens";

interface PairInviteCardProps {
  invite: PairInviteDto;
}

export function PairInviteCard({ invite }: PairInviteCardProps) {
  const [shareError, setShareError] = useState<string | null>(null);
  const share = async () => {
    setShareError(null);
    try {
      await Share.share({
        message: `Присоединяйся ко мне в «Между нами»: ${invite.link}\nКод приглашения: ${invite.code}`,
        title: "Приглашение в нашу пару",
        url: invite.link,
      });
    } catch {
      setShareError("Не удалось открыть меню отправки");
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Пригласите партнёра</Text>
      <Text style={styles.copy}>Отправьте ссылку, покажите QR-код или продиктуйте код.</Text>
      <View accessibilityLabel={`QR-код приглашения. Код ${invite.code}`} style={styles.qr}>
        <QRCode backgroundColor={colors.white} color={colors.ink} quietZone={12} size={176} value={invite.link} />
      </View>
      <Text selectable style={styles.code}>{invite.code}</Text>
      <Text style={styles.expiry}>Действует до {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(invite.expiresAt))}</Text>
      {shareError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{shareError}</Text> : null}
      <AppButton label="Отправить приглашение" onPress={() => void share()} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: spacing.md },
  title: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: "center" },
  qr: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.sm },
  code: { color: colors.violet, fontSize: 25, fontWeight: "800", letterSpacing: 3 },
  expiry: { color: colors.muted, fontSize: 12 },
  error: { color: colors.danger, fontSize: 13 },
});
