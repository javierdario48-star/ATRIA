import test from 'node:test';
import assert from 'node:assert/strict';
import {receptionBoardHTML} from './reception-board.js';
test('reception shows two independent boxes, labels and countdown',()=>{
 const h=receptionBoardHTML({mode:'competitive',remainingSeconds:1260,patients:[
 {uid:'a',bedId:'B1',caseId:'X',triage:{state:'critical',label:'CRÍTICO'}},
 {uid:'b',bedId:'B3',caseId:'X',ownerId:'me',triage:{state:'stable',label:'ESTABLE'}}]},[{id:'X',demo:'Ana',chief:'Dolor'}],'me');
 assert.match(h,/data-acuity="critical"/);assert.match(h,/data-acuity="stable"/);
 assert.match(h,/21:00/);assert.match(h,/B3/);assert.match(h,/A tu cargo/);
});
