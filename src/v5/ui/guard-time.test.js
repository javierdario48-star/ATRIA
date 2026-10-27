import test from 'node:test';
import assert from 'node:assert/strict';
import {formatGuardTime} from './guard-time.js';
test('one real second equals one game minute, across the full 24h shift',()=>{
 assert.deepEqual(formatGuardTime(0),{
  time:'08:15',displayTime:'☀️ 08:15 AM',period:'AM',daylight:true,progress:'00:00 / 24:00',ended:false,
  accessible:'Hora del hospital 08:15 AM, de día. Guardia transcurrida 00:00 / 24:00.'});
 for(const [elapsed,displayTime,daylight] of [[225,'☀️ 12:00 PM',true],[585,'🌙 06:00 PM',false],
  [945,'🌙 12:00 AM',false],[1305,'☀️ 06:00 AM',true]]){
  assert.equal(formatGuardTime(elapsed).displayTime,displayTime);assert.equal(formatGuardTime(elapsed).daylight,daylight);
 }
 assert.equal(formatGuardTime(60).time,'09:15');
 assert.equal(formatGuardTime(945).time,'00:00');
 assert.equal(formatGuardTime(1439).progress,'23:59 / 24:00');
 assert.equal(formatGuardTime(1440).time,'08:15');
 assert.equal(formatGuardTime(1440).ended,true);
 assert.equal(formatGuardTime(2000).progress,'24:00 / 24:00');
 assert.equal(formatGuardTime(NaN).time,'08:15');
});
