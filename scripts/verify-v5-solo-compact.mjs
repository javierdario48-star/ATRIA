import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const {chromium,devices}=createRequire(import.meta.url)(process.env.ATRIA_PLAYWRIGHT_MODULE);
const url=pathToFileURL(process.cwd()+'/out-solo-html/ATRIA-5-Solitario.html').href;
const html=await fs.readFile('out-solo-html/ATRIA-5-Solitario.html','utf8');
assert.match(html,/<img class="welcome-art" src="data:image\/webp;base64,/,'welcome image must be embedded for Android downloads');
assert(!html.includes('src="./src/v5/content/assets/welcome-doctors.webp"'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/google-chrome',headless:true});
try{for(const [name,options] of [['desktop',{viewport:{width:1024,height:768}}],['android-emulated',devices['Pixel 5']]]){
 const context=await browser.newContext(options),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 await page.waitForFunction(()=>['ready','failed'].includes(document.body.dataset.boot),null,{timeout:90000});
 assert.equal(await page.evaluate(()=>document.body.dataset.boot),'ready',name+' boot');
 const offline=await page.evaluate(async()=>{
  const session=await fetch('/api/account/session'),data=await session.json();
  const clinical=await fetch('/api/clinical');
  return {sessionStatus:session.status,enabled:data.enabled,clinicalStatus:clinical.status};
 });
 assert.deepEqual(offline,{sessionStatus:404,enabled:false,clinicalStatus:503},name+' offline account API routing');
 await page.locator('#enterButton').click();await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
 await page.locator('#guardButton').click();await page.locator('[data-mode="solo"]').click();
 await page.locator('input[name="guardScope"][value="specific"]').check();
 await page.locator('#caseChoice').selectOption('CIRR-001');await page.locator('[data-action="start-guard"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
 assert.equal(await page.evaluate(()=>atriaV5.snapshot().patients.length),1);
 await page.locator('#guardButton').click();await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
 assert.deepEqual(errors,[],name+' runtime errors');console.log('SOLO HTML PASS',name);await context.close();
}}finally{await browser.close();}
