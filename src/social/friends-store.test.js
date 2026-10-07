import assert from'node:assert/strict';import{addFriend,presenceFor,socialSession,saveSocial,loadSocial}from'./friends-store.js';
let s={friends:[]};s=addFriend(s,'ana');s=addFriend(s,'ana');s=addFriend(s,'bob');assert.deepEqual(s.friends,['ana','bob']);assert.deepEqual(presenceFor(s,['bob']),[{id:'ana',online:false},{id:'bob',online:true}]);assert.equal(socialSession({nick:'Dario'}).requiresActivation,false);
const mem={v:null,setItem(k,v){this.v=v},getItem(){return this.v}};saveSocial(s,mem);assert.deepEqual(loadSocial(mem).friends,['ana','bob']);console.log('friends persistence OK');
