import {describe,it,expect} from 'vitest';import {allocate,evaluateStatic} from '../engine/allocate';import {DEFAULT_RULES,INITIAL_SEGMENTS,SCENARIOS} from '../data/scenarios';
const rules=structuredClone(DEFAULT_RULES),segs=structuredClone(INITIAL_SEGMENTS),d=SCENARIOS['Morning rush'].demand;
describe('safety-first allocation engine',()=>{
 it('identical inputs yield identical outputs',()=>expect(allocate(segs,d,rules)).toEqual(allocate(segs,d,rules)));
 it('length and physical capacity are respected',()=>{const r=allocate(segs,d,rules);expect(r.metrics.allocatedMeters).toBeLessThanOrEqual(r.metrics.availableMeters);r.assignments.forEach(x=>expect(x.occupancy).toBeLessThanOrEqual(x.capacity))});
 it('restricted segments remain restricted',()=>{const x=structuredClone(segs);x[3].locked='restricted';expect(allocate(x,d,rules).assignments[3].use).toBe('restricted')});
 it('dedicated pedestrian protection remains',()=>expect(allocate(segs,d,rules).assignments.filter(a=>a.use==='pedestrian').length).toBeGreaterThanOrEqual(2));
 it('emergency reservation remains',()=>expect(allocate(segs,d,rules).assignments[15].use).toBe('emergency'));
 it('unmet equals demand minus served',()=>{const r=allocate(segs,d,rules);for(const key of Object.keys(d) as (keyof typeof d)[])expect(r.metrics.unmet[key]).toBe(Math.max(0,d[key]-r.metrics.served[key]))});
 it('zero demand produces zero unmet and no conflicts',()=>{const z={bus:0,auto:0,delivery:0,parking:0,pedestrian:0,emergency:0};const r=allocate(segs,z,rules);expect(r.metrics.unmetTotal).toBe(0);expect(r.metrics.conflicts).toBe(0)});
 it('extreme demand is explicitly unmet',()=>{const high={bus:1000,auto:1000,delivery:1000,parking:1000,pedestrian:1000,emergency:1000};expect(allocate(segs,high,rules).metrics.unmetTotal).toBeGreaterThan(0)});
 it('static and dynamic demand inputs reconcile',()=>{const reference=allocate(segs,d,rules);const dyn=allocate(segs,d,rules);const st=evaluateStatic(segs,d,rules,reference,8,'Morning rush');expect(dyn.metrics.servedTotal+dyn.metrics.unmetTotal).toBe(st.metrics.servedTotal+st.metrics.unmetTotal)});
 it('assignment explanations exist for every segment',()=>expect(allocate(segs,d,rules).assignments.every(a=>a.reason.length>15)).toBe(true));
});
