# ATRIA 4.8.7 — Checkpoint E: noradrenalina ejecutada, titulada y suspendida

Rama exclusiva: `atria-4.8.7-grace-nursing-qa`. Base de este segundo bloque: `aa3d0f3cce896b2208ad2732950abc91c18b8b61`, posterior al HEAD inicial remoto `7606e1452b0f4bc9f399e91876fac081ca20b9bc`. El checkpoint D de oxígeno se publicó primero y su Architecture CI [38173164017](https://github.com/javierdario48-star/ATRIA/actions/runs/38173164017) terminó SUCCESS, job114569876573 con todas sus etapas; artefacto11715365431 ligado a ese SHA. E comenzó únicamente después de comprobar ese CI. El SHA/CI exactos de E se verifican tras publicarlo y se informan al entregar; no se usa el CI de D como prueba de E.

## Carencias reproducidas y corrección mínima

El ejecutor nativo aceptaba `noradrenalina 0.05 mg IV` o `noradrenalina 0.05 mcg/kg/min oral` y registraba falsamente `0.05 µg/kg/min`. La tasa positiva ya podía cambiarse mediante otra administración, pero el recibo de enfermería declaraba completada la titulación usando la dosis anterior; si se cancelaba la preparación, la evidencia era falsa. Tampoco existía retirada confirmada.

Se amplían los adaptadores existentes, sin otro catálogo, programador de infusiones, motor ni parámetros fisiológicos:

- Contrato compartido en `nurse-execution-487.js`: una molécula identificada (`noradrenalina`, `norepinefrina`, `nora`), una tasa absoluta positiva `mcg/kg/min` o `ug/kg/min`, compatible sólo con IV/EV. Se normalizan microgramos µ/μ y coma decimal sin perder fracciones. El nombre sin dosis conserva el default nativo **explícitamente registrado**, no una dosis inferida de mg, bolo, otra vía, números escritos o clase genérica `vasopresor`.
- Las órdenes incompatibles o ambiguas se rechazan antes de retención, canalización o administración. El monitor valida **todo** su texto. Enfermería conserva el control de intención del mensaje completo y delimita el contrato de la molécula entre otras acciones reconocidas; no descarta un nuevo verbo/dosis antes de su nombre. Usa el **mismo texto validado para ejecutar**. Vía incompleta, condicional, pregunta, negación, signo ambiguo, dosis previa al nombre o dos tasas no se convierten silenciosamente en default. Se conserva la regresión de doce medicamentos reconocidos sin puntuación.
- Se reutilizan `pendingTherapies`, la preparación nativa de800ms, `csPhase4Pending487` y sus dos drenajes IV existentes. La evidencia del cambio de tasa se vincula al **objeto de esa ejecución pendiente**. El callback nativo sella la cancelación sincrónicamente y captura su administración real; una dosis posterior con el mismo valor/contador no puede revivir el recibo cancelado. Solicitudes coincidentes comparten la ejecución existente; una tasa diferente en preparación no se declara ejecutada.
- `suspender noradrenalina` explícito usa la tarea de retirada ya incorporada en D, solamente QA local solo/aprendiz. Hasta `finishNurseTask` autorizado sigue activa la infusión. El stop conserva paciente, tiempo, vía IV, dosis previa e historial, sin aumentar cantidad ni contador de dosis. No requiere una nueva vía para retirar una infusión previamente confirmada. UID, caso, modo, permiso y objeto activo se verifican de nuevo al completar. Reiniciar exige una nueva administración.

No se añade una conversión mg↔µg ni ml/h↔µg/kg/min: no hay concentración/peso confirmados que la permitan. No se promete soporte de sintaxis libre; los pedidos no verificables necesitan reformulación. Una suspensión brusca es una decisión del jugador con pérdida del soporte, no una recomendación de retirada clínica.

## Mapa de responsables: farmacología todavía nativa

| Aporte o consumidor | Responsable conservado | Efecto de la suspensión confirmada |
|---|---|---|
| Presión/FC de noradrenalina | `therapyEffectTotals()` nativo | Ya no incluye el soporte activo |
| Aporte a tono vascular | `csCriticalRescuePhysiology487()` existente | Cesa el aporte futuro de noradrenalina; el estado ya modificado continúa evolucionando |
| Respuesta de dosis excesiva | `medicationSafetyOffsets()` existente | Conserva su comportamiento previo |
| Enfermedad, pérdidas, inflamación y bomba | `updatePhysiologyState()` nativo | No se sustituye ni se cura la infección |
| Puente de peritonitis | Puente existente, según fluidos/antibióticos/consulta/acceso | No se atribuye su mejoría a noradrenalina ni se declara foco resuelto |
| Rescate65s, gracia y muerte | Políticas existentes | Sólo cuentan soporte real y condiciones existentes; retirada/reinicio no renueva65s |
| Evidencia enfermera | Cola, completion, ledger y recibos nativos | Historia retenida; orden pendiente no es administración |
| Noradrenalina B1 | Sombra experimental existente | Ningún escritor B1 de noradrenalina activado |

Las **dos contribuciones nativas** (presión directa y tono de rescate) no se sustituyen en este bloque. No se afirma haber eliminado esa superposición histórica ni haber conseguido un único mecanismo farmacológico causal. Añadir B1 encima las triplicaría; transferir propiedad requiere otra separación demostrada, sin cambiar política protegida. El avance funcional de ejecución no depende de esa migración. Ringer conserva su titularidad experimental limitada y OFF por defecto; oxígeno continúa nativo.

## Expectativas clínicas independientes y límites

La [SSC2026 oficial](https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026) sostiene noradrenalina como vasopresor inicial en shock séptico. La [ficha regulatoria DailyMed](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=dd4b7827-2fe9-4427-a40a-60f275611bf4) describe efecto vasopresor IV, necesidad de corregir hipovolemia, posibilidad de presión normal con perfusión inadecuada, riesgos arrítmicos/isquémicos y retirada gradual. Esas fuentes orientan comparaciones **cualitativas independientes**, no certifican los números/tiempos comprimidos del simulador.

Trayectorias completas a0/0,1/1/3/10 segundos activos reales, PERI-SEC con fixtures fisiológicos explícitos:

| Perfil | PAM a10s | FC a10s |
|---|---:|---:|
| Sin vasopresor |58,320|133,815|
| Tasa0,01 |64,990|132,214|
| Tasa0,05 |70,124|130,905|
| Tasa0,5 |100,250|146,619|
| Tasa0,05 con hipovolemia |51,071|149,043|
| Tasa0,05 con mayor volemia |89,642|109,674|
| Tasa0,05 con bomba deprimida |68,302|133,247|

Tasas enµg/kg/min, sólo escenarios de prueba, no recomendaciones terapéuticas. Antes de entrega no hay beneficio; tras retirada la presión es menor que manteniendo soporte. Inflamación y foco permanecen iguales al escenario sin vasopresor. Una mejor presión no demuestra perfusión adecuada.

Los cuatro casos con fisiología explícita tienen dependencia nativa de dosis/volemia; los otros nueve conservan aportes más fijos. No se modificó esto para declarar cobertura artificial. No hay eliminación de noradrenalina calibrada, curva de perfusión tisular/riesgo de isquemia o arritmia validados, ni exposición contextual renal/hepática clínica completa. Tampoco se inventan eventos adversos porque el escenario de alta tasa eleve PA/FC. Noradrenalina sigue **nativa parcial / B1 en sombra**.

## Verificación y preservación

`npm run qa:noradrenaline-functional` pasa18 grupos: unidades/vías/identidad negativas desde enfermería y monitor antes de acceso, signos/µ/μ/coma, default transparente, acceso realmente completado, misma dosis validada/ejecutada con vía antes de tasa, inicio/titulación/stop/reinicio, carreras de permiso/UID/modo, cancelación a800ms y reemplazo inmediato, coalescencia de tasas, ambos drenajes IV, observador ON/OFF idéntico, retirada sin nueva vía, combinación oxígeno+Ringer experimental+noradrenalina, ejecución en13 casos, historiales limitados y deterioro después de protecciones. Siete perfiles temporales y retirada frente a infusión mantenida completan la evidencia cualitativa.

Treinta ciclos de inicio/titulación/stop producen60 administraciones, no90; historial80 filas, recibos32, sin claves únicas de noradrenalina creciendo para cada episodio. No se borra una administración para evitar un efecto. Las regresiones de Ringer,65s críticos, gracia, consulta quirúrgica y derivación continúan sin modificar sus políticas. No se reactiva heparina ni el registro global bloqueado.

El validador del artefacto revierte sólo los scripts/adiciones de ejecutor y los hooks de evidencia autorizados antes de exigir el **mismo** hash protegido original. Conserva en ambos lados el guard Ringer aprobado que envuelve la condición de cancelación. Los snapshots numéricos aprobados no se regeneran. Ningún mecanismo B1 clínico se activa por defecto.

La comparación de sombra pasó24 trayectorias/216 puntos con estado nativo idéntico ON/OFF. Build y artefacto pasan: HTML SHA-256 `b681c05944f645aef14defc04e2d69564c325d4891f4451a0fcb891acef5c659`, hash protegido `dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7`,71 scripts inline/11 externos/11 módulos offline (97.672 bytes), cero escritores B1 habilitados por defecto. La revisión independiente terminó sin hallazgos Important/Critical; incluyó30 comprobaciones adicionales de contratos y la verificación del artefacto.

Medición Node reproducible: un paciente/cinco tratamientos activos,100 ticks de calentamiento y600 ticks intercalados por variante. p95 nativo0,246ms, observador0,324ms; la variación de tiempo no demuestra una mejora de rendimiento. Heap del proceso26.740.104 bytes, RSS287.940.608 bytes incluyen VMs y resultados, **no son memoria por paciente**. Informe serializado69.538 bytes, máximo339.179; capacidades256 muestras/2.048 recibos. No son medidas de navegador/renderizado/Android físico.

La reversión completa se probó en una exportación aislada del checkpoint D: se aplicó y revirtió el parche completo, recuperando234 archivos originales y eliminando los nuevos. La copia recuperada pasó los14 controles de oxígeno, build y artefacto, retornando al HTML `cc81a631a84fa6881ecbd04999b1b2f5b115cd14d7e233be3cc5c6b155de6804`. Se utiliza únicamente para verificar rollback, no como base histórica de desarrollo. La suite completa y CI del commit final deben terminar verdes antes del cierre. El rollback es revertir el commit completo para una futura carga/admisión; no se cambian referencias/versiones durante atención activa ni se simula deshacer una retirada real.

No se modifican ramas protegidas, golden master, producción, Supabase/auth/credenciales, XP, multijugador/micrófono, Cirugía/derivación ni políticas de rescate/muerte/supervivencia. No hay despliegue. Este bloque no añade moléculas ni otro motor. Próximo checkpoint de mayor valor: ejecución identificada de morfina, dosis repetidas y duración/daño respiratorio, utilizando mecanismos existentes sólo donde mejoren la funcionalidad sin duplicar escritores nativos. Furosemida y las otras familias quedan posteriores; no se completan los30 tratamientos en esta entrega.
