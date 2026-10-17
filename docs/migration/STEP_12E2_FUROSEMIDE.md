# ATRIA 5.0 — C12.e2: Furosemida IV real

Fecha: 2026-10-17. Rama única: atria-5.0-core-rebuild-experimental.
Base C12.e1 comprobada: df9bc9c592500cdbb47fb55dd404f3f5003bc5e2.
Código C12.e2: cb4556b9ce2890163e76ebfc97c91834f1130c64.
Corrección de prueba clínica: 6bac009dd344a9f422174d4f6fcff5eaeb158115.
CI del código: https://github.com/javierdario48-star/ATRIA/actions/runs/39003953422
El job clean-core-contract aprobó 279/279 V5, 40/40 core y compilaciones; HTTP multijugador también aprobó. Consultar el enlace para el resultado final de navegador y regresión V4, pendientes al redactar; no presentar 4/4 hasta verificar.

## Comportamiento implementado

Furosemida 40 mg IV es técnicamente administrable en APP-001 y CIRR-001 desde el intérprete único, no solo visible en el catálogo. La dosis es una referencia interna del videojuego, no una recomendación médica.

- src/v5/clinical/native-medications.js: agrega la furosemida al formulario IV ya validado; conserva createIVAdministration, parseStandardIVDose, espera de 1,5 segundos, UID, sourceEventId y recibo único.
- src/v5/clinical/guard-session.js: reconoce furosemide en prevalidación de órdenes compuestas; conserva visita espacial de enfermería, acceso IV certificado, preparación en cama, finalización mediante createNativeClinicalPort y ACK. Solitario y Aprendiz habilitados; Coop/Competitivo aún no.
- src/v5/clinical/pharmacology-catalog.js: agrega el proyector puro applyConfirmedIVTargetOffsets para fármacos IV expresamente habilitados (solo furosemida hoy). Reutiliza csPharmResponse487, REFERENCE_DOSES_487, caseDrugResponseScale y signos actuales. Rechaza dosis/UID/horas o fuente de comprobante falsos, órdenes pendientes y repetición de fuente.
- src/v5/clinical/native-app.js y native-cirr.js: únicos propietarios que actualizan patient.liveVitals; incorporan offsets de la furosemida al target suavizado y acotado. El catálogo marca sys, dia, hr, rr y spo2 como ejes propios para no duplicar efectos en pharmacologyRead.
- En congestión CIRR puede mejorar la FR y, si está alterada, la SpO2; no elevar PA ni saturación normal por defecto. En hipotensión actual APP el diurético puede reducir la PA, en lugar de devolverla artificialmente hacia su basal.
- La respuesta sigue los minutos nativos heredados (inicio aproximado en 5 minutos, máximo orientativo en 30), con el único reloj y avance por caso. Cada orden nueva se registra; replay del mismo evento no redosifica. Las dosis repetidas no amplifican indefinidamente el offset: no se modeló acumulación, eliminación ni diuresis renal.

## Pruebas y hallazgo RED / corrección

Archivo nuevo: src/v5/clinical/furosemide-physiology.test.js.
Incluye dosis/vía inválidas, ausencia de efecto hasta la administración real, dos casos y valores normales/alterados, condiciones adversas de hipotensión, inicio temporal, dos órdenes distintas de 40 mg, replay de la misma, registro total de 80 mg, rechazo de otra identidad/fecha/dosis, no cambio tras cierre y tests Solitario/Aprendiz con enfermera caminando al paciente.

La primera CI de código fue https://github.com/javierdario48-star/ATRIA/actions/runs/39003896490 y reveló 278/279 V5: el fixture hipotenso partía ANTES de la preparación y recuperaba PA previamente, de modo que no representaba hipotensión al administrarse. Se corrigió solamente el instante del estado hipotenso en la prueba mediante 6bac009. No se retocó el motor para ocultar el fallo. La CI nueva confirmó 279/279 V5 y 40/40 core, con build V5 y job HTTP aprobados.

## Límites actuales y siguiente paso

No hay furosemida oral, esquema variable de dosis ni balance hídrico/renal, electrolitos, farmacocinética, mortalidad o cierre fatal nuevo. La espironolactona de CIRR, el oxígeno C12.e1, antibióticos y Ringer quedan preservados. Los otros medicamentos del catálogo no pasan a ser administrables por este cambio. No se agregan nuevos casos clínicos.

No se tocaron main, vendor, golden master, V4.8.7, HTML antiguo, mapa ni diseño de UI. Las regresiones históricas siguen activas. La red HTTP de C21.c sigue siendo protocolo de QA, no Coop/Competitivo jugable; faltan backend duradero y sincronización nativa/UI.

Para retomar, comprobar HEAD remoto, inspeccionar esta CI y ejecutar npm run test:v5, npm run test:v5-core, npm run build:v5, npm test y pruebas de navegador/HTTP en CI. La siguiente familia razonable es morfina IV (C12.e3), con la misma infraestructura IV, comprobante y evaluación original de analgesia e hipotensión; no implementar varias familias a la vez. Luego C12.f para progresión, efectos nocivos y desenlace. Después C21.d/C22/C23. Mantener 24 min reales para una guardia de 24 h simuladas.
