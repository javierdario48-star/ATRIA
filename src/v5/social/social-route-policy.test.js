import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isSignalingEndpoint} from './social-route-policy.js';

test('deployment routes global lobby presence before its generic social catch-all',()=>{
 const cfg=JSON.parse(fs.readFileSync(new URL('../../../vercel.json',import.meta.url),'utf8'));
 const rules=cfg.rewrites||[],signal=rules.findIndex(r=>r.source==='/api/lobby-sync');
 const fallback=rules.findIndex(r=>r.source==='/api/:path*');
 assert(signal>=0&&fallback>signal);
 assert.equal(rules[signal].destination,'/api/lobby-sync');
 assert(rules.findIndex(r=>r.source==='/api/clinical')<fallback);
});
test('direct signaling function and catch-all rewritten request resolve identically',()=>{
 assert.equal(isSignalingEndpoint({path:'/api/lobby-sync'}),true);
 assert.equal(isSignalingEndpoint({path:'/api/social',route:'lobby-sync'}),true);
 assert.equal(isSignalingEndpoint({path:'/api/social',route:'/api/lobby-sync'}),true);
 for(const path of ['/api/lobby','/api/me','/api/clinical','/api/health','/api/rooms'])
  assert.equal(isSignalingEndpoint({path}),false);
 assert.equal(isSignalingEndpoint({path:'/api/social',route:'lobby'}),false);
 assert.equal(isSignalingEndpoint({path:'/api/social',route:'lobby-sync/not-valid'}),false);
});
