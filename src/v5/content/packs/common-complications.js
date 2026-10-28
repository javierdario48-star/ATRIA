// Reusable data for a slow, bounded consequence of sustained low perfusion.
// The common progression owner consumes this metadata; it does not write vitals.
export const hypoperfusionKidneyComplication = (prefix, rescueAllOf) => ({
 id: `${prefix}_hypoperfusion_aki`, type: 'acute-kidney-injury',
 progressionId: 'offset-ramp-v1', rescueId: 'confirmed-rescue-v1',
 probability: 0.12, minMinute: 30, requiredState: {sys: {lt: 90}},
 offsets: [0, 4, 1, -3, -2, 0], riseMinutes: 20, renalStress: 0.15,
 rescueAllOf, recoveryMinutes: 90,
 rationale: 'Hipoperfusión persistente en shock: el deterioro renal se desarrolla gradualmente y requiere vigilancia de diuresis, creatinina y perfusión.',
 manifestation: 'Oliguria y estrés renal por hipoperfusión prolongada; restaurar perfusión según el tipo de shock y reevaluar. La recuperación de TA no normaliza inmediatamente la función renal.'
});
