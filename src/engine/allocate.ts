import type {Assignment,Demand,DemandUse,Metrics,Result,Rules,Segment,Use} from '../types';
import {categories} from '../data/scenarios';
const blank=():Record<DemandUse,number>=>({bus:0,auto:0,delivery:0,parking:0,pedestrian:0,emergency:0});
const count=(length:number,meters:number)=>Math.max(0,Math.floor(length/Math.max(1,meters)));
/** Pure, deterministic, safety-first greedy capacity allocator.
 * Demand represents desired service units; each unit consumes configured meters.
 * Every segment is assigned one use, with no co-location; surplus demand is reported.
 */
export function allocate(segments:Segment[],demand:Demand,rules:Rules,time=8,scenario='Custom'):Result {
 const served=blank(), unmet=blank(); const assignments:Assignment[]=[];
 const desired={...blank(),...demand};
 for(const cat of categories) desired[cat]=Math.max(0,Number.isFinite(desired[cat])?desired[cat]:0);
 const protectedPed=segments.filter(s=>s.locked==='pedestrian').length;
 const extraPed=Math.max(0,Math.min(segments.filter(s=>!s.locked&&s.allowed.includes('pedestrian')).length,rules.pedestrianMinimum-protectedPed));
 let protectedAssigned=0;
 const assign=(s:Segment,use:Use,reason:string):Assignment=>{
  const demandUnits=use==='restricted'?0:desired[use];
  const capacity=use==='restricted'?0:count(s.length,rules.capacityMeters[use]);
  const remaining=use==='restricted'?0:Math.max(0,desired[use]-served[use]);
  const used=Math.min(capacity,remaining);
  if(use!=='restricted')served[use]+=used;
  return {id:s.id,use,length:s.length,capacity,occupancy:used,score:use==='restricted'?0:rules.priority[use]*(remaining>0?remaining/(1+capacity):0),reason,demand:demandUnits};
 };
 const sorted=[...categories].sort((a,b)=>rules.priority[b]-rules.priority[a]||categories.indexOf(a)-categories.indexOf(b));
 for(const s of segments){
  if(s.locked==='restricted') {assignments.push(assign(s,'restricted','Segment is closed by a configured restriction.'));continue;}
  if(s.locked==='pedestrian'){assignments.push(assign(s,'pedestrian','Dedicated pedestrian corridor is protected from vehicle use.'));continue;}
  if(s.locked==='emergency'&&rules.emergencyRequired){assignments.push(assign(s,'emergency','Emergency access reservation is mandatory and cannot be overridden.'));continue;}
  if(protectedAssigned<extraPed&&s.allowed.includes('pedestrian')){assignments.push(assign(s,'pedestrian','Additional pedestrian protection meets configured minimum.'));protectedAssigned++;continue;}
  const valid=sorted.filter(k=>s.allowed.includes(k)&& !(k==='emergency'&&desired.emergency<=served.emergency)&&count(s.length,rules.capacityMeters[k])>0);
  const scored=valid.map(k=>({use:k,remaining:Math.max(0,desired[k]-served[k]),score:rules.priority[k]*Math.min(1,Math.max(0,desired[k]-served[k])/Math.max(1,count(s.length,rules.capacityMeters[k])))}))
   .filter(x=>x.remaining>0).sort((a,b)=>b.score-a.score||rules.priority[b.use]-rules.priority[a.use]||categories.indexOf(a.use)-categories.indexOf(b.use));
  const choice=scored[0];
  if(choice){assignments.push(assign(s,choice.use,`${choice.use} demand has ${choice.remaining.toFixed(1)} unmet units; priority ${rules.priority[choice.use]} yields winning score ${choice.score.toFixed(1)} among compatible uses. Ties resolve by priority then fixed category order.`));}
  else {const fallback=s.allowed.includes('pedestrian')?'pedestrian':s.allowed.find(x=>x!=='restricted')||'restricted';assignments.push(assign(s,fallback,'No unmet compatible demand remains; segment stays in a safe permitted use.'));}
 }
 for(const k of categories) unmet[k]=Math.max(0,desired[k]-served[k]);
 const availableMeters=segments.filter(s=>s.locked!=='restricted').reduce((a,s)=>a+s.length,0);
 const allocatedMeters=assignments.filter(a=>a.use!=='restricted').reduce((a,s)=>a+s.length,0);
 const servedTotal=categories.reduce((a,k)=>a+served[k],0),unmetTotal=categories.reduce((a,k)=>a+unmet[k],0);
 const conflicts=categories.reduce((a,k)=>a+(k==='pedestrian'||k==='emergency'?0:Math.ceil(unmet[k]/5)),0);
 const accessible=assignments.filter(a=>a.use==='pedestrian').length>=Math.min(rules.pedestrianMinimum,segments.filter(s=>s.locked!=='restricted'&&s.allowed.includes('pedestrian')).length);
 const metrics:Metrics={served,unmet,utilization:servedTotal+unmetTotal>0?100*servedTotal/(servedTotal+unmetTotal):0,conflicts,accessible,allocatedMeters,availableMeters,servedTotal,unmetTotal};
 return {assignments,metrics,time,scenario};
}
/** Baseline pins all unrestricted segments to the allocation at the chosen reference time. */
export function evaluateStatic(segments:Segment[],demand:Demand,rules:Rules,reference:Result,time:number,scenario:string):Result {
 const served=blank(),unmet=blank();const byId=new Map(reference.assignments.map(a=>[a.id,a.use]));
 const assignments:Assignment[]=segments.map(s=>{
  const use=s.locked==='restricted'?'restricted':s.locked==='pedestrian'?'pedestrian':s.locked==='emergency'&&rules.emergencyRequired?'emergency':byId.get(s.id)||'restricted';
  const capacity=use==='restricted'?0:count(s.length,rules.capacityMeters[use]);
  const occupancy=use==='restricted'?0:Math.min(capacity,Math.max(0,(demand[use]||0)-served[use]));
  if(use!=='restricted')served[use]+=occupancy;
  return {id:s.id,use,length:s.length,capacity,occupancy,score:0,demand:use==='restricted'?0:demand[use],reason:'Static baseline: assignment retained from the reference configuration.'};
 });
 for(const k of categories)unmet[k]=Math.max(0,(demand[k]||0)-served[k]);
 const servedTotal=categories.reduce((a,k)=>a+served[k],0),unmetTotal=categories.reduce((a,k)=>a+unmet[k],0);
 return {assignments,time,scenario,metrics:{served,unmet,servedTotal,unmetTotal,utilization:servedTotal+unmetTotal?servedTotal/(servedTotal+unmetTotal)*100:0,conflicts:categories.reduce((a,k)=>a+(k==='pedestrian'||k==='emergency'?0:Math.ceil(unmet[k]/5)),0),accessible:assignments.filter(a=>a.use==='pedestrian').length>=Math.min(rules.pedestrianMinimum,segments.filter(s=>s.locked!=='restricted'&&s.allowed.includes('pedestrian')).length),allocatedMeters:assignments.filter(a=>a.use!=='restricted').reduce((a,s)=>a+s.length,0),availableMeters:segments.filter(s=>s.locked!=='restricted').reduce((a,s)=>a+s.length,0)}};
}
