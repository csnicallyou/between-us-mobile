import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Line, RadialGradient, Rect, Stop } from "react-native-svg";

export function V2Backdrop() {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 390 600" width="100%">
      <Defs>
        <LinearGradient id="base" x1="0" x2=".35" y1="0" y2="1"><Stop offset="0" stopColor="#FAF6F2"/><Stop offset=".38" stopColor="#F2EFF4"/><Stop offset=".72" stopColor="#E9EEF3"/><Stop offset="1" stopColor="#EFEBF2"/></LinearGradient>
        {[["cream","#F6E3C4",.66],["blush","#F0C9CE",.72],["lilac","#D8CFEC",.60],["sky","#BFD6EA",.70],["sage","#C7DBCD",.62],["glow","#FFFFFF",.90]].map(([id,color,opacity]) => <RadialGradient id={String(id)} key={String(id)}><Stop offset="0" stopColor={String(color)} stopOpacity={Number(opacity)}/><Stop offset="1" stopColor={String(color)} stopOpacity="0"/></RadialGradient>)}
      </Defs>
      <Rect fill="url(#base)" height="600" width="390"/>
      <Ellipse cx="70" cy="70" fill="url(#cream)" rx="210" ry="180"/><Ellipse cx="330" cy="130" fill="url(#blush)" rx="200" ry="190"/><Ellipse cx="120" cy="330" fill="url(#lilac)" rx="215" ry="200"/><Ellipse cx="350" cy="430" fill="url(#sky)" rx="205" ry="200"/><Ellipse cx="90" cy="560" fill="url(#sage)" rx="200" ry="170"/><Ellipse cx="255" cy="290" fill="url(#glow)" opacity=".55" rx="150" ry="140"/>
      {([[300,82,26,.72],[58,196,18,.62],[212,150,12,.75],[342,330,21,.55],[150,470,24,.6],[46,392,13,.7],[284,520,15,.5],[196,238,8,.85],[118,112,9,.7]] as const).map(([cx,cy,r,o]) => <Circle cx={cx} cy={cy} fill="#FFFFFF" key={`${cx}-${cy}`} opacity={o} r={r}/>)}
      <Line stroke="#B9AEC6" strokeOpacity=".32" x1="0" x2="390" y1="248" y2="248"/><Line stroke="#AEBCCB" strokeOpacity=".32" x1="0" x2="390" y1="356" y2="356"/><Line stroke="#B4C4BC" strokeOpacity=".32" x1="0" x2="390" y1="452" y2="452"/>
    </Svg>
  </View>;
}
