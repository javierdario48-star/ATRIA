import test from 'node:test';
import assert from 'node:assert/strict';

// A missing module is an assertion failure during the first RED run.
const {createNavigation} = await import('./navigation.js').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
const makeMap = (states, tileWidth=32, tileHeight=32, extra={}) => ({
  source_size_px: [states[0].length*tileWidth, states.length*tileHeight],
  grid: {columns: states[0].length, rows: states.length},
  state_matrix: states,
  doors: [],
  door_state: {},
  ...extra,
});
const openMap = (columns=8, rows=8) => makeMap(
  Array.from({length:rows}, () => Array(columns).fill(0)),
);
const navigation = map => {
  assert.equal(typeof createNavigation, 'function', 'createNavigation must be exported');
  return createNavigation(map);
};
const actorAt = (nav, c, r, extra={}) => ({
  ...nav.center(c,r), r:10.5, speed:205, path:[], pathIndex:0,
  target:null, dir:'S', moving:false, walkPhase:0, lastSide:1, ...extra,
});
function follow(nav, actor, limit=1200) {
  for (let frame=0; frame<limit; frame++) {
    const completed=nav.move(actor,1/60);
    assert.equal(nav.circleBlocked(actor.x,actor.y,actor.r),false,
      'every displayed position must clear the collision radius');
    if (completed) return frame+1;
  }
  assert.fail('actor stalled before reaching the destination');
}

test('world coordinates preserve rectangular map dimensions and negative bounds', () => {
  const nav=navigation(makeMap([[0,0,0],[0,0,0]],32,29));
  assert.deepEqual([nav.width,nav.height,nav.tileWidth,nav.tileHeight],[96,58,32,29]);
  assert.deepEqual(nav.tileAt(63.9,57.9),[1,1]);
  assert.deepEqual(nav.tileAt(-.1,-.1),[-1,-1]);
  assert.deepEqual(nav.center(1,1),{x:48,y:43.5});
  for (const tile of [[-1,0],[0,-1],[3,0],[0,2],[.5,0],[NaN,0]])
    assert.equal(nav.passable(...tile),false);
});

test('door state controls routes without changing the authored map', () => {
  const map=makeMap([[1,1,1,1,1],[1,0,2,0,1],[1,1,1,1,1]],32,32,{
    doors:[{id:'ward',tiles:[[2,1]],initial_open:true}],door_state:{ward:false},
  });
  const before=JSON.stringify(map),nav=navigation(map);
  assert.equal(nav.passable(2,1),false);
  assert.deepEqual(nav.route([1,1],[3,1]),[]);
  assert.equal(nav.setDoor('ward',true),true);
  assert.equal(nav.passable(2,1),true);
  assert.deepEqual(nav.route([1,1],[3,1]),[[1,1],[2,1],[3,1]]);
  assert.equal(nav.setDoor('missing',true),false);
  assert.equal(JSON.stringify(map),before);
});

test('walls and furniture block tiles while unassigned door tiles retain native semantics', () => {
  const nav=navigation(makeMap([[0,1,3,2],[0,0,0,0],[0,0,0,0]]));
  assert.equal(nav.passable(0,0),true);
  assert.equal(nav.passable(1,0),false);
  assert.equal(nav.passable(2,0),false);
  assert.equal(nav.passable(3,0),true);
});

test('nearest finds a collision-safe tile inside its bounded search', () => {
  const nav=navigation(makeMap([[1,1,1],[1,1,1],[1,1,0]]));
  assert.deepEqual(nav.nearest(1,1),[2,2]);
  assert.equal(nav.nearest(0,0,1),null);
  assert.deepEqual(nav.nearest(-1,-1,3),[2,2]);
  assert.equal(nav.nearest(NaN,0),null);
});

test('eight-way routing uses diagonals but cannot cut a blocked corner', () => {
  const nav=navigation(openMap());
  assert.deepEqual(nav.route([1,1],[3,3]),[[1,1],[2,2],[3,3]]);
  const trapped=makeMap([[0,1,0],[1,0,1],[0,1,0]]);
  assert.deepEqual(navigation(trapped).route([1,1],[2,2]),[]);
  assert.deepEqual(nav.route([-1,1],[3,3]),[]);
  assert.deepEqual(nav.route([1,1],[8,3]),[]);
});

test('circle collision includes furniture corners and the map boundary', () => {
  const map=openMap();map.state_matrix[2][2]=3;
  const nav=navigation(map);
  assert.equal(nav.circleBlocked(60,58,7.3),true);
  assert.equal(nav.circleBlocked(48,48,10.5),false);
  assert.equal(nav.circleBlocked(10.4,48,10.5),true);
  assert.equal(nav.circleBlocked(48,-1,10.5),true);
  assert.equal(nav.circleBlocked(NaN,48,10.5),true);
});

test('routing avoids centers too close to furniture for the player radius', () => {
  const states=Array.from({length:8},()=>Array(8).fill(0));
  for (let c=2;c<=5;c++) states[3][c]=3;
  const nav=navigation(makeMap(states,32,16)),actor=actorAt(nav,1,2);
  assert.equal(nav.passable(3,2),true);
  assert.equal(nav.circleBlocked(...Object.values(nav.center(3,2)),actor.r),true);
  const goal=nav.center(6,2);
  assert.equal(nav.target(actor,goal.x,goal.y),true);
  assert(actor.path.some(([,r])=>r===1),'route must leave the unsafe furniture edge');
  follow(nav,actor);
  assert.deepEqual({x:actor.x,y:actor.y},goal);
});

test('the complete route finishes at 60 Hz with gait driven by actual travel', () => {
  const map=openMap();
  for (let r=2;r<=4;r++) for (let c=2;c<=4;c++) map.state_matrix[r][c]=3;
  const nav=navigation(map),actor=actorAt(nav,1,1),goal=nav.center(6,6);
  assert.equal(nav.target(actor,goal.x,goal.y),true);
  const distance=actor.path.slice(1).reduce((sum,tile,index)=>{
    const a=nav.center(...actor.path[index]),b=nav.center(...tile);
    return sum+Math.hypot(b.x-a.x,b.y-a.y);
  },0);
  follow(nav,actor);
  assert.deepEqual({x:actor.x,y:actor.y},goal);
  assert.equal(actor.moving,false);
  assert.equal(actor.target,null);
  assert(Math.abs(actor.walkPhase-distance/18)<1e-9);
});

test('off-center actors first clear furniture instead of cutting the next corner', () => {
  const map=openMap();map.state_matrix[2][2]=3;
  const nav=navigation(map),actor=actorAt(nav,1,1,{x:58,y:55}),goal=nav.center(3,1);
  assert.equal(nav.circleBlocked(actor.x,actor.y,actor.r),false);
  assert.equal(nav.target(actor,goal.x,goal.y),true);
  follow(nav,actor);
  assert.deepEqual({x:actor.x,y:actor.y},goal);
});

test('retargeting an unobstructed walk does not pull the actor back to its tile center', () => {
  const nav=navigation(openMap()),actor=actorAt(nav,1,1,{x:58,y:48}),goal=nav.center(4,1);
  assert.equal(nav.target(actor,goal.x,goal.y),true);
  nav.move(actor,1/60);
  assert(actor.x>58,'a clear continuation must immediately move toward the destination');
});

test('movement respects speed, updates facing and never overshoots the goal', () => {
  const nav=navigation(openMap()),actor=actorAt(nav,3,3),goal=nav.center(1,3);
  assert.equal(nav.target(actor,goal.x,goal.y),true);
  const x=actor.x;
  assert.equal(nav.move(actor,1/60),false);
  assert(Math.abs(x-actor.x-205/60)<1e-9);
  assert.equal(actor.dir,'W');assert.equal(actor.lastSide,-1);assert.equal(actor.moving,true);
  assert.equal(nav.move(actor,5),true);
  assert.deepEqual({x:actor.x,y:actor.y},goal);
});

test('a closing door prevents tunneling and gait while blocked, then the route resumes', () => {
  const map=makeMap([[1,1,1,1,1],[1,0,2,0,1],[1,1,1,1,1]],32,32,{
    doors:[{id:'ward',tiles:[[2,1]],initial_open:true}],
  });
  const nav=navigation(map),actor=actorAt(nav,1,1),goal=nav.center(3,1);
  assert.equal(nav.target(actor,goal.x,goal.y),true);
  nav.setDoor('ward',false);
  assert.equal(nav.move(actor,1),false);
  assert.equal(actor.x,48);assert.equal(actor.walkPhase,0);assert.equal(actor.moving,false);
  nav.setDoor('ward',true);follow(nav,actor);
  assert.deepEqual({x:actor.x,y:actor.y},goal);
});

test('invalid input cannot move an actor or replace its existing route', () => {
  const nav=navigation(openMap()),actor=actorAt(nav,1,1),goal=nav.center(3,1);
  assert.equal(nav.target(actor,goal.x,goal.y),true);
  const before=structuredClone(actor);
  assert.equal(nav.target(actor,NaN,goal.y),false);
  nav.move(actor,-1);nav.move(actor,NaN);
  assert.deepEqual(actor,before);
});
