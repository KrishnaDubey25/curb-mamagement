import {describe,it,expect} from 'vitest';
import {BAYS,chooseBay,evaluate,statusFor,type Booking,type Vehicle} from '../parking/core';
const book:Booking={id:'b1',bayId:'L01',plate:'MH02AB1234',name:'Demo',start:540,duration:15,status:'arrived'};
const car:Vehicle={id:'v1',bayId:'L01',plate:'MH02AB1234',arrived:540,source:'booking'};
describe('curb booking and enforcement demo',()=>{
it('only selects a compatible zone',()=>{expect(chooseBay('bus',[],[],540)?.kind).toBe('bus')});
it('will not double book a reserved bay',()=>{expect(chooseBay('parking',[{...book,status:'reserved'}],[],540)?.id).not.toBe('L01')});
it('marks occupied spaces',()=>{expect(statusFor(BAYS[0],[book],[car],550)).toBe('occupied')});
it('does not fine a valid short stay',()=>{expect(evaluate(BAYS[0],[book],[car],544,5,500)).toHaveLength(0)});
it('flags an unregistered vehicle after grace',()=>{expect(evaluate(BAYS[0],[],[car],546,5,500)[0].amount).toBe(500)});
it('flags booking overstay',()=>{expect(evaluate(BAYS[0],[book],[car],561,5,500)[0].reason).toContain('Booking time exceeded')});
});
