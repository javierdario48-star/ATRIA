# ATRIA 4.8.7 — Transición de responsabilidad fisiológica: resultado del preflight

Fecha: 2026-10-11. Rama exclusiva: `atria-4.8.7-grace-nursing-qa`.

**Continuidad:** este documento conserva el preflight histórico. La autorización posterior permite separar únicamente los aportes numéricos de Ringer. El rescate fue reparado en `01a43d49452119cc19566e008656485429bf2534`, CI [38145326302](https://github.com/javierdario48-star/ATRIA/actions/runs/38145326302) SUCCESS. El estado posterior, la activación limitada y sus límites se documentan en [ATRIA_487_RINGER_OWNERSHIP_RESULTS.md](ATRIA_487_RINGER_OWNERSHIP_RESULTS.md); las conclusiones de bloqueo de esta auditoría no describen por sí solas el HEAD nuevo.

**Resultado: contratos de ejecución completados en QA; activación clínica bloqueada.** El nuevo motor no controla todavía Ringer ni otro tratamiento en pacientes reales. CP1 sigue intacto, OFF por defecto. No se ha creado otro motor, modificado una ecuación B1, ampliado el catálogo ni intervenido en rescate, supervivencia, Cirugía, XP o multijugador.

## 1. Recuperación verificada y checkpoint de código

- HEAD remoto inicial: `ea75c6153c957b6a0e9d9bf645bd85ac37455ca3`; no commits posteriores al consultar antes del trabajo y antes de publicar.
- Último CI inicial completo: [38130810641](https://github.com/javierdario48-star/ATRIA/actions/runs/38130810641), SUCCESS, exactamente ese SHA.
- Contratos publicados: `3d278b6f95e766f5d33f4423ca96616a9a26c92b`; árbol `94c1af858aaf21446d865f1f03d94b84b395f410`, idéntico al árbol local probado. Parent único: `ea75c6153c957b6a0e9d9bf645bd85ac37455ca3`.
- CI de contratos: [38142424357](https://github.com/javierdario48-star/ATRIA/actions/runs/38142424357), SUCCESS sobre `3d278b6f95e766f5d33f4423ca96616a9a26c92b`. El cierre de bots/documentación tendrá su propio SHA/CI verificado; no se presupone su resultado.

## 2. Auditoría de escritores y consumidores reales

La fuente ejecutada es el HTML generado **desde el HEAD actual** por `src/integration/apply-487.js`; el golden master se lee como entrada obligatoria del build, nunca se modifica ni se usa una versión histórica para reconstruir el proyecto. Las rutas `vendor/.../index.html` identifican dónde vive la función nativa que el build conserva. Los adaptadores 487 se aplican después en su orden real.

| Función/capa | Ruta | Escritura o consumo relevante | Responsabilidad efectiva |
|---|---|---|---|
| `initialLiveVitals`, `initialPhysiology`, `freshSim` | `vendor/atria-4.8.6/index.html` | Inicializan signos, fisiología y baselines; volumen efectivo normalizado, no ml | Nativo; no migrado |
| `recordAdministration` | Misma ruta | Historial de 80 filas, exposición acumulada, contador y `therapyTotals.fluidMl`; no modifica directamente la fisiología | Evidencia real conservada; no borrarla para ocultar tratamientos |
| `addMonitorTherapy`, `orderIntervention` | Misma ruta | Registran administración, estado activo y llaman a fisiología inmediata; las capas posteriores condicionan su ejecución | Nativo; observar la ejecución completa, no el retorno de una orden pendiente |
| V18/V19: `csNeedsIV19`, `csTherapyDelay`, wrapper de `addMonitorTherapy` | Misma ruta, `cs-safe-v0180`/`cs-safe-v0190`; `src/integration/apply-487.js`, adaptadores IV y enfermería | Cola, acceso venoso y callback asíncrono vinculado al paciente. Ringer espera 800 ms antes de administración | Ejecutor actual, sin cambios |
| `applyImmediatePhysiology` | `vendor/atria-4.8.6/index.html` | Ringer aumenta `effectiveVolume`; albúmina/furosemida y otros tratamientos modifican volumen/reserva/estrés; existe rama nativa de control de foco | Primer escritor farmacológico nativo. La vía quirúrgica vigente se conserva; no equiparar consulta a procedimiento realizado |
| Wrapper V3 de `applyImmediatePhysiology` | Misma ruta, `cs-rebase174-v3-safe-variants` | Escala el cambio de volumen y reserva renal según respuesta de la semilla | Debe estar incluido en cualquier futura frontera de sustitución |
| `updatePhysiologyState` nativo | Misma ruta | Inflamación, pérdidas a tercer espacio, volumen, reserva renal, estrés, tono, bomba y oxigenación | Evolución natural. Riñón y otros mecanismos leen el volumen dinámico; no son variables independientes |
| `csSecondaryBridgePhysiology487` | `src/clinical/secondary-sepsis-bridge-487.js`; wrapper en `src/integration/secondary-sepsis-bridge-487.js` | Con fluidos + cobertura + soporte de O₂ requerido + IV + consulta aceptada, reduce pérdida y agrega balance de volumen; también modifica inflamación/tono/bomba | Segundo escritor de volumen condicionado por Ringer. Está ligado a la preparación del pase protegido |
| `csCriticalRescuePhysiology487` | `src/clinical/critical-rescue-487.js`; wrapper en `src/integration/critical-rescue-487.js` | Agrega volumen si existe bolo reciente confirmado, 250 ml mínimo y sin exceder umbral; pressor/O₂ tienen otros aportes | Tercer escritor. Forma parte del rescate expresamente protegido por la solicitud |
| Wrapper de `updatePhysiologyState` en `ns423-evolution` | `vendor/atria-4.8.6/index.html` | Tras cobertura, foco controlado, inflamación descendente y soporte adecuado, aproxima volumen/tono/bomba/O₂/riñón a convalecencia | Cuarto escritor longitudinal condicionado por soporte; no actúa con Ringer solo |
| `therapyEffectTotals` y su wrapper V3 | Misma ruta | Suma offsets directos en los nueve modelos simples; en los cuatro motores sépticos, O₂/pressor/opioides/betabloqueante actúan sobre signos directamente; V3 escala resultados | Nativo. En PERI-SEC Ringer no tiene aquí un offset directo adicional; su efecto viene del volumen |
| `progressionOffsets` y su wrapper V3 | Misma ruta | En sepsis convierte deltas internos desde baseline en signos; en modelos simples usa flags de tratamiento para reducir deterioro; V3 escala trayectoria | Nativo. Cambiar volumen altera PA/FC y puede cambiar perfusión/protecciones |
| `medicationSafetyOffsets` | Misma ruta | Sobrecarga por ml acumulados altera FR/SpO₂/PA; otras toxicidades por dosis/conteo | Hay una rama de toxicidad de fluidos que también necesitará dueño único; cambiar sólo el bolo no la migra |
| `updateLiveVitals`, `nsApplyRecoveryTarget` | Misma ruta | Compone target, aplica convalecencia cuando corresponde, limita y suaviza signos; escribe `liveVitals` | Único monitor real actual. La convalecencia de targets de `ns423` excluye los motores sépticos |
| Wrapper `updateLiveVitals` de `ns421-clinical-state`, `nsPatientState` | Misma ruta | Registra hipoperfusión y deriva clasificación/síntomas/evidencia de cuidado de signos e historia | Consumidores longitudinales; conservar ecuaciones no implica que sus resultados sean independientes de una futura migración |
| `csApplyClinicalVariant`, `v3Ensure`/`v3ApplyOffset` | Misma ruta, V19/V3 | Cambian signos iniciales según semilla/complicación | Nativo. La VM de referencia neutraliza estos factores; no es prueba de todas las variantes del navegador |
| `csDeteriorateWaiting`, cambio de paciente V19/V40, `csWithPatientStateV203` | Misma ruta | Evolución/transferencia de signos de pacientes en espera y selección del estado correcto para callbacks | Fuera de esta migración local; ninguna modificación a guardia/multijugador |
| Wrapper fatal nativo de `updateSimulation` | Misma ruta | Lee PAM/SpO₂/PA/FC actuales; acumula `_fatalExposure`, y puede marcar muerte/cerrar caso | Consumidor protegido del estado real; no acepta signos cosméticos de otro motor |
| `csGraceState487`, `csMissingAdminRescue487`, `ensureGracePatient487`, `csEarlyCriticalDeathGuard487` | `src/clinical/grace-survival-487.js`, `src/integration/grace-survival-487.js` | Evidencia administrada y respuesta real ganan crédito; mantiene relojes activo/físico y gate separado en la transición irreversible | Protección intacta de 180–480 s; evidencia, clocks y crédito bancado no se alteran |
| `csCriticalRescueEvidence487`, `csCriticalRescueWindow487`, wrapper fatal crítico | Módulos de rescate citados | Necesitan evidencia real y signos actuales para soporte/ventana finita | Hay un override posterior del predicado: ver apartado 3; no confundir test aislado con ejecución efectiva |
| `csSecondaryBridgeEvidence487` y wrapper de `updateSimulation` | Módulos de puente citados | Misma evidencia de fluidos habilita preparación/pase; aceptación no equivale a `sourceControlled` | Cirugía/derivación intactas; ocultar el bolo cambia elegibilidad |
| Confirmaciones clínicas | `src/integration/clinical-confirmations-487.js` | Lee ledger para mensajes de ejecución, monitor/IV | No es un escritor farmacológico |
| Adaptador farmacológico global | `src/integration/pharmacology-487.js` | Intentaría sustituir wrappers si su transacción completa fuera válida | **Actualmente rechazado por heparina**: no está instalado ni suma efectos a esta trayectoria |
| Observador CP1/B1 | `src/integration/physiology-qa-observer-487.js`, `physiology-shadow-487.js` | Copia evidencia a su trayectoria propia; dos hooks call-through; nunca escribe signos/fisiología reales | Sombra exclusivamente. Se conserva su contrato v1 y API existente |

Orden fisiológico efectivo relevante: **nativo → puente secundario → rescate crítico → convalecencia ns423 → target nativo → monitor**. V3 envuelve la administración inmediata y los offsets. Un único nombre global de función no implica un único escritor dentro de esa cadena.

## 3. Hallazgo previo adicional: el predicado final de rescate es sustituido

`ns423-evolution` ejecuta después de los adaptadores de gracia y rescate:

```js
csDeathRescueMissing = function(){ return true; };
```

La VM del código generado confirma ese predicado efectivo. Por eso una prueba aislada de la ventana crítica de 65 s **no demuestra** que esa ventana intercepte actualmente la muerte en el juego integrado. La escritura de volumen del rescate y su contador de tiempo sí siguen en la cadena. La protección de muerte temprana permanece porque el límite irreversible consulta por separado `window.csEarlyCriticalDeathGuard487`.

Este hallazgo es del repositorio anterior al cambio. Se conserva y queda pinneado como diagnóstico; repararlo aquí modificaría una política protegida. La aceptación futura debe comprobar las funciones finales después de **todos** los wrappers, no sólo sus unidades aisladas. El PASS de este preflight significa que se reprodujo el riesgo conocido, no que ese override sea correcto.

## 4. Contrato concreto completado, sin nuevo integrador

Se amplían `pharmacology-receipts-487.js` y el contrato existente en `pharmacology-content-487.js`. `physiology-pilot-487.js` sólo conserva/verifica identidad y continuidad dentro del índice de recibos; no cambia ecuaciones ni parámetros. No se modifican los siete mecanismos, cinco definiciones, tres perfiles, reloj ni observador.

Ejemplo de recibo estricto, creado por un **ejecutor confirmado** y comparado con su confirmación independiente; no se genera copiando la orden del jugador:

```js
{
  schemaVersion: 2, eventId: 'patient:delivery:12', patientId: 'patient',
  treatmentId: 'fluid', eventType: 'administration', action: 'bolus',
  status: 'administered', sequence: 12, route: 'iv',
  dose: {amount: 500, unit: 'ml'},
  formulation: {
    id: 'fluid', moleculeId: 'balanced-crystalloid', definitionVersion: 1,
    fingerprint: definition.fingerprint
  },
  episodeId: 'patient:bolus:12', previousEventId: null,
  timestamp: {authorityId: clock.authorityId, unit: 'native-minute', value: actualMinute},
  verification: {source: 'native-administration-log', receiptId: 'confirmed-delivery:12'}
}
```

- La formulación, molécula, revisión y fingerprint deben coincidir con la definición validada. El fingerprint identifica contenido, **no autentica una administración**. `balanced-crystalloid` sigue siendo la identidad reducida B1; no certifica la composición física del producto recibido.
- Vía, unidades, dosis, paciente, acción, secuencia y timestamp deben coincidir con la confirmación. Ni acceso IV ni texto parseado establecen por sí solos qué formulación se ejecutó.
- `start` abre un episodio continuo; `setRate` representa tasa absoluta entregada, exige el último predecesor; `stop` cierra ese episodio, no lleva nueva dosis y no borra exposición pasada. Cero en v2 exige `stop` explícito.
- Un episodio cerrado no se reutiliza; otro inicio necesita un episodio distinto y la suspensión anterior. Cambiar el paciente/formulación/predecesor o omitir la historia falla.
- Los bolos completados independientes pueden acumularse. Ringer B1 admite únicamente `bolus`: no se inventa titulación o suspensión de una infusión de Ringer que el modelo aún no implementa. Suspender un curso opioide no elimina el bolo previo.
- La clave canónica de ejecución entra en la procedencia, deduplicación y protocolo persistente `typed-v2`. No se admite volver a v1/legacy dentro de esa sesión. V1 permanece idéntico para CP1/B1 aprobados.
- El mismo validador se aplica a las confirmaciones y, al entrar recibos nuevos v2, a los recibos ya aceptados por el núcleo. Omitir un episodio previo en un lote nuevo no permite abrir una segunda infusión. No hay otro ledger ni escaneo de historial en ticks sin dosis.
- Se mantienen límites de 2.048 recibos y reloj de 128 segmentos; truncamiento exige checkpoint/replay, no inferencia. Historial v2 completo y manifiesto compatible siguen siendo responsabilidad del ejecutor/checkpoint.

**Límite importante:** el ejecutor nativo todavía no produce estos campos ni recibos confirmados de suspensión. CP1 no se convierte artificialmente a v2; su vía omitida continúa siendo una suposición explícita de sombra. El contrato informático está probado; el test no añade un ejecutor de infusiones ni certifica entrega física.

## 5. Contraejemplos que impiden activar Ringer

`src/integration/physiology-transition-487.test.js` contiene exclusivamente experimentos en VM; no está en el bundle clínico.

1. **Sustituir sólo el bolo:** el mecanismo B1 se aplica una vez desde la administración real de enfermería. La traza de escrituras observa después `csCriticalRescuePhysiology487` aumentando el volumen por el mismo Ringer. Sigue existiendo un segundo aporte, aunque el contador del bolo nuevo sea uno.
2. **Puente:** con administraciones confirmadas y un fixture de consulta aceptada, `csSecondaryBridgePhysiology487` modifica volumen independientemente. El fixture no simula ni afirma cirugía realizada; `sourceControlled` sigue falso.
3. **Ocultar tratamiento:** quitar fluidos del ledger en una copia elimina soporte de rescate y preparación del puente, y reduce crédito observado de gracia. El crédito ya bancado permanece monotónico; no se afirma que desaparezca retroactivamente.
4. **Sobrecarga:** Ringer 3.000 ml desde enfermería todavía produce el offset nativo adverso de FR/SpO₂. El mecanismo nuevo no puede quedarse sólo con la mejoría de volumen y olvidar quién calcula ese daño.
5. **Rollback falso:** restituir la función antigua tras sustituir el bolo no restituye el estado ni la trayectoria divergente. Reescribir el volumen a un baseline también ocultaría perfusión/reserva/historia ya evolucionadas.

Mapeo diagnóstico usado únicamente en VM: `effectiveVolume * 5000`, el mismo empleado por el perfil B1. Con 500 ml, el incremento B1 de volumen circulante es 125 ml / 5.000 = 0,025 normalizado; el bolo antiguo en esta semilla añade `0.065 * 0.86 = 0.0559`, antes del rescate. Son coeficientes de simulación existentes, no datos clínicos ni una calibración aceptada de equivalencia.

No hay una sustitución mínima segura que satisfaga simultáneamente **dueño único de Ringer** y **rescate sin alteración**: el rescate protegido escribe precisamente un efecto de Ringer. Suprimir esa escritura desde un wrapper también modificaría su comportamiento, aunque su archivo no cambiara. Transferir/copiar la bonificación a B1 no demostraría el mecanismo B1 validado. Por la condición explícita del usuario, se mantiene sombra y no se fuerza la activación.

## 6. Pruebas y evidencia de regresión

| Prueba | Resultado y límite |
|---|---|
| Recibos |22 checks:12 previos +10 nuevos; identidad, vía/unidad, episodios, titulación/suspensión entre lotes, downgrade y duplicación, bolos independientes, curso reiniciado tras stop |
| RED→GREEN | Schema v2, episodio oculto/downgrade entre lotes y bolos independientes reprodujeron fallos antes de corregir; revisión independiente detectó dos huecos importantes, ambos corregidos |
| Equivalencia B1 |19 controles y30.351 comparaciones numéricas de observaciones, exposición y riesgos contra fixtures aprobados; sin regenerarlos |
| Preflight transición |11 controles: enfermería real/pending, signos, escritores residuales, evidencia protegida, toxicidad, override final, incompatibilidad de recibos actuales, rollback y heparina |
| Rollback de sombra |7 comparaciones del estado completo a1/30/60/179/180/240/300 s, incluyendo Maps/Sets, historia y clocks. Disable a60 s restaura ambas referencias; segundo bolo250 ml sigue bajo dueño nativo. Esta trayectoria está dentro de gracia ganada; no es aceptación de mortalidad tardía |
| CP1 retenido |24 trayectorias/216 comparaciones ON/OFF existentes; cinco intervenciones/tres perfiles, tests de observador y bootstrap. No reconstruido |
| Suite completa | `npm test`, incluyendo supervivencia/gracia, rescate, puente, Cirugía, enfermería, voz, multijugador, XP/contratos de producto, snapshots y escalabilidad previos; el nuevo preflight se añade a esa suite |
| Build/artefacto | `npm run build`, `npm run qa:physiology-artifact`:71 inline,11 golden externos byte a byte,10 módulos offline QA. Ningún nuevo entry ni escritor |

Trayectoria nativa reproducida a30 s tras Ringer500 ml: volumen0,617009 y sistólica82,188 mmHg; sin tratamiento,0,509897 y73,781 mmHg. Confirma el recorrido enfermería→fisiología→signos del motor anterior. No demuestra superioridad ni activación del nuevo, ni resolución del foco.

Medición nueva del runner CP1 existente sobre el checkpoint de contratos, Node/Linux/x64:600 ticks de1/60 s, un paciente/cinco tratamientos; p95 nativo0,140 ms y con sombra0,148 ms. Heap de proceso26.271.856 bytes y RSS295.034.880 bytes incluyen VMs, motores y resultados retenidos; no son consumo incremental del módulo. Report representativo69.538 bytes, máximo339.179 bytes en JSON. El coste extra del historial v2 es `O(H log H)` al incorporar recibos, `H <= 2048`, no al actualizar cada frame; esa ruta estricta no fue medida como rendimiento de dispositivo. No Android/iOS físico ni navegador completo.

## 7. Protección, rollback y siguiente paso

- HTML completo SHA-256: `92cf3df698f60714c9056562be489cd421e44f49788473bcd3b31522935081c3`, idéntico al checkpoint anterior. Retirando el único entry CP1: `dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7`. Bootstrap/ejecutor/protecciones/procedimientos no han cambiado. Los10 módulos copiados suman82.544 bytes tras los contratos.
- Golden tree: `6619ab6dc565bb1b3485434cbd750ccd64f24e8a`; refs protegidas verificadas: main `08fa4565a3415888c9eae30860693d0f5040afbb`, QA original `7b571a37ded0d3c1ed53923cb95c525ed977fcb4`.
- No despliegue, cambios de Supabase/credenciales ni ramas protegidas. Revocar el observador usa la API CP1 `disable()`, sin devolver fisiología a valores históricos. Revertir los commits de contratos sólo afecta QA; snapshots estrictos v2 requieren manifiesto compatible/replay, no cargar silenciosamente con código v1.
- Estado del catálogo:5/30 intervenciones ejecutables sólo en sombra,25 sin ampliar. Perfiles B1:3/13. Todo tratamiento real continúa bajo el motor anterior. Heparina/global boot siguen rechazados; no compatibilidad ficticia.

**Siguiente checkpoint acotado:** establecer primero una frontera revisable entre el aporte farmacológico de fluidos y las protecciones del rescate, con un contrato explícito de contribuciones/consumidores. Sólo puede continuarse si suprimir los aportes antiguos de fluidos respeta el alcance autorizado y se prueba por separado la conservación de ventanas/evidencia/pase. Después completar evidencia de formulación/vía entregada desde el ejecutor, calibrar la proyección de volumen/sobrecarga y ensayar Ringer/PERI-SEC con dueño único. Rollback clínico debe fijarse por paciente/versiones antes de activación, no mediante un toggle a mitad de una trayectoria.

No está preparado para activar los cinco tratamientos B1. Sí está preparado para el siguiente trabajo específico de frontera de propiedad: contratos y contraejemplos reproducibles, sin empezar los25 restantes. La decisión de mantener sombra procede de evidencia del repositorio y de la restricción explícita del usuario; las propuestas de frontera/calibración requieren validación, y no equivalen a realismo clínico certificado por CI.
