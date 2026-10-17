// C12.h — exact effective generated ATRIA 4.8.7, NOT the V5 page.
// Two independent Chromium clients and original in-game buttons. Exploratory:
// all visible control surfaces are inventoried, but a rendered button is NOT
// claimed functionally validated unless a concrete interaction is executed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {clinicalBrowserHarness487} from '../clinical-browser-harness-487.mjs';
const h=await clinicalBrowserHarness487(2),evidence={schema:'atria.487.original-ui-surface.v1',
 cases:[],clients:2,realHTTP:true,androidEmulated:true,physicalAndroid:false,
 actions:[],errors:[],limitations:[]};
const discover=async(page,state)=>({
 state,buttons:await page.evaluate(()=>[...document.querySelectorAll('button,[role="button"],input,select,a[href],textarea')].map(el=>{
  const rect=el.getBoundingClientRect();
  return {tag:el.tagName.toLowerCase(),id:el.id||null,
   action:el.dataset.action||null,role:el.getAttribute('role'),type:el.type||null,
   label:(el.getAttribute('aria-label')||el.innerText||el.placeholder||el.value||'').trim().replace(/\s+/g,' ').slice(0,90),
   visible:rect.width>0&&rect.height>0&&getComputedStyle(el).visibility!=='hidden',
   disabled:!!el.disabled};
 }).filter(x=>x.visible)),
});
const record=(action,detail={})=>evidence.actions.push({action,...detail});
try{
 const host=h.clients[0].page,visitor=h.clients[1].page;
 evidence.cases.push(await discover(host,'lobby-desktop'));
 evidence.cases.push(await discover(visitor,'lobby-pixel5'));
 record('old start screen enter buttons',{proof:'clinicalBrowserHarness487 executed original #nsEnter in both independent browser contexts'});
 await host.locator('#dieInput').fill('Exploración de interfaz antigua, borrador');
 assert.equal(await host.locator('#dieInput').inputValue(),'Exploración de interfaz antigua, borrador');
 record('old lobby editable chat field',{pass:true});
 await h.send(0,'Prueba de chat por botón en el lobby',{tap:true});
 await host.waitForFunction(()=>nsLobby.messages.some(m=>m.text==='Prueba de chat por botón en el lobby'),{},{timeout:12000});
 record('old lobby chat send button',{pass:true});
 await h.startGuard('coop','APP-001');
 evidence.cases.push(await discover(host,'ward-coop-before-assignment'));
 evidence.cases.push(await discover(visitor,'ward-coop-visitor-mobile'));
 record('original guard mode, organ and case configuration plus Enter guard button',{pass:true});
 await h.select(0);
 evidence.cases.push(await discover(host,'ward-coop-selected-patient'));
 record('old patient bedside assignment',{pass:true});
 // The local nursing interface is the SAME generated one used for gameplay.
 await h.send(0,'Enfermera, dos vías, monitor y Ringer 500 ml',{tap:true});
 await host.waitForFunction(()=>sim.venousAccessCount>=2&&sim.monitorConnected&&
  sim.administrationLog.some(x=>x.id==='fluid'),{},{timeout:35000});
 const snap=(await h.snapshot())[0];
 assert.equal(snap.administrations.filter(x=>x.id==='fluid').length,1);
 record('old compound nurse request via actual UI button',{pass:true,
  iv:snap.iv,monitor:snap.monitor,fluids:snap.administrations.filter(x=>x.id==='fluid').length});
 evidence.cases.push(await discover(host,'ward-after-confirmed-nursing'));
 // Negative question/negation must not dispense any further fluid.
 const count=snap.administrations.filter(x=>x.id==='fluid').length;
 await h.send(0,'Enfermera, no pases Ringer 500 ml',{tap:true});
 await host.waitForTimeout(1200);
 const after=(await h.snapshot())[0];
 const noMistakenDose=after.administrations.filter(x=>x.id==='fluid').length===count;
 record('negative nurse sentence',{pass:noMistakenDose});
 // Explore the ORIGINAL visible native click targets without manufacturing
 // clinical state. Record missing/blocked buttons explicitly, not as passes.
 for(const [id,label] of [
  ['csActionsBtn','clinical-actions'],['csDxBadge487','diagnostic-impression'],
  ['nsWardBtn','ward-reception'],['nsMenuBtn','game-menu'],
  ['chatLogBtn','chat-history'],['nsPlayerProfile','player-profile']
 ]){
  const locator=host.locator('#'+id);
  if(!(await locator.count())){record('legacy-button:'+label,{status:'not-present'});continue;}
  try{
   await locator.click({timeout:2500});
   await host.waitForTimeout(180);
   evidence.cases.push(await discover(host,'expanded-'+label));
   record('legacy-button:'+label,{pass:true,
    visibleAfter:evidence.cases.at(-1).buttons.length});
   await host.keyboard.press('Escape');
  }catch(e){
   record('legacy-button:'+label,{pass:false,
    note:String(e.message||e).slice(0,180)});
   try{await host.keyboard.press('Escape');}catch{}
  }
 }
 evidence.errors.push(...h.errors);
 const all=evidence.cases.flatMap(s=>s.buttons);
 const unique=new Map(all.map(x=>[(x.id||x.action||x.label)+'|'+x.tag,x]));
 evidence.surface={states:evidence.cases.length,uniqueVisibleControls:unique.size,
  labels:[...unique.values()].map(({id,action,label,tag})=>({id,action,label,tag})),
  coveredActions:evidence.actions.filter(a=>a.pass).map(a=>a.action)};
 evidence.limitations=[
  'This browser probe enumerates visible buttons across lobby/ward states and exercises the original UI buttons; it does not click every menu item or every case-specific screen.',
  'Original V4 coop multiplayer still requires independent protocol validation; successful actions here do not imply bug-free multiplayer.',
  '13-case medicine progression, legacy native closing, outcome panel, death and toxicity are covered by separate executable fixtures with their documented limitations.',
  'No original full-case finalizer is artificially called, no UI status or physiologic value is set to pass this audit.'
 ];
 await fs.mkdir('qa/v5-audit-results',{recursive:true});
 await fs.writeFile('qa/v5-audit-results/legacy-browser-control-census.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('ATRIA_487_LIVE_BROWSER_SURFACE='+JSON.stringify({states:evidence.surface.states,
  visibleControls:evidence.surface.uniqueVisibleControls,
  actionResults:evidence.actions,errors:evidence.errors,labels:evidence.surface.labels.slice(0,55)}));
 assert.deepEqual(h.errors,[],'legacy generated browser emitted an unhandled JS error');
 assert(noMistakenDose,'the existing old nurse negation must not administer a second 500ml fluid order');
}finally{await h.close();}
