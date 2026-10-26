import test from 'node:test';
import assert from 'node:assert/strict';
import {uiSoundForTarget} from './ui-sound-policy.js';
const target=(id,dataset={})=>({closest:sel=>sel==='button'?{id,dataset,disabled:false,closest:()=>null}:null});
test('one sound policy assigns distinct effects and never plays for unrelated text',()=>{
 assert.equal(uiSoundForTarget(target('avatarNextColor')),'uiChange');
 assert.equal(uiSoundForTarget(target('',{avatarSex:'female'})),'uiChange');
 assert.equal(uiSoundForTarget(target('guardButton')),'uiInvite');
 assert.equal(uiSoundForTarget(target('coopInviteAccept')),'uiAccept');
 assert.equal(uiSoundForTarget(target('modalClose')),'uiBack');
 assert.equal(uiSoundForTarget(target('',{mode:'solo'})),'uiTap');
 assert.equal(uiSoundForTarget(target('audioButton')),null);
 assert.equal(uiSoundForTarget({closest:()=>null}),null);
});
