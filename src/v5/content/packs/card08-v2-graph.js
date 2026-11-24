// Read-only clinical graph. All clinical effects, procedural receipts and XP
// remain with existing native owners. A surgical handoff is not surgery.
const nodes=[
 ['encounter','Ingreso con dolor torácico brusco'],['triage','Evaluación hemodinámica'],
 ['history','Anamnesis y antecedentes'],['exam','Exploración vascular y cardíaca'],
 ['hypothesis','Impresión de síndrome aórtico'],['studies','Estudios pendientes'],
 ['results','Angio-TC o ETE informada'],['nursing','Enfermería pendiente'],
 ['treated','Tratamiento confirmado'],['evolution','Evolución fisiológica'],
 ['complication','Fuga o deterioro aórtico'],['iatrogenia','Daño farmacológico'],
 ['rescue','Rescate confirmado'],['reassessment','Reevaluación'],['mentor','Dr. Vega'],
 ['unsafe','Disposición insegura'],['recoverable','Atención recuperable'],
 ['receiver','Consulta a cirugía cardiovascular'],['accepted','Receptor acepta'],
 ['rejected','Receptor rechaza'],['quirofano','Traslado a quirófano; reparación no realizada'],
 ['unsupported','Destino no indicado'],['death','Muerte'],['recovery','Checkpoint recuperado'],
 ['reward','Cierre y XP']
];
const edges=[
 ['triage','encounter','triage','measured'],['history','encounter','history','history'],
 ['examination','encounter','exam','examined'],['hypothesis','encounter','hypothesis','hypothesis'],
 ['study-request','hypothesis','studies','ordered'],['study-result','studies','results','results'],
 ['nursing-pending','encounter','nursing','nursing'],['administration','nursing','treated','administered'],
 ['time','encounter','evolution','elapsed'],['deterioration','evolution','complication','complication'],
 ['iatrogenia','treated','iatrogenia','iatrogenia'],['rescue','complication','rescue','rescued'],
 ['reevaluation','evolution','reassessment','reassessed'],['vega','encounter','mentor','mentor'],
 ['unsafe-alta','encounter','unsafe','unsafeAlta'],['unsafe-observation','encounter','unsafe','unsafeObservation'],
 ['unsafe-recoverable','unsafe','recoverable','recoverable'],['receiver-request','reassessment','receiver','requestedReceiver'],
 ['receiver-accepted','receiver','accepted','acceptedReceiver'],['receiver-rejected','receiver','rejected','rejectedReceiver'],
 ['close-surgery','accepted','quirofano','quirofano'],['unsupported-destination','encounter','unsupported','unsupportedDestination'],
 ['death','evolution','death','death'],['checkpoint','encounter','recovery','recoveredCheckpoint'],
 ['xp-once','encounter','reward','reward']
];
export const card08V2Graph=Object.freeze({
 schemaVersion:1,id:'CARD-08@v2:clinical-graph:1',
 semantics:'observational; independent edges; no forced order; native executor authoritative',
 evolutionFamilies:{E0:'presentación hipertensiva',E1:'control antiimpulso confirmado',
 E2:'progresión sin tratamiento eficaz',E3:'fuga aórtica',E4:'iatrogenia y rescate'},
 treatmentFamilies:{T1:{applicable:true,meaning:'monitorización y reevaluación'},
 T2:{applicable:true,meaning:'control antiimpulso si tolerado'},T3:{applicable:true,meaning:'soporte según perfusión'},
 T4:{applicable:false,reason:'sin procedimiento endoscópico indicado'},
 T5:{applicable:false,reason:'sin reperfusión coronaria empírica'},
 T6:{applicable:true,meaning:'recepción cardiovascular; reparación requiere recibo separado'}},
 destinations:{alta:'unsafe',observacion:'unsafe',sala:'unsupported',uti:'unsupported',
 procedimiento:'unsupported',quirofano:'native-cardiovascular-receiver; surgery-not-performed'},
 nodes:nodes.map(([id,label])=>({id,label})),edges:edges.map(([id,from,to,when])=>({id,from,to,when}))
});
