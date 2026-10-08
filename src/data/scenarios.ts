import type {Demand,Segment,Rules} from '../types';
export const USE_LABELS={bus:'Bus transit',auto:'Auto pickup',delivery:'Loading / delivery',parking:'Car parking',pedestrian:'Pedestrian access',emergency:'Emergency access',restricted:'Restricted'} as const;
export const COLORS={bus:'#3d93ff',auto:'#9e7bff',delivery:'#ffae4d',parking:'#3ed8a6',pedestrian:'#9aabbc',emergency:'#ffdc60',restricted:'#fa687a'} as const;
export const SCENARIOS:Record<string,{time:number;demand:Demand;description:string}>={
 'Morning rush':{time:8,demand:{bus:24,auto:16,delivery:10,parking:20,pedestrian:30,emergency:0},description:'Public transit and pedestrian peak'},
 'Afternoon delivery':{time:13,demand:{bus:12,auto:8,delivery:35,parking:20,pedestrian:25,emergency:0},description:'Commercial loading peak'},
 'Evening commute':{time:18,demand:{bus:21,auto:14,delivery:10,parking:25,pedestrian:30,emergency:0},description:'Homeward commute'},
 'High parking':{time:15,demand:{bus:12,auto:10,delivery:12,parking:56,pedestrian:26,emergency:0},description:'Strong general parking demand'},
 'Transit surge':{time:9,demand:{bus:50,auto:35,delivery:8,parking:12,pedestrian:30,emergency:0},description:'Unusually high public transport use'},
 'Road restriction':{time:14,demand:{bus:16,auto:12,delivery:24,parking:28,pedestrian:27,emergency:0},description:'Two temporary curb closures'},
 'Emergency access':{time:11,demand:{bus:16,auto:12,delivery:20,parking:22,pedestrian:27,emergency:15},description:'Protected emergency corridor'},
 'Event crowd':{time:20,demand:{bus:34,auto:45,delivery:14,parking:38,pedestrian:55,emergency:0},description:'Venue pickup and pedestrian surge'}
};
export const INITIAL_SEGMENTS:Segment[]=Array.from({length:16},(_,i)=>({id:`C${String(i+1).padStart(2,'0')}`,length:[12,16,20,14,18,12,22,16][i%8],allowed:['bus','auto','delivery','parking','pedestrian','emergency'],locked:i===0||i===8?'pedestrian':i===15?'emergency':undefined,occupancy:0}));
export const DEFAULT_RULES:Rules={priority:{emergency:100,pedestrian:90,bus:75,auto:60,delivery:45,parking:30},pedestrianMinimum:2,emergencyRequired:true,capacityMeters:{bus:12,auto:6,delivery:8,parking:5,pedestrian:4,emergency:12}};
export const categories=['bus','auto','delivery','parking','pedestrian','emergency'] as const;
