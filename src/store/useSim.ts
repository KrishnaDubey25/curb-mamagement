import {useMemo} from 'react';
import {create} from 'zustand';
import {persist,createJSONStorage} from 'zustand/middleware';
import {allocate,evaluateStatic} from '../engine/allocate';
import {DEFAULT_RULES,INITIAL_SEGMENTS,SCENARIOS} from '../data/scenarios';
import type {Demand,Rules,Segment,Snapshot} from '../types';
type Sim={scenario:string;time:number;demand:Demand;segments:Segment[];rules:Rules;playing:boolean;speed:number;selected:string|null;dark:boolean;history:{time:number;scenario:string;served:number;unmet:number;utilization:number;conflicts:number}[];saved:Snapshot[];view3d:boolean;
 selectScenario:(name:string)=>void;setDemand:(key:keyof Demand,value:number)=>void;setTime:(n:number)=>void;tick:()=>void;setPlaying:(b:boolean)=>void;setSpeed:(n:number)=>void;setSelected:(s:string|null)=>void;setDark:(b:boolean)=>void;set3d:(b:boolean)=>void;setSegment:(id:string,update:Partial<Segment>)=>void;setRules:(r:Rules)=>void;resetRules:()=>void;reset:()=>void;save:()=>void;load:(index:number)=>void;log:()=>void};
const initial=SCENARIOS['Morning rush'];
export const useSim=create<Sim>()(persist((set,get)=>({scenario:'Morning rush',time:initial.time,demand:{...initial.demand},segments:INITIAL_SEGMENTS.map(s=>({...s})),rules:structuredClone(DEFAULT_RULES),playing:false,speed:1,selected:null,dark:false,view3d:true,history:[],saved:[],
 selectScenario:(scenario)=>{const s=SCENARIOS[scenario];if(!s)return;set(st=>({scenario,time:s.time,demand:{...s.demand},segments:st.segments.map((x,i)=>({...x,locked:scenario==='Road restriction'&&(i===5||i===6)?'restricted':INITIAL_SEGMENTS[i]?.locked}))}));get().log();},
 setDemand:(key,value)=>{set(st=>({demand:{...st.demand,[key]:Math.max(0,Number(value)||0)}}));get().log();},
 setTime:(time)=>{set({time:((time%24)+24)%24});get().log();},
 tick:()=>{set(st=>({time:(st.time+0.25)%24}));get().log();},setPlaying:(playing)=>set({playing}),setSpeed:(speed)=>set({speed}),setSelected:(selected)=>set({selected}),setDark:(dark)=>set({dark}),set3d:(view3d)=>set({view3d}),
 setSegment:(id,update)=>{set(st=>({segments:st.segments.map(s=>s.id===id?{...s,...update}:s)}));get().log();},
 setRules:(rules)=>{set({rules});get().log();},resetRules:()=>{set({rules:structuredClone(DEFAULT_RULES)});get().log();},
 reset:()=>{const s=SCENARIOS['Morning rush'];set({scenario:'Morning rush',time:s.time,demand:{...s.demand},segments:INITIAL_SEGMENTS.map(x=>({...x})),playing:false,history:[]});get().log();},
 save:()=>set(st=>({saved:[...st.saved,{name:`${st.scenario} • ${new Date().toLocaleString()}`,time:st.time,demand:{...st.demand},segments:structuredClone(st.segments),rules:structuredClone(st.rules)}].slice(-20)})),
 load:(index)=>{const s=get().saved[index];if(s){set({scenario:s.name,time:s.time,demand:structuredClone(s.demand),segments:structuredClone(s.segments),rules:structuredClone(s.rules),playing:false});get().log();}},
 log:()=>{const st=get(),res=allocate(st.segments,st.demand,st.rules,st.time,st.scenario);set({history:[...st.history,{time:st.time,scenario:st.scenario,served:res.metrics.servedTotal,unmet:res.metrics.unmetTotal,utilization:res.metrics.utilization,conflicts:res.metrics.conflicts}].slice(-120)})}
 }),{name:'smartcurb-v1',storage:createJSONStorage(()=>localStorage),partialize:(s)=>({scenario:s.scenario,time:s.time,demand:s.demand,segments:s.segments,rules:s.rules,dark:s.dark,saved:s.saved,history:s.history,view3d:s.view3d}),merge:(persisted,current)=>{try{const p=persisted as Partial<Sim>;return {...current,...p,playing:false,segments:Array.isArray(p.segments)&&p.segments.length?p.segments:current.segments,rules:p.rules?.priority&&p.rules?.capacityMeters?p.rules:current.rules,demand:p.demand&&Object.keys(p.demand).length>=6?p.demand:current.demand}}catch{return current}}}));
export const selectResults=(s:Sim)=>{const dynamic=allocate(s.segments,s.demand,s.rules,s.time,s.scenario);const base=SCENARIOS['Morning rush'];const reference=allocate(s.segments,base.demand,s.rules,base.time,'Reference morning');return {dynamic,staticResult:evaluateStatic(s.segments,s.demand,s.rules,reference,s.time,s.scenario)}};

export function useResults(){const s=useSim();return useMemo(()=>selectResults(s),[s.segments,s.demand,s.rules,s.time,s.scenario]);}
