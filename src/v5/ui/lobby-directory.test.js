import test from 'node:test';
import assert from 'node:assert/strict';
import {createLobbyDirectory} from './lobby-directory.js';

function fixture(){
 const rows=new Map();
 function element(id){
  if(!rows.has(id)){
   let markup='',writes=0,checked=[];
   const e={id,textContent:'',get innerHTML(){return markup;},
    set innerHTML(value){markup=value;writes++;checked=[...value.matchAll(/<input[^>]*value="([^"]+)" checked/g)].map(m=>({value:m[1]}));},
    querySelectorAll(selector){return selector==='input:checked'?checked:[];},
    select(value){checked=[{value}];},get writes(){return writes;}};
   rows.set(id,e);
  }
  return rows.get(id);
 }
 const view=createLobbyDirectory({document:{getElementById:element},escape:String});
 const me={user:{id:'a'},roster:[
  {userId:'a',name:'Ana',x:40,y:60},{userId:'b',name:'Bruno',x:50,y:60}],
  friends:[],invites:[],requests:{incoming:[],outgoing:[]}};
 return {view,me,element};
}

test('presence poses update the connected count without recreating actionable mobile controls',()=>{
 const {view,me,element}=fixture();
 view.render(me);
 assert.equal(element('peopleButton').textContent,'Personas · 1');
 assert.equal(element('onlineDoctorsCount').textContent,'1');
 assert.match(element('lobbyContacts').innerHTML,/Bruno/);
 element('coopDoctors').select('b');
 const before=element('lobbyContacts').writes;
 const checkboxWrites=element('coopDoctors').writes;
 for(let i=0;i<120;i++)view.render({...me,roster:me.roster.map(p=>({...p,x:p.x+i*2,seq:i,moving:true}))});
 assert.equal(element('lobbyContacts').writes,before,'movement must not replace a pressed contact button');
 assert.equal(element('coopDoctors').writes,checkboxWrites,'movement must not replace a checked invitation');
 assert.equal(element('coopDoctors').querySelectorAll('input:checked')[0].value,'b');
});

test('directory updates once on friendship or roster changes, retaining valid selections',()=>{
 const {view,me,element}=fixture();
 view.render(me);
 element('coopDoctors').select('b');
 view.render({...me,friends:[{id:'b'}]});
 assert.match(element('lobbyContacts').innerHTML,/Amigo/);
 assert.equal(element('coopDoctors').querySelectorAll('input:checked')[0].value,'b');
 view.render({...me,roster:[...me.roster,{userId:'c',name:'Celia'}]});
 assert.equal(element('onlineDoctorsCount').textContent,'2');
 assert.match(element('coopDoctors').innerHTML,/checked/);
 view.render({...me,roster:[me.roster[0]]});
 assert.equal(element('onlineDoctorsCount').textContent,'0');
 assert.doesNotMatch(element('lobbyContacts').innerHTML,/Bruno/);
});

test('lobby shows a connection diagnostic instead of silently reporting zero peers when presence is failing',()=>{
 const {view,me,element}=fixture();
 view.render({...me,roster:[me.roster[0]],connectionIssue:true});
 assert.match(element('lobbyContacts').innerHTML,/No se pudo sincronizar el lobby/);
 view.render({...me,connectionIssue:false});
 assert.doesNotMatch(element('lobbyContacts').innerHTML,/No se pudo sincronizar el lobby/);
 assert.match(element('lobbyContacts').innerHTML,/Bruno/);
});
