import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { AppButton } from "@/components/AppButton";
import { AuthError } from "@/components/AuthScaffold";
import type { PairInviteDto } from "@/services/backendClient";
import { ink, materialType } from "@/theme/material";

interface PairInviteCardProps { invite: PairInviteDto; }

export function PairInviteCard({ invite }: PairInviteCardProps) {
  const [shareError, setShareError] = useState<string | null>(null);
  const share = async () => {
    setShareError(null);
    try {
      await Share.share({ message: `Присоединяйся ко мне в «Между нами»: ${invite.link}\nКод приглашения: ${invite.code}`, title: "Приглашение в нашу пару", url: invite.link });
    } catch { setShareError("Не удалось открыть меню отправки"); }
  };

  return (
    <View style={styles.card}>
      <View accessibilityLabel={`QR-код приглашения. Код ${invite.code}`} style={styles.qrWrap}>
        <QRCode backgroundColor="#FFFFFF" color="#211E29" quietZone={6} size={160} value={invite.link} />
      </View>
      <Text selectable style={styles.code}>{invite.code}</Text>
      <Text style={styles.expiry}>Действует до {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(invite.expiresAt))}</Text>
      <View style={styles.split}><View style={styles.line} /><Text style={styles.or}>или</Text><View style={styles.line} /></View>
      {shareError ? <AuthError message={shareError} /> : null}
      <AppButton label="Отправить приглашение" onPress={() => void share()} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center" },
  qrWrap: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 11, shadowColor: "#3C3254", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.13, shadowRadius: 13 },
  code: { color: ink.strong, fontFamily: materialType.title.fontFamily, fontSize: 23, fontWeight: "600", letterSpacing: 3.2, marginTop: 16 },
  expiry: { color: ink.faint, fontFamily: materialType.caption.fontFamily, fontSize: 11.5, marginTop: 7 },
  split: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 18, width: "100%" },
  line: { backgroundColor: ink.hairline, flex: 1, height: StyleSheet.hairlineWidth },
  or: { color: ink.faint, fontFamily: materialType.kicker.fontFamily, fontSize: 10, fontWeight: "600", letterSpacing: 1.4, textTransform: "uppercase" },
  button: { marginTop: 14, width: "100%" },
});
