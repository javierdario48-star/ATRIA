// Presentation-only scope. The authenticated clinical room still enforces
// admission and patient range independently of this social motion stream.
export function privateRoomMotionPrefix(roomId){
 if(typeof roomId!=='string'||!roomId)return '';
 let hash=2166136261;
 for(let i=0;i<roomId.length;i++)
  hash=Math.imul(hash^roomId.charCodeAt(i),16777619)>>>0;
 return 'ward-'+hash.toString(16).padStart(8,'0')+'-';
}
