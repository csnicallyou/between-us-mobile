import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Animated, Dimensions, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

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

  return (
    <View collapsable={false} onLayout={measure} ref={ref} style={style}>
      <Animated.View style={{
        borderRadius: reveal.interpolate({ inputRange: [0, 0.34, 1], outputRange: [42, 34, 0] }),
        opacity: reveal.interpolate({ inputRange: [0, 0.10, 0.32, 1], outputRange: [0, 0.18, 0.72, 1] }),
        transform: [
          { translateX: reveal.interpolate({ inputRange: [0, 1], outputRange: [centerDelta, 0] }) },
          { translateY: reveal.interpolate({ inputRange: [0, 0.20, 0.56, 1], outputRange: [28, 24, 8, 0] }) },
          { scaleX: reveal.interpolate({ inputRange: [0, 0.12, 0.34, 0.62, 1], outputRange: [0.06, 0.14, 0.34, 0.72, 1] }) },
          { scaleY: reveal.interpolate({ inputRange: [0, 0.12, 0.34, 0.62, 1], outputRange: [0.025, 0.10, 0.42, 0.82, 1] }) },
        ],
      }}>{children}</Animated.View>
    </View>
  );
}
