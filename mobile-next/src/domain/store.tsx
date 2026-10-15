import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { State, seed } from './model';
const KEY='between-us-renewed:v1';
export interface Repository { load(): Promise<State | null>; save(state:State):Promise<void> }
export const repository:Repository={async load(){const raw=await AsyncStorage.getItem(KEY);if(!raw)return null;const parsed=JSON.parse(raw);if(parsed.version!==1 || !Array.isArray(parsed.entries)||!Array.isArray(parsed.messages))throw new Error('Не удалось прочитать сохранение. Исходные данные сохранены.');return {...seed(),...parsed};},async save(s){await AsyncStorage.setItem(KEY,JSON.stringify(s));}};
type Context={state:State;set:React.Dispatch<React.SetStateAction<State>>;ready:boolean;error:string;retry:()=>void};
const Store=createContext<Context>(null!);
export function Provider({children}:{children:React.ReactNode}){const[state,set]=useState(seed);const[ready,setReady]=useState(false);const[error,setError]=useState('');const[attempt,retry]=useState(0);const queue=useRef(Promise.resolve());
useEffect(()=>{let active=true;repository.load().then(s=>{if(active){if(s)set(s);setReady(true);setError('');}}).catch(()=>{if(active)setError('Не удалось загрузить данные. Повторите попытку: сохранение не перезаписано.');});return()=>{active=false};},[attempt]);
useEffect(()=>{if(!ready)return;queue.current=queue.current.catch(()=>{}).then(()=>repository.save(state)).then(()=>setError('')).catch(()=>setError('Изменения пока в памяти: запись на устройство не удалась. Повторите сохранение.'));},[state,ready]);
return <Store.Provider value={{state,set,ready,error,retry:()=>ready?set(s=>({...s})):retry(x=>x+1)}}>{children}</Store.Provider>}
export const useStore=()=>useContext(Store);
