import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {apply487} from '../integration/apply-487.js';
const original=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'),html=apply487(original),MAP=JSON.parse(original.match(/const MAP=(.+);\n/)[1]);
const [W,H]=MAP.source_size_px,COLS=MAP.grid.columns,ROWS=MAP.grid.rows,TW=W/COLS,TH=H/ROWS;
const ctx={window:{},performance:{now:()=>0},Map,Math,Number,Date,MAP,W,H,COLS,ROWS,TW,TH,states:MAP.state_matrix.map(r=>r.slice()),player:{r:10.5},doorOpen:new Map(MAP.doors.map(d=>[d.id,MAP.door_state?.[d.id]??!!d.initial_open])),doorTileToId:new Map()};
MAP.doors.forEach(d=>d.tiles.forEach(t=>ctx.doorTileToId.set(t[0]+','+t[1],d.id)));vm.createContext(ctx);
vm.runInContext(original.slice(original.indexOf('function tileAt(x,y)'),original.indexOf('function viewCenterY()')),ctx);
vm.runInContext(html.match(/<script id="atria-remote-motion-487">([\s\S]*?)<\/script>/)[1],ctx);
// Actual source snapshots from the four independent HTTP clients under jitter.
// A coarse 4px collision sweep misses the small occupied interval at this bend.
const a={x:429.51227282042555,y:536.8779807940442},b={x:400.07441001105485,y:588.6499674851341};
assert(!ctx.circleBlocked(a.x,a.y,10.5)&&!ctx.circleBlocked(b.x,b.y,10.5));
assert.equal(ctx.csMotionSegment487(a.x,a.y,b.x,b.y),false,'detect the native occupied corner throughout the entire segment');
const p=ctx.csMotionReceive487(null,{...a,motionSession:'A',seq:1,motionAt:0},'http',0,260);
ctx.csMotionReceive487(p,{...b,motionSession:'A',seq:2,motionAt:300,moving:false},'http',300,260);
for(let t=316;t<=1500;t+=16)ctx.window.csLobbyMotionSample487({_motion:p},t);
assert(Math.hypot(p.x-b.x,p.y-b.y)<.001,'the unchanged native astar route reaches the actual stopped source pose');
assert(!ctx.circleBlocked(p.x,p.y,10.5));console.log('recorded four-client native-map collision corner reaches the real source endpoint');
// The native controller resolves this off-center adjacent-tile turn by its
// existing axis collision fallback. A detour must first center the start tile.
const c={x:336,y:173.3867924528302},d={x:368,y:159.39622641509433};
assert(!ctx.circleBlocked(c.x,c.y,10.5)&&!ctx.circleBlocked(d.x,d.y,10.5));
const turn=ctx.csMotionReceive487(null,{...c,motionSession:'B',seq:1,motionAt:0},'http',0,260);
ctx.csMotionReceive487(turn,{...d,motionSession:'B',seq:2,motionAt:300,moving:false},'http',300,260);
for(let t=316;t<=2500;t+=16)ctx.window.csLobbyMotionSample487({_motion:turn},t);
assert(Math.hypot(turn.x-d.x,turn.y-d.y)<.001,'off-center adjacent-tile turn preserves a collision-safe detour');
