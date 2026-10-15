const PLAYER_RADIUS=10.5;
const PLAYER_SPEED=205;
const DIRECTIONS=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],
  [1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function facing(dx,dy) {
  const index=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;
  return ['E','SE','S','SW','W','NW','N','NE'][index];
}

function pointSegmentDistanceSquared(x,y,ax,ay,bx,by) {
  const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
  const t=length?clamp(((x-ax)*dx+(y-ay)*dy)/length,0,1):0;
  return (x-ax-t*dx)**2+(y-ay-t*dy)**2;
}

// The minimum separation between a movement segment and a solid tile.
// This checks the full sweep, so a large dt cannot jump through furniture.
function segmentRectangleDistanceSquared(ax,ay,bx,by,left,top,right,bottom) {
  let first=0,last=1,intersects=true;
  for (const [a,d,low,high] of [[ax,bx-ax,left,right],[ay,by-ay,top,bottom]]) {
    if (!d) {
      if (a<low||a>high) {intersects=false;break;}
    } else {
      const t1=(low-a)/d,t2=(high-a)/d;
      first=Math.max(first,Math.min(t1,t2));
      last=Math.min(last,Math.max(t1,t2));
      if (first>last) {intersects=false;break;}
    }
  }
  if (intersects) return 0;
  const pointRectangle=(x,y)=>(x-clamp(x,left,right))**2+(y-clamp(y,top,bottom))**2;
  return Math.min(pointRectangle(ax,ay),pointRectangle(bx,by),
    ...[[left,top],[right,top],[left,bottom],[right,bottom]].map(([x,y])=>
      pointSegmentDistanceSquared(x,y,ax,ay,bx,by)));
}

/** Pure navigation over the authored ATRIA map. All mutable door state is local. */
export function createNavigation(map) {
  const [width,height]=map.source_size_px;
  const {columns,rows}=map.grid;
  const tileWidth=width/columns,tileHeight=height/rows;
  const states=map.state_matrix.map(row=>row.slice());
  const doors=new Map((map.doors||[]).map(door=>[
    door.id,map.door_state?.[door.id]??!!door.initial_open,
  ]));
  const doorTiles=new Map();
  for (const door of map.doors||[]) for (const [c,r] of door.tiles)
    doorTiles.set(c+','+r,door.id);

  const tileAt=(x,y)=>[Math.floor(x/tileWidth),Math.floor(y/tileHeight)];
  const center=(c,r)=>({x:(c+.5)*tileWidth,y:(r+.5)*tileHeight});
  const inBounds=(c,r)=>Number.isInteger(c)&&Number.isInteger(r)&&
    c>=0&&r>=0&&c<columns&&r<rows;
  function passable(c,r) {
    if (!inBounds(c,r)) return false;
    const state=states[r][c];
    if (state===1||state===3) return false;
    const door=state===2?doorTiles.get(c+','+r):null;
    return !door||doors.get(door)===true;
  }
  function setDoor(id,open) {
    if (!doors.has(id)) return false;
    doors.set(id,!!open);
    return true;
  }
  function segmentClear(ax,ay,bx,by,radius) {
    if (![ax,ay,bx,by,radius].every(Number.isFinite)||radius<0||
      Math.min(ax,bx)-radius<0||Math.min(ay,by)-radius<0||
      Math.max(ax,bx)+radius>width||Math.max(ay,by)+radius>height) return false;
    const lowC=Math.max(0,Math.floor((Math.min(ax,bx)-radius)/tileWidth));
    const highC=Math.min(columns-1,Math.floor((Math.max(ax,bx)+radius)/tileWidth));
    const lowR=Math.max(0,Math.floor((Math.min(ay,by)-radius)/tileHeight));
    const highR=Math.min(rows-1,Math.floor((Math.max(ay,by)+radius)/tileHeight));
    for (let r=lowR;r<=highR;r++) for (let c=lowC;c<=highC;c++) {
      if (passable(c,r)) continue;
      const distance=segmentRectangleDistanceSquared(ax,ay,bx,by,
        c*tileWidth,r*tileHeight,(c+1)*tileWidth,(r+1)*tileHeight);
      if (distance<=radius*radius+1e-9) return false;
    }
    return true;
  }
  const circleBlocked=(x,y,radius=PLAYER_RADIUS)=>!segmentClear(x,y,x,y,radius);
  function clearCenter(c,r,radius) {
    const point=center(c,r);
    return passable(c,r)&&!circleBlocked(point.x,point.y,radius);
  }
  function nearestFor(c,r,max,radius) {
    if (!Number.isInteger(c)||!Number.isInteger(r)||!Number.isFinite(max)||max<0) return null;
    if (clearCenter(c,r,radius)) return [c,r];
    // Preserve the native row/column ring order for deterministic target choice.
    for (let ring=1;ring<=max;ring++) for (let dr=-ring;dr<=ring;dr++) {
      for (let dc=-ring;dc<=ring;dc++) {
        if (Math.abs(dc)!==ring&&Math.abs(dr)!==ring) continue;
        if (clearCenter(c+dc,r+dr,radius)) return [c+dc,r+dr];
      }
    }
    return null;
  }
  const nearest=(c,r,max=5)=>nearestFor(c,r,max,PLAYER_RADIUS);
  function routeFor(start,goal,radius) {
    if (!Array.isArray(start)||!Array.isArray(goal)||
      !clearCenter(start[0],start[1],radius)||!clearCenter(goal[0],goal[1],radius)) return [];
    const key=(c,r)=>r*columns+c,goalKey=key(...goal);
    const heuristic=(c,r)=>{
      const dx=Math.abs(c-goal[0]),dy=Math.abs(r-goal[1]);
      return Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy);
    };
    const open=[{tile:[...start],score:heuristic(...start)}];
    const distance=new Map([[key(...start),0]]),previous=new Map(),visited=new Set();
    while (open.length) {
      open.sort((a,b)=>a.score-b.score);
      const {tile}=open.shift(),current=key(...tile);
      if (visited.has(current)) continue;
      visited.add(current);
      if (current===goalKey) {
        const path=[tile];
        while (previous.has(key(...path[0]))) path.unshift(previous.get(key(...path[0])));
        return path;
      }
      const origin=center(...tile);
      for (const [dc,dr,cost] of DIRECTIONS) {
        const c=tile[0]+dc,r=tile[1]+dr,next=key(c,r);
        if (!clearCenter(c,r,radius)||visited.has(next)) continue;
        if (dc&&dr&&(!passable(tile[0]+dc,tile[1])||!passable(tile[0],tile[1]+dr))) continue;
        const point=center(c,r);
        if (!segmentClear(origin.x,origin.y,point.x,point.y,radius)) continue;
        const candidate=distance.get(current)+cost;
        if (candidate>=(distance.get(next)??Infinity)) continue;
        distance.set(next,candidate);previous.set(next,tile);
        open.push({tile:[c,r],score:candidate+heuristic(c,r)});
      }
    }
    return [];
  }
  const route=(start,goal)=>routeFor(start,goal,PLAYER_RADIUS);
  function target(actor,x,y) {
    if (![actor?.x,actor?.y,x,y].every(Number.isFinite)) return false;
    const radius=actor.r??PLAYER_RADIUS;
    const goal=nearestFor(...tileAt(x,y),5,radius);
    if (!goal) return false;
    const path=routeFor(tileAt(actor.x,actor.y),goal,radius);
    if (!path.length) return false;
    const first=center(...path[0]);
    if (!segmentClear(actor.x,actor.y,first.x,first.y,radius)) return false;
    actor.path=path;
    // Skip the current center only when the actual off-center sweep is clear.
    // Otherwise recenter before turning so the actor cannot clip furniture.
    actor.pathIndex=0;
    if (path.length>1) {
      const next=center(...path[1]);
      if (segmentClear(actor.x,actor.y,next.x,next.y,radius)) actor.pathIndex=1;
    }
    const point=center(...goal);actor.target=[point.x,point.y];
    return true;
  }
  function move(actor,dt) {
    if (!Number.isFinite(dt)||dt<0||![actor?.x,actor?.y].every(Number.isFinite)) return false;
    const path=actor.path||[],radius=actor.r??PLAYER_RADIUS,speed=actor.speed??PLAYER_SPEED;
    let remaining=Math.max(0,speed*dt),travelled=0;
    actor.pathIndex=actor.pathIndex??0;
    while (actor.pathIndex<path.length) {
      const point=center(...path[actor.pathIndex]),dx=point.x-actor.x,dy=point.y-actor.y;
      const distance=Math.hypot(dx,dy);
      if (distance<1e-9) {actor.pathIndex++;continue;}
      if (!remaining) break;
      const step=Math.min(distance,remaining),x=actor.x+dx/distance*step,y=actor.y+dy/distance*step;
      if (!segmentClear(actor.x,actor.y,x,y,radius)) break;
      actor.x=x;actor.y=y;remaining-=step;travelled+=step;
      actor.dir=facing(dx,dy);
      if (Math.abs(dx)>.2) actor.lastSide=dx>=0?1:-1;
      if (step===distance) {actor.x=point.x;actor.y=point.y;actor.pathIndex++;}
    }
    actor.walkPhase=(actor.walkPhase||0)+travelled/18;
    const complete=actor.pathIndex>=path.length;
    actor.moving=!complete&&travelled>0;
    if (complete) actor.target=null;
    return complete;
  }
  return Object.freeze({tileAt,center,passable,nearest,route,move,target,circleBlocked,setDoor,
    tileWidth,tileHeight,width,height});
}
