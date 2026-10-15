import {createContext,useContext} from 'react';
export type Route={name:string;id?:string;kind?:string};
export const Navigation=createContext<{open:(name:string,params?:Omit<Route,'name'>)=>void;back:()=>void;toast:(s:string)=>void}>(null!);
export const useNav=()=>useContext(Navigation);
