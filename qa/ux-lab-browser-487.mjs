// Screenshot-based A/B QA on the real full-game Chromium runtime.
// Synthetic Android viewport/IME state; physical Android/Gboard remains a manual gate.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {clinicalBrowserHarness487} from './clinical-browser-harness-487.mjs';

const out='qa/ux-lab-results';
await fs.mkdir(out,{recursive:true});
const h=await clinicalBrowserHarness487(2);
const report={screenshots:[],variants:[],device:'Pixel 5 emulation',physicalKeyboard:false};
try {
  await h.startGuard('coop','APP-001');
  await h.select(0);
  const page=h.clients[1].page;
  await page.waitForSelector('#chatDock .chatGlass',{state:'visible'});
  await h.send(0,'Enfermera, necesito el monitor');
  await page.waitForFunction(()=>document.querySelector('#chatDock .chatRecent')?.textContent?.includes('Enfermera'),{},{timeout:15000});

  for(const variant of ['immersive','tactical']){
    await page.evaluate(()=>{document.activeElement?.blur?.();document.body.classList.remove('keyboardOpen')});
    await page.addStyleTag({path:'src/ui/atria-ux-lab.css'});
    await page.evaluate(v=>document.documentElement.setAttribute('data-atria-ui',v),variant);
    await page.waitForTimeout(160);
    const initial=await page.evaluate(()=>{
      const i=document.querySelector('#dieInput'),dock=document.querySelector('#chatDock'),
        chat=document.querySelector('#chatDock .chatRecent');
      const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
      return {font:parseFloat(getComputedStyle(i).fontSize),composer:rect(i),
        dock:rect(dock),history:rect(chat),hud:rect(document.querySelector('#nsPlayerHeader')),
        historyDisplay:getComputedStyle(chat).display,
        overlays:['#nsWardNotice','.csChallengeHud','#atriaGuardScore487'].map(sel=>{
          const el=document.querySelector(sel);
          const style=el?getComputedStyle(el):null;
          const visible=!!el&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'&&(!el.hidden);
          return {sel,visible,rect:el?rect(el):null};
        })};
    });
    assert(initial.font>=16,variant+': input below 16px and could trigger mobile zoom');
    assert(initial.composer.w>=75&&initial.composer.h>=38,variant+': input too small');
    assert(initial.dock.h<=360,variant+': chat dock obscures too much of the map');
    // Visual overlap must be checked, not just CSS declarations or screenshots.
    const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    const visible=initial.overlays.filter(x=>x.visible);
    for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
      assert(!intersects(visible[i].rect,visible[j].rect),
        variant+': HUD overlays collide '+visible[i].sel+' and '+visible[j].sel);
    }
    const score=initial.overlays.find(x=>x.sel==='#atriaGuardScore487');
    assert.equal(score.visible,variant==='tactical',variant+': expected scoreboard visibility differs');
    const guardPath=out+'/'+variant+'-guard.png';
    await page.screenshot({path:guardPath,fullPage:true});report.screenshots.push(guardPath);
    await page.locator('#dieInput').focus();
    await page.waitForFunction(()=>document.body.classList.contains('keyboardOpen'));
    const keyboard=await page.evaluate(()=>{
      const dock=document.querySelector('#chatDock'),history=document.querySelector('#chatDock .chatRecent'),
       input=document.querySelector('#dieInput');
      const r=dock.getBoundingClientRect();
      const glass=dock.querySelector('.chatGlass');
      return {dockHeight:r.height,historyDisplay:getComputedStyle(history).display,
        dockPointerEvents:getComputedStyle(dock).pointerEvents,
        composerPointerEvents:getComputedStyle(glass).pointerEvents,
        composerHeight:glass.getBoundingClientRect().height,
        auxiliary:['#nsWardNotice','.csChallengeHud','#atriaGuardScore487'].map(sel=>{
          const el=document.querySelector(sel);
          return {sel,display:el?getComputedStyle(el).display:'absent'};
        }),
        font:parseFloat(getComputedStyle(input).fontSize),
        fieldFocused:document.activeElement===input,
        fieldHeight:input.getBoundingClientRect().height};
    });
    assert.equal(keyboard.historyDisplay,'none',variant+': expanded transcript obscures keyboard');
    for(const overlay of keyboard.auxiliary) {
      assert(['none','absent'].includes(overlay.display),
        variant+': clinical notification overlays keyboard composer: '+overlay.sel);
    }
    // Native IME positioning owns the dock box; it can be tall as a geometry
    // fallback. Only its small composer may intercept touches or paint over map.
    assert(keyboard.composerHeight<=72,variant+': visible keyboard composer is too tall');
    assert.equal(keyboard.dockPointerEvents,'none',variant+': transparent IME space traps map taps');
    assert.equal(keyboard.composerPointerEvents,'auto',variant+': cannot tap/send with keyboard');
    assert(keyboard.font>=16&&keyboard.fieldHeight>=38&&keyboard.fieldFocused,variant+': keyboard composer unusable');
    const keyboardPath=out+'/'+variant+'-keyboard-synthetic.png';
    await page.screenshot({path:keyboardPath,fullPage:true});report.screenshots.push(keyboardPath);
    report.variants.push({variant,initial,keyboard});
    console.log('ATRIA_UX_BROWSER_PASS',JSON.stringify({variant,initial,keyboard}));
  }
  assert.equal(h.errors.length,0,'unexpected browser page errors: '+JSON.stringify(h.errors));
  await fs.writeFile(out+'/summary.json',JSON.stringify(report,null,2));
} finally {
  await h.close();
}
