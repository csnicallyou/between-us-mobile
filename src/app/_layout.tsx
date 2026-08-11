import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppDataProvider } from "@/state/AppDataContext";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { PairProvider, usePair } from "@/state/PairContext";
import { colors } from "@/theme/tokens";

function RootNavigator() {
  const { isAuthenticated, isHydrated } = useAuth();
  const { isLoading, pair } = usePair();
  const pairReady = !!pair && pair.members.length === 2;

  if (!isHydrated || (isAuthenticated && isLoading)) {
    return <View style={styles.loading}><StatusBar style="dark" /><ActivityIndicator color={colors.sea} size="large" /></View>;
  }

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !pairReady}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && pairReady}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="about" />
        <Stack.Screen name="agreements" />
        <Stack.Screen name="appearance" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="conflicts" />
        <Stack.Screen name="memories" />
        <Stack.Screen name="quiet" />
        <Stack.Screen name="account" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return <AuthProvider><PairProvider><AppDataProvider><StatusBar style="dark" /><RootNavigator /></AppDataProvider></PairProvider></AuthProvider>;
}

const styles = StyleSheet.create({ loading: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" } });
