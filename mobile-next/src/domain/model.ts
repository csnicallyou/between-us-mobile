export type Kind = 'event' | 'task' | 'idea' | 'goal' | 'poll' | 'memory' | 'diary' | 'letter' | 'capsule' | 'note' | 'expense' | 'habit' | 'agreement';
export type Visibility = 'private' | 'shared' | 'secret';
export type Block = { id: string; type: 'text' | 'photo' | 'place'; value: string };
export type Entry = { id: string; kind: Kind; title: string; body: string; date: string; visibility: Visibility; owner: string; blocks: Block[]; status: 'open' | 'doing' | 'done'; amount: number; progress: number; linkedId?: string; pinned?: boolean; hidden?: boolean; liked?: boolean; rsvp?: string; versions: { at: string; title: string; body: string; blocks: Block[] }[] };
export type Message = { id: string; text: string; author: string; at: string; reaction?: string; pinned?: boolean; replyTo?: string; media?: string; kind: 'text' | 'care'; status: 'demo' | 'local' };
export type State = { version: 1; onboarded: boolean; name: string; partner: string; paired: boolean; room: 'personal' | 'shared'; mood: string; theme: 'light' | 'dark'; palette: string; avatar: string; reduceMotion: boolean; quiet: boolean; previews: boolean; aiConsent: boolean; entries: Entry[]; messages: Message[]; coins: number; inventory: string[]; requests: { id: string; title: string; before: string; after: string; status: 'pending' | 'accepted' | 'declined'; author: string }[] };
export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const addDays = (key: string, days: number) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate()+days); return dayKey(d); };
export const dateLabel = (key: string) => new Date(`${key.slice(0,10)}T12:00:00`).toLocaleDateString('ru-RU', {day:'numeric',month:'long'});
export const visible = (entry: Entry, paired: boolean) => entry.owner === 'me' || (entry.visibility === 'shared' && paired);
export const makeEntry = (kind: Kind, title: string, extra: Partial<Entry> = {}): Entry => ({id:uid(),kind,title,body:'',date:dayKey(),visibility:'private',owner:'me',blocks:[],status:'open',amount:0,progress:0,versions:[],...extra});
export function parseQuick(text: string, today = dayKey()) { const time = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/); return { kind: (/купить|сделать|позвонить/i.test(text) ? 'task' : /хочу|идея|попробовать/i.test(text) ? 'idea' : 'event') as Kind, date: /послезавтра/i.test(text) ? addDays(today,2) : /завтра/i.test(text) ? addDays(today,1) : today, body: time ? `Время: ${time[0]}` : '' }; }
export function validateEntry(e: Entry): string | null { if (!e.title.trim()) return 'Добавьте название'; if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || Number.isNaN(Date.parse(e.date)) || new Date(`${e.date}T12:00:00`).getDate() !== Number(e.date.slice(8))) return 'Дата: ГГГГ-ММ-ДД'; if (!Number.isFinite(e.amount) || e.amount < 0) return 'Введите положительную сумму'; return null; }
export function saveEntry(state: State, entry: Entry): State { const old=state.entries.find(x=>x.id===entry.id); const next={...entry,title:entry.title.trim(),versions:old ? [...old.versions,{at:new Date().toISOString(),title:old.title,body:old.body,blocks:old.blocks}] : entry.versions}; return {...state,entries:old ? state.entries.map(x=>x.id===next.id?next:x) : [next,...state.entries]}; }
export function seed(): State {
 const today=dayKey();
 return {version:1,onboarded:false,name:'Саша',partner:'Миша',paired:false,room:'personal',mood:'Тихая радость',theme:'light',palette:'peach',avatar:'#E8B0A1',reduceMotion:false,quiet:false,previews:false,aiConsent:false,coins:420,inventory:[],requests:[],entries:[
 makeEntry('event','Вечер без спешки',{date:today,body:'19:00 · приготовить пасту и включить любимый фильм',visibility:'shared'}),
 makeEntry('event','Маленькое путешествие',{date:addDays(today,3),body:'Выбрать новое место за городом. Без плотного расписания.',visibility:'shared'}),
 makeEntry('task','Выбрать фильм на вечер',{date:today,visibility:'shared'}),makeEntry('task','Купить что-нибудь к чаю',{date:today,visibility:'shared'}),
 makeEntry('idea','Уехать к морю',{body:'Почувствовать солёный ветер и никуда не торопиться.',visibility:'shared'}),makeEntry('idea','Гончарная мастерская',{body:'Сделать две немного неровные, но наши чашки.',visibility:'shared'}),
 makeEntry('goal','Наше путешествие',{amount:60000,progress:38,visibility:'shared'}),makeEntry('habit','Прогулка без телефонов',{visibility:'shared'}),
 makeEntry('memory','Там, где тихо',{date:addDays(today,-8),body:'Демонстрационная запись: осенний парк, тёплый чай и разговоры обо всём.',visibility:'shared',blocks:[{id:uid(),type:'text',value:'Иногда лучший план — просто идти рядом.'}]}),
 makeEntry('memory','Лето в маленьких деталях',{date:'2026-07-12',body:'Демонстрационная запись: самый длинный день нашего лета.',visibility:'shared'}),
 makeEntry('memory','С чего всё началось',{date:'2026-03-21',body:'Демонстрационная запись: начало нашей маленькой истории.',visibility:'shared',pinned:true}),
 makeEntry('poll','Как проведём выходные?',{body:'За городом\nДома с кино\nВ новом месте',visibility:'shared'}),
 ],messages:[{id:'welcome',text:'Здесь будут наши маленькие «как ты?» и большие «люблю».',author:'partner',at:new Date().toISOString(),kind:'text',status:'demo'}]};
}
