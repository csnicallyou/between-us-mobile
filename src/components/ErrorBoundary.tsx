import * as Updates from "expo-updates";
import { Component, type PropsWithChildren, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { V2Backdrop, V2Button as AppButton, v2 } from "@/ui-v2";
import { colors, spacing } from "@/theme/tokens";

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
        <V2Backdrop />
        <Text style={styles.title}>Что-то пошло не так</Text>
        <Text style={styles.message}>Приложение столкнулось с ошибкой и не может продолжить. Попробуйте перезапустить.</Text>
        <Text selectable style={styles.diagnostic}>{this.state.error.name}: {this.state.error.message}</Text>
        <AppButton label="Перезапустить" onPress={this.handleRetry} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.lg, justifyContent: "center", padding: spacing.xl },
  title: { color: v2.color.ink, fontFamily: v2.font.family, fontSize: 24, fontWeight: "600", textAlign: "center" },
  message: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  diagnostic: { color: colors.danger, fontSize: 12, lineHeight: 18, textAlign: "center" },
});
