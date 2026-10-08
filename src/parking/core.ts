export type Kind='parking'|'loading'|'bus'|'pickup';
export type Bay={id:string;kind:Kind;side:'left'|'right';z:number;length:number;priority:number;bookable?:boolean;note?:string};
export type Booking={id:string;bayId:string;plate:string;name:string;start:number;duration:number;status:'reserved'|'arrived'|'complete'};
export type Vehicle={id:string;bayId:string;plate:string;arrived:number;source:'booking'|'unregistered'};
export type Violation={id:string;plate:string;bayId:string;minutes:number;amount:number;reason:string;status:'pending review'|'approved'|'dismissed';created:number};

export const BAYS:Bay[]=[
  {id:'L01',kind:'parking',side:'left',z:-20,length:80,priority:4,bookable:true,note:'General booking parking bay'},
  {id:'L02',kind:'loading',side:'left',z:-6,length:40,priority:2,bookable:true,note:'Commercial loading only'},
  {id:'L03',kind:'parking',side:'left',z:12,length:80,priority:4,bookable:true,note:'General booking parking bay'},
  {id:'R01',kind:'parking',side:'right',z:-19,length:40,priority:4,bookable:true,note:'Short stay booking parking'},
  {id:'R02',kind:'pickup',side:'right',z:-6,length:40,priority:1,bookable:false,note:'Public quick-stop zone, 2–5 minutes'},
  {id:'R03',kind:'loading',side:'right',z:6,length:40,priority:2,bookable:true,note:'Commercial loading only'},
  {id:'R04',kind:'parking',side:'right',z:18,length:60,priority:4,bookable:true,note:'General booking parking bay'},
  {id:'R05',kind:'loading',side:'right',z:30,length:20,priority:2,bookable:true,note:'Short commercial loading bay'},
  {id:'R06',kind:'bus',side:'right',z:42,length:75,priority:0,bookable:true,note:'Priority bus curb'}
];

export const KIND_LABEL:Record<Kind,string>={
  parking:'Bookable Parking',
  loading:'Commercial Loading',
  bus:'Bus Priority Stop',
  pickup:'Quick Stop (2–5 min)'
};

export const COLORS:Record<Kind,string>={
  parking:'#cda775',
  loading:'#f2c04f',
  bus:'#eb8d83',
  pickup:'#9ccf8f'
};

export const cleanPlate=(s:string)=>s.toUpperCase().replace(/[^A-Z0-9]/g,'');

export function statusFor(bay:Bay,bookings:Booking[],vehicles:Vehicle[],now:number){
  const v=vehicles.find(x=>x.bayId===bay.id);
  if(v) return 'occupied';
  return bookings.some(b=>b.bayId===bay.id&&b.status!=='complete'&&now<=b.start+b.duration&&now>=b.start-10)?'reserved':'available';
}

export function chooseBay(kind:Kind,bookings:Booking[],vehicles:Vehicle[],now:number){
  return BAYS
    .filter(b=>b.kind===kind && b.bookable !== false && statusFor(b,bookings,vehicles,now)==='available')
    .sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id))[0];
}

export function evaluate(bay:Bay,bookings:Booking[],vehicles:Vehicle[],now:number,grace:number,rate:number):Violation[]{
  const v=vehicles.find(x=>x.bayId===bay.id);
  if(!v) return [];

  const minutes=Math.max(0,now-v.arrived);
  const matched=bookings.find(b=>b.bayId===bay.id&&cleanPlate(b.plate)===cleanPlate(v.plate)&&b.status!=='complete');
  const active=matched&&now>=matched.start-grace&&now<=matched.start+matched.duration+grace;
  const overstayed=!!matched&&!active&&now>matched.start+matched.duration+grace;
  const isQuickStop=bay.kind==='pickup';

  if(matched && !overstayed) return [];
  if(minutes<=grace) return [];

  let reason='Unauthorized vehicle occupying a managed curb bay';
  if(isQuickStop && !matched) reason=`Quick-stop curb exceeded ${grace} minute limit`;
  else if(overstayed) reason=`Booking time exceeded (including ${grace}-minute grace)`;

  return [{
    id:`${v.id}-${matched?'OVER':'UNAUTH'}`,
    plate:v.plate,
    bayId:bay.id,
    minutes,
    amount:rate,
    reason,
    status:'pending review',
    created:now
  }];
}
