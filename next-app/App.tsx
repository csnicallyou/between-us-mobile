import React, { useMemo, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, ScrollView, View } from 'react-native';

type Tab = 'Общение' | 'Активности' | 'Мир' | 'История' | 'Ещё';
type Message = { id: number; author: 'Я' | 'Партнёр'; text: string };
const tabs: { title: Tab; symbol: string }[] = [
  { title: 'Общение', symbol: '♡' }, { title: 'Активности', symbol: '▦' },
  { title: 'Мир', symbol: '◎' }, { title: 'История', symbol: '✿' },
  { title: 'Ещё', symbol: '☷' },
];
const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const levels = ['Комната', 'Дом', 'Город', 'Глобус'];
const rooms = ['Наша комната', 'Моя комната', 'Комната партнёра'];
const initialTasks = ['Выбрать фильм на вечер', 'Подготовить прогулку', 'Купить продукты'];

function Button({ label, onPress, active = false }: {label: string; onPress: () => void; active?: boolean}) {
  return <TouchableOpacity onPress={onPress} style={[s.pill, active && s.pillSelected]}><Text style={[s.pillText, active && s.pillTextSelected]}>{label}</Text></TouchableOpacity>;
}
function Panel({ title, subtitle, children }: {title: string; subtitle?: string; children?: React.ReactNode}) {
  return <View style={s.panel}><Text style={s.panelTitle}>{title}</Text>{subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}{children}</View>;
}
export default function App() {
  const [tab, setTab] = useState<Tab>('Мир');
  const [messages, setMessages] = useState<Message[]>([{id: 1, author:'Партнёр', text:'Привет! Как прошёл день? ♡'}]);
  const [draft, setDraft] = useState('');
  const [dateOffset, setDateOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [worldLevel, setWorldLevel] = useState(0);
  const [roomIndex, setRoomIndex] = useState(0);
  const [tasks, setTasks] = useState(initialTasks.map((name, id) => ({ id, name, done: false })));
  const [newTask, setNewTask] = useState('');
  const [historyYear, setHistoryYear] = useState(2026);
  const [showTools, setShowTools] = useState(false);
  const last = messages[messages.length - 1];
  const days = useMemo(() => {
    const today = new Date(); const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay()+6)%7) + dateOffset*7);
    return weekDays.map((name,i) => { const d = new Date(monday); d.setDate(monday.getDate()+i); return {name, day: d.getDate(), month: d.getMonth()+1}; });
  },[dateOffset]);
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages(old => [...old, {id: Date.now(),author:'Я',text}]);
    setDraft('');
  };
  const entry = <View style={s.compose}><TextInput value={draft} onChangeText={setDraft} placeholder="Написать сообщение..." placeholderTextColor="#95879a" style={s.input} multiline /><TouchableOpacity style={s.send} onPress={send}><Text style={s.sendLabel}>➤</Text></TouchableOpacity></View>;
  const selectedDate = days[selectedDay];
  return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor="#faf7ff" />
    <View style={s.header}><View><Text style={s.eyebrow}>МЕЖДУ НАМИ</Text><Text style={s.headerTitle}>{tab === 'Активности' ? 'Наша жизнь' : tab === 'Мир' ? 'Наш мир' : tab === 'История' ? 'Наша история' : tab}</Text></View><Text style={s.headerHeart}>♥</Text></View>
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {tab === 'Мир' && <>
        <Panel title={worldLevel===0 ? rooms[roomIndex] : levels[worldLevel]} subtitle="Упрощённая сцена. Настоящий 3D-мир появится на следующем этапе.">
          <View style={s.worldScene}><Text style={s.worldBackdrop}>{['⌂  ♡  ⌂','⌂  ⌂  ⌂','⌂  ♧  ⌂','◎  ✧  ◎'][worldLevel]}</Text><Text style={s.worldAvatars}>{worldLevel===0?'◕  ♥  ◕':'✦    ♥    ✦'}</Text><Text style={s.worldCaption}>{levels[worldLevel]}</Text>
            {worldLevel===0 && <View style={s.speech}><Text numberOfLines={2} style={s.speechText}>{last.text}</Text></View>}
          </View>
          <View style={s.actions}><Button label="＋ Приблизить" onPress={()=>setWorldLevel(v=>Math.max(0,v-1))}/><Button label="－ Отдалить" onPress={()=>setWorldLevel(v=>Math.min(3,v+1))}/></View>
          {worldLevel===0 && <View style={s.actions}><Button label="↑ Комната" onPress={()=>setRoomIndex(v=>(v+2)%3)}/><Button label="↓ Комната" onPress={()=>setRoomIndex(v=>(v+1)%3)}/></View>}
        </Panel>
        <Panel title="Быстрое сообщение" subtitle="Отправляется в ту же историю, что и обычный чат.">{entry}</Panel>
      </>}
      {tab === 'Общение' && <>
        <Panel title="Наша переписка" subtitle="Демонстрационный локальный чат">
          {messages.map(m=><View key={m.id} style={[s.chatLine,m.author==='Я'&&s.ownMessage]}><Text style={s.chatAuthor}>{m.author}</Text><Text style={s.chatText}>{m.text}</Text></View>)}
          {entry}
        </Panel>
        <Panel title="Знаки внимания" subtitle="Интерактивные действия будут добавляться поэтапно."><View style={s.actions}><Button label="♡ Объятие" onPress={()=>setMessages(a=>[...a,{id:Date.now(),author:'Я',text:'Отправлено виртуальное объятие ♡'}])}/><Button label="✉ Письмо" onPress={()=>setDraft('Моё письмо: ')}/></View></Panel>
      </>}
      {tab === 'Активности' && <>
        <Panel title="На этой неделе">
          <View style={s.actions}><Button label="‹" onPress={()=>setDateOffset(x=>x-1)}/><Button label="Сегодня" onPress={()=>{setDateOffset(0);setSelectedDay((new Date().getDay()+6)%7);}}/><Button label="›" onPress={()=>setDateOffset(x=>x+1)}/></View>
          <View style={s.week}>{days.map((d,i)=><TouchableOpacity key={i} style={[s.day,selectedDay===i&&s.selectedDay]} onPress={()=>setSelectedDay(i)}><Text style={s.dayLabel}>{d.name}</Text><Text style={s.dayNum}>{d.day}</Text></TouchableOpacity>)}</View>
          <Text style={s.muted}>Выбран день: {selectedDate.day}.{String(selectedDate.month).padStart(2,'0')}</Text>
        </Panel>
        <Panel title="Повестка выбранного дня" subtitle="События дня появятся здесь после подключения календаря."/>
        <Panel title="Ближайшие планы"><Text style={s.body}>♡ Вместе выбрать место для прогулки</Text></Panel>
        <Panel title="Наши дела" subtitle={tasks.filter(t=>t.done).length+' из '+tasks.length+' выполнено'}>
          {tasks.map(t=><TouchableOpacity key={t.id} onPress={()=>setTasks(list=>list.map(x=>x.id===t.id?{...x,done:!x.done}:x))} style={s.task}><Text style={s.body}>{t.done?'☑':'☐'}  {t.name}</Text></TouchableOpacity>)}
          <View style={s.compose}><TextInput style={s.input} value={newTask} onChangeText={setNewTask} placeholder="Новая задача" placeholderTextColor="#95879a"/><TouchableOpacity style={s.send} onPress={()=>{if(!newTask.trim())return;setTasks(a=>[...a,{id:Date.now(),name:newTask.trim(),done:false}]);setNewTask('');}}><Text style={s.sendLabel}>＋</Text></TouchableOpacity></View>
        </Panel>
        <Panel title="Идеи и желания"><Text style={s.body}>✧ Посмотреть новый фильм</Text><Text style={s.body}>✧ Небольшое путешествие</Text></Panel>
        <Button label={showTools?'Скрыть инструменты':'Все инструменты →'} onPress={()=>setShowTools(v=>!v)}/>
        {showTools && <Panel title="Разделы"><Text style={s.body}>Календарь · Задачи · Идеи · Цели · Голосования · Поездки</Text></Panel>}
      </>}
      {tab === 'История' && <>
        <Panel title="Дорога воспоминаний" subtitle="Сезонная хронология; интерактивные 3D-декорации — следующий этап.">
          <View style={s.actions}><Button label="‹ Год" onPress={()=>setHistoryYear(y=>y-1)}/><Button label={String(historyYear)} onPress={()=>setHistoryYear(2026)}/><Button label="Год ›" onPress={()=>setHistoryYear(y=>y+1)}/></View>
          <View style={s.road}>
            <Text style={s.season}>❀ Весна</Text><Text style={s.roadNode}>● Первые моменты</Text>
            <Text style={s.season}>☀ Лето</Text><Text style={s.roadNode}>● Наши прогулки    ▧ Фото</Text>
            <Text style={s.season}>❧ Осень</Text><Text style={s.roadNode}>● Совместный вечер ♡</Text>
            <Text style={s.season}>❄ Зима</Text><Text style={s.roadNode}>● Памятные даты</Text>
          </View>
        </Panel>
        <Panel title="В этот день" subtitle="Здесь будут появляться воспоминания прошлых лет."/>
        <Panel title="Наши коллекции"><Text style={s.body}>Альбомы  ·  Дневники  ·  Письма</Text><Text style={s.body}>Капсулы времени  ·  Поездки  ·  Наша книга</Text></Panel>
      </>}
      {tab === 'Ещё' && <>
        {['Профиль и связи','Персонализация','Бюджет и монеты','Заметки и файлы','ИИ-помощники','Настройки и приватность','Устройства и подписка','Помощь'].map(x=><Panel key={x} title={x} subtitle="Раздел будет реализован на следующем этапе."/>)}
      </>}
    </ScrollView>
    <View style={s.nav}>{tabs.map((t,i)=><TouchableOpacity key={t.title} onPress={()=>setTab(t.title)} style={[s.navItem,i===2&&s.navCenter]}><Text style={[s.navIcon,tab===t.title&&s.activeTab]}>{t.symbol}</Text><Text style={[s.navText,tab===t.title&&s.activeTab]}>{t.title}</Text></TouchableOpacity>)}</View>
  </SafeAreaView>;
}
const s=StyleSheet.create({
safe:{flex:1,backgroundColor:'#faf7ff'},header:{paddingHorizontal:22,paddingTop:14,paddingBottom:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{fontSize:10,letterSpacing:3,color:'#9975a8',fontWeight:'700'},headerTitle:{fontSize:29,fontWeight:'800',color:'#3d2b4d'},headerHeart:{fontSize:25,color:'#e69ab1'},page:{flex:1},content:{paddingHorizontal:16,paddingBottom:24,gap:14},panel:{backgroundColor:'#fff',padding:16,borderRadius:23,borderWidth:1,borderColor:'#f0e9f3',gap:11},panelTitle:{fontWeight:'800',fontSize:17,color:'#483451'},muted:{color:'#94859b',fontSize:12,lineHeight:19},body:{color:'#574462',fontSize:14,lineHeight:24},pill:{backgroundColor:'#f2ebfa',paddingHorizontal:12,paddingVertical:9,borderRadius:20},pillSelected:{backgroundColor:'#d5b9ed'},pillText:{color:'#6f557f',fontSize:12,fontWeight:'600'},pillTextSelected:{color:'#3c2b49'},actions:{flexDirection:'row',gap:7,flexWrap:'wrap'},compose:{flexDirection:'row',alignItems:'center',gap:7},input:{flex:1,minHeight:42,maxHeight:100,backgroundColor:'#f8f3fb',borderRadius:20,paddingHorizontal:14,paddingVertical:10,color:'#46334f'},send:{width:42,height:42,backgroundColor:'#e2bce6',borderRadius:21,alignItems:'center',justifyContent:'center'},sendLabel:{color:'#483451',fontSize:20},chatLine:{alignSelf:'flex-start',backgroundColor:'#f7f0fa',padding:12,borderRadius:14,maxWidth:'90%'},ownMessage:{alignSelf:'flex-end',backgroundColor:'#f2dfe9'},chatAuthor:{fontSize:10,color:'#8a6b95',marginBottom:2},chatText:{fontSize:14,color:'#4a3552'},worldScene:{height:225,borderRadius:20,backgroundColor:'#eee3f9',justifyContent:'center',alignItems:'center',overflow:'hidden'},worldBackdrop:{fontSize:43,color:'#c6aadf'},worldAvatars:{fontSize:50,color:'#b878a8'},worldCaption:{fontWeight:'700',color:'#765388'},speech:{position:'absolute',top:9,right:9,left:9,backgroundColor:'#fff',borderRadius:16,padding:10},speechText:{fontSize:12,color:'#63446b',textAlign:'center'},week:{flexDirection:'row',justifyContent:'space-between'},day:{flex:1,alignItems:'center',marginHorizontal:1,paddingVertical:9,borderRadius:12,backgroundColor:'#faf6fd'},selectedDay:{backgroundColor:'#ead3f0'},dayLabel:{fontSize:10,color:'#8c709c'},dayNum:{fontSize:15,fontWeight:'700',color:'#583b68',marginTop:4},task:{paddingVertical:4},road:{marginLeft:15,borderLeftWidth:4,borderColor:'#e5bfd0',paddingLeft:19,gap:8,paddingVertical:10},season:{fontSize:16,fontWeight:'700',color:'#8d6d89',marginTop:8},roadNode:{fontSize:14,backgroundColor:'#faf1f7',padding:12,borderRadius:15,color:'#5c465f'},nav:{flexDirection:'row',backgroundColor:'#fff',borderTopColor:'#f1e8f1',borderTopWidth:1,paddingBottom:10,paddingTop:8,paddingHorizontal:6,justifyContent:'space-around',alignItems:'center'},navItem:{flex:1,alignItems:'center',gap:2},navCenter:{backgroundColor:'#ead2f0',borderRadius:28,paddingVertical:8,marginTop:-15},navIcon:{fontSize:23,color:'#9a84a3'},navText:{fontSize:9,color:'#927f9a'},activeTab:{color:'#633975',fontWeight:'800'}
});
