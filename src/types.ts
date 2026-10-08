export const USES=['bus','auto','delivery','parking','pedestrian','emergency','restricted'] as const;
export type Use=typeof USES[number];
export type DemandUse=Exclude<Use,'restricted'>;
export type Demand=Record<DemandUse,number>;
export interface Segment {id:string;length:number;allowed:Use[];locked?:'pedestrian'|'emergency'|'restricted';occupancy:number}
export interface Rules {priority:Record<DemandUse,number>; pedestrianMinimum:number; emergencyRequired:boolean; capacityMeters:Record<DemandUse,number>}
export interface Assignment {id:string;use:Use;length:number;capacity:number;occupancy:number;score:number;reason:string;demand:number}
export interface Metrics {utilization:number;served:Record<DemandUse,number>;unmet:Record<DemandUse,number>;conflicts:number;accessible:boolean;allocatedMeters:number;availableMeters:number;servedTotal:number;unmetTotal:number}
export interface Result {assignments:Assignment[];metrics:Metrics;time:number;scenario:string}
export interface Snapshot {name:string;time:number;demand:Demand;segments:Segment[];rules:Rules}
