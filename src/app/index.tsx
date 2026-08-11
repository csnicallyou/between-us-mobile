import { Redirect, type Href } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/state/AuthContext";
import { usePair } from "@/state/PairContext";
import { colors } from "@/theme/tokens";

export default function Index() {
  const { isAuthenticated, isHydrated } = useAuth();
  const { isLoading, pair } = usePair();
  if (!isHydrated || (isAuthenticated && isLoading)) return <View style={styles.loading}><ActivityIndicator color={colors.sea} size="large" /></View>;
  if (!isAuthenticated) return <Redirect href={"/(auth)" as Href} />;
  return <Redirect href={(pair?.members.length === 2 ? "/(tabs)" : "/(onboarding)") as Href} />;
}

const styles = StyleSheet.create({ loading: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" } });
