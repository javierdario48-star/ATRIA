/** Case-scoped bedside order assistance.
 * Offers documented, testable phrases only. The user must explicitly send.
 * This is not a clinical interpreter and cannot execute or prescribe treatment.
 * Additional cases may register their own tested phrase sets later.
 */
// Clinical authority validates all three in both native cases. This array is
// presentation-only: one shared autocomplete list, no dosage or action rules.
const SHARED_IV=Object.freeze([
 ['iv1','Una vía periférica','una vía'],
 ['iv2','Dos vías periféricas','dos vías'],
 ['fluid','Ringer lactato 500 ml','Ringer 500 ml'],
 ['ceftriaxone','Ceftriaxona IV 1 g','ceftriaxona 1 g'],
 ['metronidazole','Metronidazol IV 500 mg','metronidazol 500 mg'],
 ['albumin','Albúmina IV 1.5 g/kg','albumina 1.5 g/kg'],
 ['transfusion','Transfusión 1 unidad','transfusion 1 unidad'],
 ['vasopressor','Noradrenalina IV 0.05 µg/kg/min','noradrenalina 0.05 mcg/kg/min IV']
]);
const ORDERS=Object.freeze({
 'CIRR-001':[
  ['monitor','Conectar monitor','monitor'],
  ['vitals','Registrar signos vitales','signos vitales'],
  ...SHARED_IV,
  ['sodium','Restricción de sodio','restricción de sodio'],
  ['spironolactone','Espironolactona 100 mg oral','espironolactona 100 mg oral'],
  ['paracentesis','Paracentesis terapéutica','paracentesis terapéutica']
 ],
 'APP-001':[
  ['monitor','Conectar monitor','monitor'],
  ['vitals','Registrar signos vitales','signos vitales'],
  ...SHARED_IV,
  ['npo','Nada por boca','nada por boca'],
  ['consult','Interconsulta a cirugía','interconsulta a cirugía']
 ]
});
export const normalizeOrderQuery=value=>String(value||'').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function monitorOrderExamples(caseId,query='',{hint=false,limit=6}={}){
 const items=ORDERS[caseId]||[];
 const normalized=normalizeOrderQuery(query);
 if(!normalized&&!hint)return [];
 const matching=normalized?items.filter(([,label,command])=>
  normalizeOrderQuery(label).includes(normalized)||normalizeOrderQuery(command).includes(normalized)):items;
 return matching.slice(0,Math.max(0,Math.min(12,limit))).map(([id,label,command])=>({id,label,command}));
}
