import * as Updates from "expo-updates";
import { Component, type PropsWithChildren, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { colors, spacing, typography } from "@/theme/tokens";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Необработанная ошибка интерфейса", error, info.componentStack);
  }

  handleRetry = () => {
    Updates.reloadAsync().catch(() => this.setState({ error: null }));
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Что-то пошло не так</Text>
        <Text style={styles.message}>Приложение столкнулось с ошибкой и не может продолжить. Попробуйте перезапустить.</Text>
        <AppButton label="Перезапустить" onPress={this.handleRetry} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.lg, justifyContent: "center", padding: spacing.xl },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 24, textAlign: "center" },
  message: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
});
