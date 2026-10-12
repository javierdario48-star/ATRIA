/* Browser QA: P31 source pixels + touch editor + binary save/import, not visual approval */
'use strict';
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const output=path.resolve(__dirname,'../editor_bundle');
 const html='file://'+path.join(output,'ATRIA_Editor_Offline.html');
 const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}) ,args:['--no-sandbox','--allow-file-access-from-files']});
 try{
   for(const size of [{width:1200,height:800,touch:false},{width:390,height:760,touch:true}]){
    const context=await browser.newContext({viewport:{width:size.width,height:size.height},isMobile:size.touch,hasTouch:size.touch,acceptDownloads:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(html,{waitUntil:'load'});
    await page.waitForFunction(()=>window.ATRIA_OBJECT_EDITOR_READY===true,null,{timeout:30000});
    const prior=await page.evaluate(()=>{
       const t=window.ATRIA_OBJECT_EDITOR_TEST,qa=t.assert(),o=t.get().objects.get('P31');
       const src=[...o.rgb.slice(0,4)];
       const before=t.pack(),hash=JSON.stringify(before);
       o.alpha[5]=129;o.occlusion[5]=55;o.collision.rearLift+=4;o.depth+=5;
       const changed=t.pack();t.restorePack(before);
       if(JSON.stringify(t.pack())!==hash)throw new Error('roundtrip does not restore exact arrays');
       t.restorePack(changed);
       if(o.alpha[5]!==129||o.occlusion[5]!==55||o.collision.rearLift!==10||o.depth!==1000)throw Error('changed roundtrip mismatch');
       t.restorePack(before);
       return {qa,sourceRGBA:src};
    });
    assert.equal(prior.qa.ok,true);
    await page.locator('#objectEditBtn').click({force:true});
    await page.locator('[data-mode="alpha"]').click({force:true});
    assert.equal(await page.locator('#oePanel').isVisible(),true);
    if(size.touch){
      const p=await page.locator('#oePreview').boundingBox();
      await page.touchscreen.tap(p.x+p.width*.5,p.y+p.height*.5);
    }else{
      const p=await page.locator('#oePreview').boundingBox();
      await page.mouse.click(p.x+p.width*.5,p.y+p.height*.5);
    }
    await page.locator('[data-mode="collision"]').click({force:true});
    const input=page.locator('#oeParams input').first();
    await input.fill('18');
    await input.dispatchEvent('change');
    const phys=await page.evaluate(()=>window.ATRIA_OBJECT_EDITOR_TEST.get().objects.get('P31').collision.rx);
    assert.equal(phys,18);
    await page.locator('[data-mode="depth"]').click({force:true});
    const y=page.locator('#oeParams input').first();await y.fill('1003');await y.dispatchEvent('change');
    assert.equal(await page.evaluate(()=>window.ATRIA_OBJECT_EDITOR_TEST.get().objects.get('P31').depth),1003);
    const [jsonDL]=await Promise.all([page.waitForEvent('download'),page.locator('#oeSave').click({force:true})]);
    const jsonPath=path.join(output,size.touch?'android_export.json':'desktop_export.json');await jsonDL.saveAs(jsonPath);
    const exported=JSON.parse(fs.readFileSync(jsonPath,'utf8'));
    assert.equal(exported.schema,'atria-objects-editor-v1');
    assert.equal(exported.objects.find(o=>o.id==='P31').collision.rx,18);
    await page.evaluate(()=>{const o=window.ATRIA_OBJECT_EDITOR_TEST.get().objects.get('P31');o.collision.rx=3;o.depth=987});
    await page.locator('#oeFile').setInputFiles({name:'import.json',mimeType:'application/json',buffer:fs.readFileSync(jsonPath)});
    await page.waitForFunction(()=>window.ATRIA_OBJECT_EDITOR_TEST.get().objects.get('P31').collision.rx===18,null,{timeout:15000});
    assert.equal(await page.evaluate(()=>window.ATRIA_OBJECT_EDITOR_TEST.get().objects.get('P31').depth),1003);
    const [zipDL]=await Promise.all([page.waitForEvent('download'),page.locator('#oeZip').click({force:true})]);
    await zipDL.saveAs(path.join(output,size.touch?'android_masks.zip':'desktop_masks.zip'));
    await page.locator('#oeTrial').click({force:true});
    assert.equal(await page.locator('#oePanel').isVisible(),false);
    await page.screenshot({path:path.join(output,size.touch?'android_editor_smoke.png':'desktop_editor_smoke.png')});
    if(errors.length)throw Error('Browser JS errors: '+errors.join(' | '));
    console.log('PASS',size.width+'x'+size.height,JSON.stringify(prior.qa),'JSON roundtrip, touch/mouse, collider, depth, ZIP');
    await context.close();
   }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exit(1)});
