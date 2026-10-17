// Weak keys allow closed modal subtrees to be collected. Identical snapshots
// must not recreate focused or pressed controls during the presentation tick.
const rendered=new WeakMap();
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function setHTML(node,html){
 if(node&&rendered.get(node)!==html){node.innerHTML=html;rendered.set(node,html);}
}
