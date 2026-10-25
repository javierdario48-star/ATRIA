// UI-only avatar appearance carried in V5 through the existing authenticated
// social presence color field. It never touches clinical authority or movement.
export const SCRUB_COLORS=Object.freeze(['navy','green','gray','pink','teal','burgundy']);
export const AVATAR_SEXES=Object.freeze(['male','female']);
export function scrubAppearance(color='navy',sex='male'){
 return {color:SCRUB_COLORS.includes(color)?color:'navy',
  sex:AVATAR_SEXES.includes(sex)?sex:'male'};
}
export function socialAppearance(color,sex='male'){
 const a=scrubAppearance(color,sex);
 return a.sex==='female'?'female-'+a.color:a.color;
}
export function presenceAppearance(raw){
 const s=String(raw||'navy');
 return s.startsWith('female-')?scrubAppearance(s.slice(7),'female'):scrubAppearance(s,'male');
}
export function playerSpriteKey({color,sex}={}){
 const a=scrubAppearance(color,sex);
 return a.sex==='female'?'player-female-'+a.color:'player-'+a.color;
}
