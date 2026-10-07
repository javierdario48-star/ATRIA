export const SHIFT_REAL_MS=24*60_000;export function competitiveClock({startedAt,now=Date.now()}){const elapsed=Math.max(0,now-startedAt),fraction=Math.min(1,elapsed/SHIFT_REAL_MS);return{elapsedMs:elapsed,gameHours:fraction*24,finished:fraction>=1}}
export function scoreCompetitive({resolved=0,deaths=0,unsafe=0}={}){return Math.max(0,resolved*100-deaths*50-unsafe*20)}
