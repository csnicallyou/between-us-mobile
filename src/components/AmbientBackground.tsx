import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

/** Fixed application wall, transcribed from docs/redesign/mockups/wall-light.svg. */
export function AmbientBackground() {
  return (
    <View pointerEvents="none" style={styles.fill}>
      <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 390 600" width="100%">
        <Defs>
          <LinearGradient id="wall" x1="0" x2="0.35" y1="0" y2="1">
            <Stop offset="0" stopColor="#FAF6F2" />
            <Stop offset="0.38" stopColor="#F2EFF4" />
            <Stop offset="0.72" stopColor="#E9EEF3" />
            <Stop offset="1" stopColor="#EFEBF2" />
          </LinearGradient>
          <RadialGradient id="cream" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#F6E3C4" stopOpacity="0.66" /><Stop offset="1" stopColor="#F6E3C4" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="blush" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#F0C9CE" stopOpacity="0.72" /><Stop offset="1" stopColor="#F0C9CE" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="lilac" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#D8CFEC" stopOpacity="0.6" /><Stop offset="1" stopColor="#D8CFEC" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="sky" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#BFD6EA" stopOpacity="0.7" /><Stop offset="1" stopColor="#BFD6EA" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="sage" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#C7DBCD" stopOpacity="0.62" /><Stop offset="1" stopColor="#C7DBCD" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" /><Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="bokeh" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.56" />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.24" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect fill="url(#wall)" height="600" width="390" x="0" y="0" />
        <Ellipse cx="70" cy="70" fill="url(#cream)" rx="210" ry="180" />
        <Ellipse cx="330" cy="130" fill="url(#blush)" rx="200" ry="190" />
        <Ellipse cx="120" cy="330" fill="url(#lilac)" rx="215" ry="200" />
        <Ellipse cx="350" cy="430" fill="url(#sky)" rx="205" ry="200" />
        <Ellipse cx="90" cy="560" fill="url(#sage)" rx="200" ry="170" />
        <Ellipse cx="255" cy="290" fill="url(#glow)" opacity="0.55" rx="150" ry="140" />

        <Circle cx="300" cy="82" fill="url(#bokeh)" r="34" />
        <Circle cx="58" cy="196" fill="url(#bokeh)" opacity="0.86" r="25" />
        <Circle cx="212" cy="150" fill="url(#bokeh)" opacity="0.82" r="19" />
        <Circle cx="342" cy="330" fill="url(#bokeh)" opacity="0.78" r="29" />
        <Circle cx="150" cy="470" fill="url(#bokeh)" opacity="0.8" r="32" />
        <Circle cx="46" cy="392" fill="url(#bokeh)" opacity="0.72" r="20" />
        <Circle cx="284" cy="520" fill="url(#bokeh)" opacity="0.7" r="22" />
        <Circle cx="196" cy="238" fill="url(#bokeh)" opacity="0.84" r="14" />
        <Circle cx="118" cy="112" fill="url(#bokeh)" opacity="0.74" r="15" />

        <Line stroke="#B9AEC6" strokeOpacity="0.32" strokeWidth="1" x1="0" x2="390" y1="248" y2="248" />
        <Line stroke="#AEBCCB" strokeOpacity="0.32" strokeWidth="1" x1="0" x2="390" y1="356" y2="356" />
        <Line stroke="#B4C4BC" strokeOpacity="0.32" strokeWidth="1" x1="0" x2="390" y1="452" y2="452" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
});
