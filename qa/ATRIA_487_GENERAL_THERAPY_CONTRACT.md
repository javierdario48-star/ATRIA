# ATRIA 4.8.7 — Contrato general de tratamientos para casos nuevos

## Estado y límites
La versión QA utiliza las 29 fichas de `PHARMA_RULES_487` más `anticoagulation`.
Un único evaluador lee **indicaciones**, **excepciones**, **contraindicaciones**
y **evidencia de administración nativa**. No reemplaza los escritores existentes
de fisiología ni genera 29 motores nuevos. No constituye validación clínica
cuantitativa de todos los medicamentos.

**No interpretar la clasificación como excluyente:** una intervención de
cumplimiento puede causar eventos adversos y una dinámica también puede ser
requisito terapéutico. Heparina es un ejemplo comprobado.

## Configuración de un caso nuevo

Añadir los datos clínicos a la definición de la enfermedad:
```js
{
  id:'NEW-CASE',
  keyInterventions:['oxygen'],
  pharmacology:{
    traits:['infection','hypovolemia','bleed'],
    requiredTreatments:['fluid','source_control'],
    coverageSets:[
      ['ceftriaxone','metronidazole'],
      ['piptazo']
    ],
    riskFlags:['renal','qt'],
    contraindications:['anticoagulation'],
    overrides:{
      furosemide:{indicated:false,contraindicated:true},
      anticoagulation:{bleedingRisk:true}
    }
  }
}
```

Los rasgos y excepciones son **datos** del caso, no funciones nuevas.
En pacientes concretos, `patient.clinicalFlags` puede contener
`activeBleeding`, `majorBleeding`, `knownHIT`,
`drugAllergies:['ceftriaxone']`, `severeAllergies:['ceftriaxone']`,
`renalImpairment`, `prolongedQT`, `hyperkalemia`,
`respiratoryFailure`, `fluidOverload`, etc.

`pharmacology.traits` es obligatorio para casos desconocidos. Un caso
infeccioso nuevo necesita `coverageSets` explícitos: no se infiere
susceptibilidad bacteriana solamente por el diagnóstico.

## Resultado consultable

`window.csCare487.assess(id)`: un fármaco del catálogo,
`indicated`, `required`, `contraindicated`, `risk`,
`administered`, `appropriate`, `hazardTypes`.

`window.csCare487.requirements()`: tratamientos exigidos, pendientes,
cobertura confirmada y `treatmentRequirementsMet`.

`window.csCare487.report().general` expone la misma evaluación.
`safeForDischarge` continúa `null`: los requisitos farmacológicos
**NO** autorizan por sí solos alta o derivación. Los evaluadores de diagnóstico,
cirugía, estabilidad y destino siguen siendo responsables.

## Consecuencias clínicas

Enfermería y búsqueda del monitor convergen sobre el registro nativo
`recordAdministration`. Pedir, buscar o dejar pendiente un fármaco NO
produce beneficio ni daño.

Las indicaciones clínicamente malas **no se bloquean automáticamente**:
admiten advertencia y la administración real puede generar iatrogenia.
Heparina mantiene la evolución hemorrágica previamente validada en QA.

Se incorpora una excepción general: al administrar realmente un fármaco
especificado en `severeAllergies`, el escritor de toxicidad existente
refleja una reacción grave con deterioro acotado de presión, respiración y
saturación. `drugAllergies` sin `severeAllergies` advierte y evalúa
inadecuación, pero no produce anafilaxia automática.

La exposición renal con fármacos como aminoglucósidos o anfotericina se
señala en el evaluador general; **no** produce por sí sola lesión renal
instantánea. Se preservan los mecanismos renales nativos donde existían.

`pharmacology.riskFlags` activa cualquiera de los peligros del registro:
por ejemplo, `qt` es relevante para antieméticos o fluconazol;
`hyperkalemia` para espironolactona. Nuevas enfermedades y nuevos
riesgos no requieren pares codificados caso-medicamento.

## Pruebas

`npm run qa:general-therapy` verifica los 390 pares (13 × 30),
casos nuevos de trombosis, infección y control de foco, congestión,
QT/hiperpotasemia, riesgo renal, alergia grave y la equivalencia
enfermería/monitor tras ejecución confirmada.

`npm test` y el pipeline completo siguen siendo obligatorios para
aprobar cualquier checkpoint.

**Pendiente:** afinar individualmente efectos de furosemida, flujo de
oxígeno, farmacología de los compuestos de nombre genérico y validar
Android/iPhone; no afirmar que los 30 estén clínicamente calibrados.
