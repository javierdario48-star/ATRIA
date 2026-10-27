// Guard case-selection policy. XP factors are descriptive until the durable
// server reward pipeline validates and applies the selected scope.
export const GUARD_SCOPES=Object.freeze({
 random:Object.freeze({label:'Cualquier caso',multiplier:1.5}),
 specialty:Object.freeze({label:'Por especialidad',multiplier:1.2}),
 specific:Object.freeze({label:'Patología específica',multiplier:1})
});
export function eligibleGuardCases(cases,playableIds,scope='random',selection=''){
 const eligible=cases.filter(c=>playableIds.includes(c.id));
 if(scope==='random')return eligible;
 if(scope==='specific')return eligible.filter(c=>c.id===selection);
 if(scope==='specialty')return eligible.filter(c=>String(c.specialty||c.category||'').toLowerCase()===String(selection).toLowerCase());
 return [];
}
export function guardScopeMultiplier(scope){
 return GUARD_SCOPES[scope]?.multiplier??null;
}
