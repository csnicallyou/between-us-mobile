import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Animated, Dimensions, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { SlimeBridge } from "./SlimeBridge";

interface ScrollSuctionState {
  offset: Animated.Value;
  offsetNow: React.MutableRefObject<number>;
}

const fallbackOffset = new Animated.Value(0);
const ScrollSuctionContext = createContext<ScrollSuctionState>({ offset: fallbackOffset, offsetNow: { current: 0 } });

export function ScrollSuctionProvider({ children, offset, offsetNow }: PropsWithChildren<ScrollSuctionState>) {
  return <ScrollSuctionContext.Provider value={{ offset, offsetNow }}>{children}</ScrollSuctionContext.Provider>;
}

export function OrbSinkItem({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { offset, offsetNow } = useContext(ScrollSuctionContext);
  const ref = useRef<View>(null);
  const [geometry, setGeometry] = useState<{ height: number; x: number; y: number; width: number } | null>(null);
  const window = Dimensions.get("window");

  const measure = (_event?: LayoutChangeEvent) => {
    requestAnimationFrame(() => ref.current?.measureInWindow((x, y, width, height) => {
      setGeometry({ height, x, y: y + offsetNow.current, width });
    }));
  };

  useEffect(() => { measure(); }, []);

  if (!geometry) return <View collapsable={false} onLayout={measure} ref={ref} style={style}>{children}</View>;

  const itemBottom = geometry.y + geometry.height;
  const fullySunk = itemBottom - (window.height - 62);
  const fullyReleased = itemBottom - (window.height - 184);
  const centerDelta = window.width / 2 - (geometry.x + geometry.width / 2);
  const reveal = offset.interpolate({
    extrapolate: "clamp",
    inputRange: [fullySunk, fullyReleased],
    outputRange: [0, 1],
  });
  const transfer = reveal.interpolate({ inputRange: [0, 0.14, 0.60, 1], outputRange: [0.92, 1, 0.56, 0] });

  return (
    <View collapsable={false} onLayout={measure} ref={ref} style={style}>
      <Animated.View pointerEvents="none" style={[styles.membrane, {
        opacity: transfer,
        transform: [
          { translateX: reveal.interpolate({ inputRange: [0, 1], outputRange: [centerDelta - 32, geometry.width / 2 - 32] }) },
          { translateY: reveal.interpolate({ inputRange: [0, 0.58, 1], outputRange: [geometry.height - 26, geometry.height - 18, geometry.height - 6] }) },
          { scaleX: reveal.interpolate({ inputRange: [0, 0.22, 0.60, 1], outputRange: [0.42, 0.72, 1, 0.24] }) },
          { scaleY: reveal.interpolate({ inputRange: [0, 0.22, 0.60, 1], outputRange: [0.92, 1.12, 0.82, 0.12] }) },
        ],
      }]}> 
        <SlimeBridge/>
      </Animated.View>
      <Animated.View style={{
        opacity: reveal.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 0.30, 1] }),
        transform: [
          { translateX: reveal.interpolate({ inputRange: [0, 1], outputRange: [centerDelta, 0] }) },
          { translateY: reveal.interpolate({ inputRange: [0, 0.38, 1], outputRange: [24, 9, 0] }) },
          { scaleX: reveal.interpolate({ inputRange: [0, 0.18, 0.48, 1], outputRange: [0.04, 0.12, 0.54, 1] }) },
          { scaleY: reveal.interpolate({ inputRange: [0, 0.18, 0.48, 1], outputRange: [0.035, 0.18, 0.70, 1] }) },
          { rotate: reveal.interpolate({ inputRange: [0, 0.42, 1], outputRange: [`${centerDelta > 0 ? -8 : 8}deg`, "2deg", "0deg"] }) },
        ],
      }}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  membrane: { height: 108, left: 0, position: "absolute", top: 0, width: 64, zIndex: 2 },
});
