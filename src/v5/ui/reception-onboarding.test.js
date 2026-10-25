import test from 'node:test';
import assert from 'node:assert/strict';
import {needsReceptionOnboarding,createReceptionOnboarding} from './reception-onboarding.js';
const base={phase:'guard',mode:'competitive',selfId:'doctor',
 patients:[{uid:'a',ownerId:null,closed:false},{uid:'b',ownerId:null,closed:false}]};
test('first patient onboarding is visible only until first competitive bedside selection',()=>{
 assert.equal(needsReceptionOnboarding(base),true);
 assert.equal(needsReceptionOnboarding({...base,selecting:true}),false);
 assert.equal(needsReceptionOnboarding({...base,phase:'lobby'}),false);
 assert.equal(needsReceptionOnboarding({...base,mode:'coop'}),false);
 assert.equal(needsReceptionOnboarding({...base,ended:true}),false);
 assert.equal(needsReceptionOnboarding({...base,patients:base.patients.map(p=>({...p,ownerId:'rival'}))}),false);
 assert.equal(needsReceptionOnboarding({...base,patients:[{uid:'a',ownerId:'doctor'},base.patients[1]]}),false);
 assert.equal(needsReceptionOnboarding({...base,selfId:null}),false);
});
test('onboarding only updates button highlighting and an inert guide',()=>{
 const classes=new Set(),button={
  classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c)},
  getBoundingClientRect:()=>({left:140,bottom:64})
 },guide={hidden:true,style:{}},window={innerWidth:380};
 const view=createReceptionOnboarding({button,guide,window});
 assert.equal(view.update(base),true);
 assert(classes.has('reception-highlight'));
 assert.equal(guide.hidden,false);
 assert.match(guide.style.left,/px$/);
 assert.match(guide.style.top,/px$/);
 assert.equal(view.update({...base,selecting:true}),false);
 assert(!classes.has('reception-highlight'));
 assert.equal(guide.hidden,true);
});
