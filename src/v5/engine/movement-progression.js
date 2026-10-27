// ATRIA's continuous navigation keeps its native collision sweep and interpolation.
// The server-authorized level drives a gentle RPG progression: level 1 starts
// about 10% slower, while the asymptotic maximum remains the original 254.2 px/s.
// No additional movement controller or timer is introduced.
export function doctorMovementSpeed(level=1){
 const n=Number.isSafeInteger(level)&&level>=1?level:1;
 const base=184.5;
 const maximum=205*1.24;
 return base+(maximum-base)*(n-1)/(n+24);
}
