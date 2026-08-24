import type { PropsWithChildren } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

interface ScrollSuctionProviderProps extends PropsWithChildren {
  dark?: boolean;
  offset: Animated.Value;
  offsetNow: React.MutableRefObject<number>;
}

/**
 * Stable boundary for the future orb-transition renderer.
 *
 * The previous implementation captured every card into a second Skia image and
 * cross-faded that clone over the real view. On a physical iPhone the capture
 * and scroll callbacks do not complete in the same frame, so both copies can be
 * visible (or the clone can be clipped with stale geometry). Keeping this
 * boundary preserves every call site while guaranteeing a single rendered copy
 * of each item. A future membrane effect must transform that single source
 * instead of snapshotting it.
 */
export function ScrollSuctionProvider({ children }: ScrollSuctionProviderProps) {
  return <View style={styles.provider}>{children}</View>;
}

export function OrbSinkItem({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  provider: { flex: 1 },
});
