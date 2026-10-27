// ATRIA's continuous navigation keeps its native base and collision sweep.
// Level is supplied by the account authority; the curve approaches +24%.
export function doctorMovementSpeed(level=1){
 const n=Number.isSafeInteger(level)&&level>=1?level:1;
 return 205*(1+.24*(n-1)/(n+24));
}
