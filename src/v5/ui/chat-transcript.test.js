import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatTranscript} from './chat-transcript.js';

function fakeDom(){
 class Element{
  constructor(tag){this.tag=tag;this.className='';this.dataset={};this.textContent='';this.children=[];this.scrollHeight=10;this.scrollTop=0;}
  append(...items){for(const x of items)if(x.tag==='fragment')this.children.push(...x.children);else this.children.push(x);}
  replaceChildren(...items){this.children=[];this.append(...items);}
  get firstChild(){return this.children[0];}
  remove(){} // A parent-aware implementation is supplied by the fixture below.
 }
 const document={createElement:tag=>new Element(tag),
  createDocumentFragment:()=>new Element('fragment'),
  createTextNode:text=>({tag:'text',textContent:text})};
 const element=new Element('history');
 const original=element.append.bind(element);
 element.append=(...args)=>{original(...args);for(const child of element.children)child.remove=()=>{element.children.splice(element.children.indexOf(child),1);};};
 return {document,element};
}
test('chat presentation preserves social append cap and does not evaluate untrusted HTML',()=>{
 const {document,element}=fakeDom(),history=[],r=createChatTranscript({document,element,history,maxRows:3});
 for(let i=0;i<7;i++)r.append('Dr','<script>'+i+'</script>');
 assert.deepEqual(history.map(x=>x.text),['<script>4</script>','<script>5</script>','<script>6</script>']);
 assert.equal(element.children.length,3);
 assert.equal(element.children[0].children[1].tag,'text');
 assert.equal(element.children[0].children[1].textContent,'<script>4</script>');
});
test('filtered clinical messages replace transcript with deterministic roles and previews',()=>{
 const {document,element}=fakeDom(),history=[],r=createChatTranscript({document,element,history});
 r.append('Old','stale');
 r.replace([{id:'m1',role:'patient',name:'Paciente',text:'Me duele'},
   {id:'m2',role:'nurse',name:'Enfermera',text:'Administrado'},
   {id:'m3',role:'player',name:'Doctor',text:'¿Cuándo?'}],
  [{id:'p1',name:'Colega',text:'Hola'}]);
 assert.deepEqual(history.map(x=>x.text),['Me duele','Administrado','¿Cuándo?','Hola']);
 assert.deepEqual(element.children.map(x=>x.className),['line patient','line nurse','line','line']);
 assert.deepEqual(element.children.map(x=>x.dataset.messageId),['m1','m2','m3','p1']);
 assert.equal(element.children[0].dataset.role,'patient');
 assert.equal(element.children[3].dataset.role,undefined);
 r.clear();assert.deepEqual(history,[]);assert.equal(element.children.length,0);
});
