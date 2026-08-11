import { Alert, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { SubpageHeader } from "@/components/SubpageHeader";
import { Surface } from "@/components/Surface";
import { useAuth } from "@/state/AuthContext";
import { usePair } from "@/state/PairContext";
import { colors, spacing } from "@/theme/tokens";

export default function AccountScreen() {
  const { signOut, user } = useAuth();
  const { pair } = usePair();

  const confirmSignOut = () => Alert.alert("Выйти из аккаунта?", "Локальные данные этой пары будут скрыты. После входа синхронизация восстановится.", [
    { text: "Отмена", style: "cancel" },
    { text: "Выйти", style: "destructive", onPress: () => void signOut() },
  ]);

  return (
    <Screen header={<SubpageHeader title="Аккаунт и пара" subtitle="Личный профиль, участники и состояние синхронизации." />}>
      <Surface>
        <Text style={styles.label}>Ваш профиль</Text>
        <Text style={styles.title}>{user?.displayName}</Text>
        <Text style={styles.copy}>{user?.email}</Text>
      </Surface>
      <Surface style={styles.section}>
        <Text style={styles.label}>Общее пространство</Text>
        <Text style={styles.title}>{pair?.name}</Text>
        <View style={styles.members}>
          {pair?.members.map((member) => <Text key={member.id} style={styles.copy}>{member.displayName}{member.id === user?.id ? " — вы" : ""}</Text>)}
        </View>
        <Text style={styles.hint}>Записи, планы, настроения, договорённости и чат синхронизируются через защищённый сервер пары.</Text>
      </Surface>
      <View style={styles.section}><AppButton label="Выйти из аккаунта" onPress={confirmSignOut} variant="secondary" /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  label: { color: colors.sea, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700", marginTop: spacing.sm },
  copy: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: spacing.xs },
  members: { marginTop: spacing.md },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: spacing.lg },
});
