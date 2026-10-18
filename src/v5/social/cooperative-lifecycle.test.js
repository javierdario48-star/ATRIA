import test from 'node:test';
import assert from 'node:assert/strict';
import {createCooperativeLifecycle,outcomeId} from './cooperative-lifecycle.js';
test('late invitation acceptance or guest state cannot replace an explicitly started local guard',()=>{
 const flow=createCooperativeLifecycle(),invitation=flow.begin('host');
 assert(flow.mayEnter('host',{phase:'lobby',hasSession:false}));
 flow.cancel();
 assert(!flow.current(invitation));assert(!flow.mayEnter('host',{phase:'lobby',hasSession:false}));
 assert(!flow.mayEnter('guest',{phase:'guard',hasSession:true,recovering:true}));
 const join=flow.begin('guest');flow.cancel();assert(!flow.current(join));
 assert(flow.mayEnter('guest',{phase:'lobby',hasSession:false,recovering:true}),'reload can resume only from the empty lobby');
});
test('host departure waits for every current colleague to acknowledge the exact terminal receipt',()=>{
 const flow=createCooperativeLifecycle(),members=[{userId:'host'},{userId:'guest'},{userId:'third'}];flow.begin('host');flow.bind('room');
 const terminal={uid:'P',closure:{closed:true,eventId:'closure-P'}};
 assert(!flow.delivered(terminal,'host',members));
 assert(!flow.confirm('foreign','closure-P','other',terminal,members));
 assert(!flow.confirm('room','wrong','guest',terminal,members));
 assert(flow.confirm('room','closure-P','guest',terminal,members));assert(!flow.delivered(terminal,'host',members));
 assert(flow.confirm('room','closure-P','third',terminal,members));assert(flow.delivered(terminal,'host',members));
 assert.equal(outcomeId({uid:'P',patientDied:true,survival:{atRealSecond:302.25}}),'death:P:302.25');
 flow.cancel();flow.begin('host');flow.bind('next');assert(!flow.delivered(terminal,'host',members),'old acknowledgements never authorize a later room');
});
