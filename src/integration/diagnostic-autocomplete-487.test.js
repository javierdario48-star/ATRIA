// Run the actual generated browser script in a minimal DOM / keyboard simulator.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const marker='<script id="atria-diagnostic-autocomplete-487">';
assert.equal(html.split(marker).length,2,'diagnostic editor injected exactly once');
assert.equal(html.split('id="atria-diagnostic-style-487"').length,2,'one scoped CSS');
const source=html.split(marker)[1].split('</script>')[0];
new vm.Script(source,{filename:'diagnostic-editor-runtime.js'});
let C={id:'PERI-SEC-001'},sim=specimen(),now=1500;
function specimen(){return {diagnosis:'',events:[],gameMinute:1,caseEnded:false,patientDied:false}}
const elements=new Map();
let document;
class E {
 constructor(id=''){this.id=id;this.style={};this.dataset={};this.children=[];this.attrs={};this.listeners={};
  const active=new Set();
  this.classList={add:(s)=>active.add(s),remove:(s)=>active.delete(s),contains:(s)=>active.has(s),
   toggle:(s,on)=>{if(on)active.add(s);else active.delete(s)}};
  this.disabled=false;this.readOnly=false;this.value='';this.textContent='';this._html='';
 }
 set innerHTML(value){this._html=value;if(this.id==='csDxSuggestions487')this.children=[];
  if(this.id==='csDxDialog487'){
   this.selectors={};
   for(const cls of ['.card','.close','.save','.clear'])this.selectors[cls]=new E(cls);
   for(const id of ['csDxInput487','csDxSuggestions487','csDxInfo487'])elements.set(id,new E(id));
  }
 }
 get innerHTML(){return this._html}
 appendChild(x){this.children.push(x);if(x.id)elements.set(x.id,x);return x}
 addEventListener(type,fn){this.listeners[type]=fn}
 setAttribute(k,v){this.attrs[k]=v}
 querySelector(css){return this.selectors?.[css]??null}
 focus(){document.activeElement=this;this.onfocus?.()}
 blur(){document.activeElement=null}
}
const body=new E('body');
document={body,activeElement:null,createElement:tag=>new E(),getElementById:id=>id==='selector'?{style:{display:'none'}}:elements.get(id)};
const window={innerWidth:420,innerHeight:800,visualViewport:{height:800,offsetTop:0,addEventListener:()=>{}},
 addEventListener:()=>{},nsMayExamine:()=>true,csSetDiagnosticImpression:v=>{sim.diagnosis=v;return true}};
const context={window,document,performance:{now:()=>now},sim,C,CASES:[
 {id:'PERI-SEC-001',dx:['peritonitis secundaria','peritonitis por perforación']},
 {id:'PERI-PBE-001',dx:['peritonitis bacteriana espontánea']},
 {id:'PERI-TER-001',dx:['peritonitis terciaria']},
 {id:'APP-001',dx:['apendicitis aguda']}
], patient:{x:0,y:0},worldToScreen:()=>[200,400],updateSimulation:()=>{},
 requestAnimationFrame:cb=>cb()};
vm.runInNewContext(source,context,{timeout:4000});
window.csDx487Refresh();
const badge=elements.get('csDxBadge487');
assert(badge,'visible patient badge exists');
assert.match(badge.textContent,/Impresión diagnóstica/);
assert(badge.classList.contains('csDxGlow487'),'empty impression glows');
badge.onclick({stopPropagation(){}});
const dialog=elements.get('csDxDialog487');
const input=elements.get('csDxInput487'),options=elements.get('csDxSuggestions487');
assert(dialog.classList.contains('open'));
input.value='peritonitis';input.oninput();
assert(options.children.length>=3,'global subtype suggestions display as user types');
assert(options.children.some(x=>/secundaria/i.test(x.textContent)));
assert(options.children.some(x=>/terciaria/i.test(x.textContent)));
assert(options.children.some(x=>/perforaci[oó]n/i.test(x.textContent)));
assert.equal(elements.get('csDxInfo487').dataset.level,'broad');
assert(options.children.some(x=>/espont[aá]nea/i.test(x.textContent)),'do not leak active case by filtering to it');
const secondary=options.children.find(x=>x.textContent==='Peritonitis secundaria');
secondary.onclick();assert.equal(input.value,'Peritonitis secundaria');
dialog.querySelector('.save').onclick();
assert.equal(context.sim.diagnosis,'Peritonitis secundaria','saved into existing field');
assert(!dialog.classList.contains('open'),'editor closes on save');
assert(!document.body.classList.contains('keyboardOpen'),'keyboard class cleaned');
assert(!badge.classList.contains('csDxGlow487'),'registered diagnosis stops glowing');
assert.match(badge.textContent,/Peritonitis secundaria/);
// An unrelated patient receives its own empty impression. A delayed editor
// must never save into a patient loaded after the dialogue was opened.
const second=specimen();context.sim=second;context.C=context.CASES[1];window.csDx487Refresh();
assert.match(badge.textContent,/Impresión diagnóstica/);
badge.onclick({stopPropagation(){}});input.value='peritonitis secundaria';
const third=specimen();context.sim=third;window.csDx487Refresh();
assert(!dialog.classList.contains('open'),'changing active patient invalidates open editor');
assert.equal(third.diagnosis,'');
window.nsMayExamine=()=>false;badge.onclick({stopPropagation(){}});
assert.equal(input.readOnly,true,'spectator sees diagnosis but cannot edit');
assert.equal(dialog.querySelector('.save').disabled,true);
dialog.querySelector('.close').onclick();window.nsMayExamine=()=>true;
context.sim.caseEnded=true;window.csDx487Refresh();
assert.equal(badge.style.display,'none','case closure removes bedside badge');
assert.throws(()=>apply487(html),/diagnostic autocomplete installed twice/,
 'double-injecting generated HTML is rejected');
console.log('DIAGNOSTIC UI BOT PASS',JSON.stringify({
 globalAutocomplete:true,perPatientEditor:true,keyboardCleanup:true,readOnlySpectator:true,
 finishedPatientHidden:true,sourceCompiled:true,realDevice:false
}));
