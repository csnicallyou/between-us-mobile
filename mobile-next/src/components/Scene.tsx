import React,{useEffect,useRef} from 'react';
import {View,Animated,StyleSheet} from 'react-native';
import Svg,{Defs,LinearGradient,Stop,Path,Ellipse,Rect,Circle,G,Line} from 'react-native-svg';
import {Tap,Label} from './ui';
import {useStore} from '../domain/store';
export function Scene({onCharacter,onObject,compact=false}:{onCharacter:(who:'me'|'partner')=>void;onObject:()=>void;compact?:boolean}){const{state}=useStore();const float=useRef(new Animated.Value(0)).current;
useEffect(()=>{if(state.reduceMotion)return;const a=Animated.loop(Animated.sequence([Animated.timing(float,{toValue:1,duration:2600,useNativeDriver:true}),Animated.timing(float,{toValue:0,duration:2600,useNativeDriver:true})]));a.start();return()=>a.stop();},[state.reduceMotion]);
const wall=state.palette==='sage'?'#CAD9CF':state.palette==='lilac'?'#D4CAE8':'#EBCFC2';
return <View style={{height:compact?250:365,position:'relative'}}>
<Svg width="100%" height="100%" viewBox="0 0 400 370">
<Defs><LinearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF6E9"/><Stop offset="1" stopColor={wall}/></LinearGradient><LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#E8C8B5"/><Stop offset="1" stopColor="#F7E7D9"/></LinearGradient><LinearGradient id="window" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#BFCFE1"/><Stop offset="1" stopColor="#FDE3CC"/></LinearGradient></Defs>
<Ellipse cx="204" cy="337" rx="174" ry="26" fill="#8B6B80" opacity=".1"/>
<Path d="M22 105 L202 32 L378 105 L378 265 L203 345 L22 266Z" fill="url(#wall)"/>
<Path d="M202 32V207L378 265V105Z" fill={wall} opacity=".7"/>
<Path d="M22 266L202 193L378 265L203 345Z" fill="url(#floor)"/>
{[0,1,2,3,4].map(i=><Path key={i} d={`M${32+i*30} ${270+i*13} L${211+i*30} ${199+i*13}`} stroke="#CBAF9C" opacity=".25"/>)}
<Path d="M62 111L153 75V175L62 213Z" fill="#FFF6EF"/><Path d="M70 117L145 87V169L70 200Z" fill="url(#window)"/><Path d="M108 103V184M70 158L145 128" stroke="#FFF8EE" strokeWidth="5"/>
<Circle cx="126" cy="112" r="12" fill="#FFF0CF"/>
<Path d="M60 107L67 209M151 72L158 176" stroke="#FCF5EA" strokeWidth="13" strokeLinecap="round"/>
<Path d="M236 94L276 110V151L236 135Z" fill="#FFF3E3"/><Path d="M244 107L266 116V138L244 129Z" fill="#B6B5C6"/>
<Path d="M250 121Q256 110 260 122Q269 119 263 130Z" fill="#F1D0C2"/>
<Ellipse cx="201" cy="281" rx="103" ry="40" fill="#C4B3CA" opacity=".5"/><Ellipse cx="201" cy="277" rx="92" ry="32" fill="#E5DAE4"/>
<Path d="M247 218L332 250V213Q333 200 320 195L255 169Q242 165 242 179Z" fill="#9AAE9B"/>
<Path d="M238 220L325 256L348 243L263 207Z" fill="#C6D1B7"/><Path d="M238 220V241L324 277V255Z" fill="#A8B9A0"/><Path d="M325 255L348 243V263L325 277Z" fill="#849C88"/>
<Path d="M252 183L281 194V221L252 210Z" fill="#EBD9C0"/><Path d="M287 198L316 210V235L287 224Z" fill="#D4BEC6"/>
<Ellipse cx="81" cy="254" rx="23" ry="10" fill="#A98C78" opacity=".25"/><Path d="M67 226L72 251Q81 258 91 250L96 226Z" fill="#CFAB95"/><Ellipse cx="81" cy="226" rx="15" ry="6" fill="#E7CAB1"/>
<Path d="M81 227V171M81 210Q49 208 59 187Q79 187 81 210M81 199Q111 189 101 172Q80 176 81 199M81 182Q59 169 72 155Q87 162 81 182" fill="#819E87" stroke="#819E87" strokeWidth="3"/>
<Path d="M327 189V143" stroke="#B69B7D" strokeWidth="4"/><Ellipse cx="327" cy="191" rx="14" ry="5" fill="#B69B7D"/><Path d="M308 143L317 116L337 124L345 153Z" fill="#FFF0D0"/>
{state.inventory.includes('plant')&&<G><Rect x="286" y="269" width="22" height="23" rx="6" fill="#D49883"/><Path d="M297 270V242M297 260Q272 250 284 241Q301 248 297 260M297 253Q320 239 310 231Q293 237 297 253" fill="#72937F"/></G>}
</Svg>
<Animated.View style={[styles.character,{left:'32%',bottom:compact?30:49,transform:[{translateY:float.interpolate({inputRange:[0,1],outputRange:[0,-5]})}]}]}><Character color={state.avatar} onPress={()=>onCharacter('me')} label={state.name}/></Animated.View>
{state.room==='shared'&&state.paired&&<Animated.View style={[styles.character,{left:'52%',bottom:compact?21:35,transform:[{translateY:float.interpolate({inputRange:[0,1],outputRange:[-4,0]})}]}]}><Character color="#B6B3CF" onPress={()=>onCharacter('partner')} label={state.partner}/></Animated.View>}
<Tap onPress={onObject} label="Открыть воспоминания на стене" style={{position:'absolute',left:'59%',top:'27%',width:55,height:60}}><View/></Tap>
</View>}
function Character({color,onPress,label}:{color:string;onPress:()=>void;label:string}){return <Tap onPress={onPress} label={`Действия: ${label}`}><Svg width="76" height="100" viewBox="0 0 76 100"><Defs><LinearGradient id={`body${color}`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF4EA"/><Stop offset=".45" stopColor={color}/><Stop offset="1" stopColor={color}/></LinearGradient></Defs><Ellipse cx="38" cy="92" rx="27" ry="7" fill="#695D77" opacity=".17"/><Ellipse cx="25" cy="88" rx="11" ry="7" fill={color}/><Ellipse cx="51" cy="88" rx="11" ry="7" fill={color}/><Path d="M15 72C6 62 9 39 15 25C20 11 30 8 38 8C60 8 69 31 67 54C67 78 55 87 38 87C26 87 18 82 15 72Z" fill={`url(#body${color})`}/><Ellipse cx="12" cy="63" rx="6" ry="12" fill={color}/><Ellipse cx="65" cy="63" rx="6" ry="12" fill={color}/><Circle cx="28" cy="43" r="3" fill="#51414E"/><Circle cx="48" cy="43" r="3" fill="#51414E"/><Path d="M33 52Q38 57 43 52" fill="none" stroke="#74515E" strokeWidth="2" strokeLinecap="round"/><Ellipse cx="20" cy="52" rx="5" ry="3" fill="#E698A5" opacity=".5"/><Ellipse cx="55" cy="52" rx="5" ry="3" fill="#E698A5" opacity=".5"/></Svg></Tap>}
export function Landscape({season='autumn'}:{season?:string}){return <Svg width="100%" height="150" viewBox="0 0 400 150"><Rect width="400" height="150" rx="16" fill={season==='summer'?'#D7E5DC':'#EBDFD4'}/><Circle cx="300" cy="40" r="24" fill="#FFF6D5"/><Path d="M0 120Q80 25 170 109Q270 40 400 100V150H0" fill={season==='summer'?'#9EB9A0':'#C6B4A1'}/><Path d="M0 150Q110 80 220 130Q300 85 400 120V150Z" fill={season==='summer'?'#748F83':'#AD9A89'}/><Path d="M185 150Q220 130 205 113Q190 102 225 94" fill="none" stroke="#F9EAD8" strokeWidth="9"/></Svg>}
const styles=StyleSheet.create({character:{position:'absolute',width:76,height:100}});
