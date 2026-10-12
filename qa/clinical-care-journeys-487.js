/**
 * Declared independent ED end goals for current 13 seeds. These are test
 * treatment pathways, not automatic play hints or clinical prescriptions.
 * source_control is deliberately NEVER injected as a bedside administration.
 */
export const CARE_JOURNEYS_487=Object.freeze({
 'CIRR-001':{destination:'sala',orders:['espironolactona 100 mg'],
  alternatives:[['paracentesis terapéutica','espironolactona 100 mg']],support:[],consult:null},
 'PANC-001':{destination:'uti',orders:['ringer 500 ml','paracetamol 1 g','ondansetron 4 mg'],
  alternatives:[['ringer 500 ml','morfina 4 mg IV','ondansetron 4 mg']],support:['npo'],consult:'uti'},
 'CROHN-001':{destination:'sala',orders:['corticoide','azatioprina 50 mg'],
  alternatives:[['corticoide','paracetamol 1 g','azatioprina 50 mg']],support:[],consult:null},
 'HDA-001':{destination:'procedimiento',orders:['ringer 500 ml','pantoprazol 40 mg','transfusión 1 unidad'],
  alternatives:[['ringer 500 ml','pantoprazol 40 mg']],support:['iv'],consult:'gastro'},
 'COLON-001':{destination:'alta',orders:[],
  alternatives:[['transfusión 1 unidad']],support:[],consult:'cirugia'},
 'PERI-PBE-001':{destination:'sala',orders:['ceftriaxona 1 g','albúmina 1.5 g/kg'],
  alternatives:[['piptazo 4.5 g','albúmina 1.5 g/kg']],support:[],consult:null},
 'PERI-SEC-001':{destination:'quirofano',orders:['ringer 500 ml','ceftriaxona 1 g','metronidazol 500 mg'],
  alternatives:[['ringer 500 ml','piptazo 4.5 g']],support:[],consult:'cirugia'},
 'PERI-TER-001':{destination:'uti',orders:['ringer 500 ml','ampicilina 2 g','amikacina 500 mg','fluconazol 400 mg'],
  alternatives:[['ringer 500 ml','imipenem 500 mg','fluconazol 400 mg']],support:[],consult:'uti'},
 'APP-001':{destination:'quirofano',orders:['ceftriaxona 1 g','metronidazol 500 mg'],
  alternatives:[['piptazo 4.5 g']],support:[],consult:'cirugia'},
 'CHOLE-001':{destination:'quirofano',orders:['ringer 500 ml','ceftriaxona 1 g','metronidazol 500 mg'],
  alternatives:[['ringer 500 ml','piptazo 4.5 g']],support:['npo'],consult:'cirugia'},
 'ILEO-001':{destination:'sala',orders:['ringer 500 ml','ondansetron 4 mg'],
  alternatives:[['ringer 500 ml','ondansetron 4 mg','morfina 4 mg IV']],support:['npo','ngt'],consult:'cirugia'},
 'MESI-001':{destination:'quirofano',orders:['ringer 500 ml','heparina IV'],
  alternatives:[['ringer 500 ml','heparina IV','noradrenalina 0.05 mcg/kg/min']],support:[],consult:'hemodinamia'},
 'CHOLANG-001':{destination:'procedimiento',orders:['ringer 500 ml','ceftriaxona 1 g','metronidazol 500 mg'],
  alternatives:[['ringer 500 ml','piptazo 4.5 g']],support:[],consult:'gastro'}
});
