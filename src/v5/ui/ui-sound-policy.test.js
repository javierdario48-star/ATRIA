import test from 'node:test';
import assert from 'node:assert/strict';
import {uiSoundForTarget,uiSoundForChange} from './ui-sound-policy.js';
const target=(id,dataset={})=>({closest:sel=>sel==='button'?{id,dataset,disabled:false,closest:()=>null}:null});
test('one sound policy assigns distinct effects and never plays for unrelated text',()=>{
 assert.equal(uiSoundForTarget(target('avatarNextColor')),'uiChange');
 assert.equal(uiSoundForTarget(target('',{avatarSex:'female'})),'uiChange');
 assert.equal(uiSoundForTarget(target('guardButton')),'uiInvite');
 assert.equal(uiSoundForTarget(target('coopInviteAccept')),'uiAccept');
 assert.equal(uiSoundForTarget(target('modalClose')),'uiBack');
 assert.equal(uiSoundForTarget(target('',{mode:'solo'})),'uiTap');
 assert.equal(uiSoundForTarget(target('audioButton')),'uiTap');
 assert.equal(uiSoundForTarget(target('musicToggleButton')),'uiTap');
 assert.equal(uiSoundForTarget(target('welcomeContinue')),'uiTap');
 assert.equal(uiSoundForTarget({closest:()=>null}),null);
});
test('native wardrobe and settings changes click once while sliders and text typing remain quiet',()=>{
 const native=(tagName,type,disabled=false)=>({tagName,type,disabled});
 assert.equal(uiSoundForChange(native('SELECT')),'uiChange');
 assert.equal(uiSoundForChange(native('INPUT','checkbox')),'uiChange');
 assert.equal(uiSoundForChange(native('INPUT','radio')),'uiChange');
 assert.equal(uiSoundForChange(native('INPUT','text')),null);
 assert.equal(uiSoundForChange(native('INPUT','range')),null);
 assert.equal(uiSoundForChange(native('SELECT',null,true)),null);
});
