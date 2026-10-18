# ATRIA 5.0 — punto de continuación verificado

> **CONTRATO CANÓNICO DE PRODUCTO:** [Manual maestro ATRIA 4.8.7 → 5.0](ATRIA_50_MANUAL_MAESTRO_FUNCIONAL.md) (22 secciones, 13 casos, flujo de diagnóstico/consulta/cierre, farmacología, multijugador, pruebas) y [orden para Work](WORK_CONTINUATION_FROM_MANUAL.md). **Si un informe previo discrepa del manual en libertad médica, destino o UX, prevalecen las decisiones expresas del creador sustentadas en la fuente V4 efectiva**. Los tests no implican que todas las funciones V5 estén completas.


Actualizado: 17-10-2026. Repositorio `javierdario48-star/ATRIA`.
**Única rama de implementación:** `atria-5.0-core-rebuild-experimental`.

Este handoff reemplaza el resumen acumulativo anterior. Su contenido íntegro sigue disponible en [la versión de 26cc058](https://github.com/javierdario48-star/ATRIA/blob/26cc058a30485191749b6df485f2a5221c525676/docs/migration/CURRENT_HANDOFF.md), además de los informes de cada paso. No se borró código funcional.

## Estado que sí está comprobado

**C2.c certificado:** [formulaciones especiales y soporte compartido](C2C_SPECIAL_SUPPORT_EXECUTION.md). Albúmina g/kg, transfusión en unidades, noradrenalina titulable/suspendible y anfotericina mg/kg por el mismo ejecutor IV y enfermería física. **401/401 V5**, 40/40 core, comparativa efectiva V4/V5 **10/10**, builds/frontera, regresión histórica y navegadores completos aprobados. Los cuatro recorridos escritorio/Pixel × Solitario/Aprendiz verifican seis recibos auténticos, con titulación y suspensión sin dosis adicional. [Evidencia exacta](../evidence/c2c/verification.json).

**D1 verificado:** [impresión diagnóstica y derivación contextual](STEP_13A_DIAGNOSIS_AND_SURGICAL_HANDOFF.md). Insignia flotante, vocabulario global original, guardar/borrar/reeditar, destinos por requisitos reales, aviso único de enfermería y respuestas quirúrgicas originales a 3,5 s en APP/CIRR. No exige una operación realizada ni un umbral de calidad de 70. El primer commit `b6d966e815bf7ca523f3deebb16f3ec05a6f44f4` falló solamente en el trayecto de escritorio del nuevo bot, corregido junto con la conservación de los botones durante actualizaciones sin cambios. La CI del SHA final inferior pasó completa.

**Último código funcional verificado:** `feeab5a8a0af356f83884f56e15139a7b49d0c3a`.
El commit posterior de entrega sólo actualiza documentación/evidencia; obtener su SHA con `git log -1 --format=%H`. Comprobar siempre el HEAD remoto antes de continuar.

- [CI V5 completa, 4/4 aprobada](https://github.com/javierdario48-star/ATRIA/actions/runs/39076467282): **401/401 V5**, 40/40 core, ambos builds, frontera arquitectónica, navegadores y regresión histórica completa.
- [Censo histórico F/G/I aprobado](https://github.com/javierdario48-star/ATRIA/actions/runs/39076467248).
- [Preview del mismo código](https://night-shift-clinical-ib00fbtzl-javierdario4878-7324.vercel.app/): READY, HTTP200, los **103 hashes** del manifiesto coinciden con el build local. El diagnóstico flotante, rechazos/aceptación quirúrgica y destinos de D1 permanecen cubiertos por CI. Su preview anterior también se comprobó directamente en escritorio.
- Regresión original preservada: 421 combinaciones de enfermería, 131 escenarios de cierre y 39 de tratamiento perjudicial. Las dos discrepancias antiguas de diuréticos continúan identificadas y abiertas; verde no significa que se hayan resuelto.
- APP/CIRR completan los recorridos de UI con 100/100 y 133 XP únicos. Escritorio y Pixel emulado; **Android físico no probado**.

Evidencia exacta del último código: [C2.c verification.json](../evidence/c2c/verification.json), [comparativa de soporte efectivo V4/V5](../evidence/c2c/special-support-native-parity.json) y [recibos de navegadores](../evidence/c2c/special-support-browser.json). Logs, capturas y resultados de escritorio/Pixel: [artefacto de CI](https://github.com/javierdario48-star/ATRIA/actions/runs/39076467282/artifacts/12117108286). Se conserva [la certificación anterior D1](../evidence/d1/verification.json).

## Checkpoints publicados en esta ejecución

| Checkpoint | SHA funcional | Resultado |
| --- | --- | --- |
| C1 | `035ae6b0c8dca197574011d637c4276d3fb50b53` | Libertad clínica; alergia grave y heparina con hemorragia tras administración real; documentación, calidad, soporte, muerte y XP único. |
| C2.a | `833c8bc0a3f8dc45ce103de7e614bb4dd01e0c54` | Nueve antimicrobianos originales más por el mismo ejecutor IV; alternativas APP hasta cierre. |
| C2.b | `4a726fb6f80ec1976e5a7c667778673834e56024` | Morfina efectiva: dosis, preparación, acumulación, eliminación, efectos respiratorios/hemodinámicos y consecuencias. |
| C2.b.1 | `26cc058a30485191749b6df485f2a5221c525676` | Analgesia real también en la respuesta del paciente y el examen, con desaparición del efecto y nueva respuesta al redosificar. |
| D1 | `8c9b2c1a9be1a47856a7025ec50663f4ad92c2da` | Diagnóstico flotante original, destinos automáticos mínimos, respuestas quirúrgicas contextualizadas, rechazo/corrección/aceptación y XP único. |
| C2.c | `feeab5a8a0af356f83884f56e15139a7b49d0c3a` | Albúmina, transfusión, noradrenalina titulable/suspendible y anfotericina mg/kg; consecuencias originales y equivalencia de supervivencia entre frames largos/cortos. |

Cada checkpoint anterior tiene CI V5 y censo histórico aprobados. Informes y enlaces individuales: [C1](C1_CLINICAL_FREEDOM.md), [C2.a](C2A_ANTIMICROBIAL_EXECUTION.md), [C2.b y corrección observacional](C2B_MORPHINE_EXECUTION.md). Evidencia estructurada en `docs/evidence/c1`, `c2a`, `c2b` y `c2b1`.

## Regla clínica definitiva

**Una decisión médicamente incorrecta no bloquea una orden técnicamente válida.** C12.k contenía el criterio contrario para alergia; esa decisión quedó anulada y su documento corregido. Conservar validación de identidad, destinatario, interpretación, dosis/vía soportadas, acceso, llegada, preparación y recibo. No confundir una formulación aún no migrada con una prohibición por contraindicación.

Los datos de alergia se reciben al crear el paciente mediante `allergies`, `severeAllergies` o `clinicalFlags` originales. La historia responde con el dato real sólo al preguntarlo. No se inventa anafilaxia por una alergia de gravedad no especificada. Una dosis contraindicada administrada sí puede causar daño; una orden pendiente no.

`medication-harms-487.js` adapta recibos auténticos a **csSevereDrugReaction487** y **csHeparinHarm487** originales, sin modificar esos módulos ni importar wrappers. APP/CIRR siguen siendo los únicos escritores de signos. Las complicaciones se conservan en historia/chat/calidad aun tras resolverse. La supervivencia usa la misma gracia y ventana de rescate finita; no muerte instantánea ni inmunidad permanente. El protocolo de heparina es el inicial simulado original; no se inventaron dosis numéricas ni reversión.

Se corrigieron además IDs compuestos legítimos de más de 160 caracteres y el orden de publicación administración→complicación→muerte en frames largos, usando la misma cola de autoridad. No se agregaron chats ni motores paralelos.

## C2 ejecutado y límites reales

Hay **19 entradas IV preparadas por el ejecutor compartido**, no 30 tratamientos completos. Se conservan oxígeno, conductas/procedimientos y tratamientos anteriores. C2.a añadió imipenem, ceftazidima, cefoperazona, cefepime, piptazo, ampicilina, amikacina, gentamicina y fluconazol. C2.c añade albúmina, transfusión, noradrenalina y anfotericina. Dosis y tiempos provienen de administraciones genuinas del ejecutable V4. Los efectos están conectados a los propietarios APP/CIRR; no se certifican PK, sobredosis e interacciones completas de todo el catálogo ni ejecución en los otros once casos.

APP comparte tres regímenes con su finalizador original: ceftriaxona+metronidazol, piptazo o imipenem. Antibiótico pendiente o alergénico no da cobertura/cierre. No mejora universal de signos ni control del foco ficticio. Cefepime+metronidazol puede administrarse, pero el fallback experimental contradice el finalizador APP original y no acredita cobertura; cambiar ese contrato exige validación propia, nunca falsificar otro recibo.

`morphine-487.js` recupera el validador y las ecuaciones del wrapper final efectivo. Preparación IV 0.55s; referencia4mg y rango positivo original hasta30mg. Historial auténtico, últimas24 dosis/40min nativos, eliminación dependiente de reserva renal, analgesia por caso y vulnerabilidad según signos actuales. El antiguo daño acumulativo permanente no se añade encima. El núcleo puro coincide con V4 en los13 casos; **sólo APP/CIRR tienen ejecutor V5 completo**.

La complicación opioide exige riesgo original y un efecto sobre el eje respiratorio alterado observado; hipoxemia previa por líquidos sin efecto opioide sobre saturación no se atribuye a morfina. Entrevista y examen consultan esa misma función con el minuto nativo explícito. En los cuatro escenarios de navegador: dolor APP7→5→7; morfina12mg CIRR baja SpO2 a88.396 y soporte real la lleva a91.886, con un evento, un aviso global y5puntos de descuento. Pruebas adicionales verifican rescate temprano/tardío/ausente tras sobrecarga real, fallecimiento y0XP cuando corresponde. No se afirma un protocolo médico completo de intoxicación o anafilaxia.

## Qué falta; retomar aquí

1. **C2.c certificado; continuar la farmacología según el caso.** Corregidas colisión de albúmina/hepatograma, pérdida de mg/kg de anfotericina, conversión de vías no IV y salto de supervivencia con albúmina en frames largos. Comparativa 10/10, 401/401 V5 y CI/navegadores/preview del SHA superior aprobados. C2 no equivale todavía al catálogo completo para todos los casos; no repetir esta implementación ni usarla para prometer ejecutores de peritonitis aún ausentes.
2. **C3 no está integrado.** `sepsis-physiology-487-core.js` ya contiene la transición original comparada para las tres peritonitis, pero falta su propietario clínico y los efectos inmediatos efectivos. Recuperar `applyImmediatePhysiology`, cobertura/dosis/rampa y reglas posteriores válidas de secondary bridge/critical rescue; utilizar un único writer. No copiar B1 de líquidos ni aplicar fisiología séptica a APP/CIRR. Comparar atención correcta, abandono, exceso, daño, foco persistente, rescate y muerte. Corregir los dos diuréticos no lesivos de PERI-SEC/CHOLANG mediante reproducción, no relajando pruebas.
3. **C4 pendiente:** los otros11 ejecutores y sus antecedentes/examen/estudios/evolución/cierres. Las tres peritonitis requieren `csPeritonitisEvaluate487` y la calidad efectiva posterior, no imponer APP/CIRR. Una aceptación quirúrgica no equivale a cirugía/control del foco realizado. Mantener suma/descuento/omisiones/acciones indebidas y XP único.
4. **C5 pendiente:** el producto aún no ofrece guardias clínicas cooperativas/competitivas completas. La CI HTTP2/3/4Chromium prueba el protocolo, autoridad y recibos; no certificar por ello juego clínico multijugador, lobby social completo, reconexión o WebRTC real. Conservar un chat global por guardia, primera interacción válida en competitivo, tratamiento compartido en cooperativo y la misma clínica para todos.
5. **C6 pendiente:** pulido posterior; conservar mapa/personajes/teclado actuales. No reemplazarlos por una maqueta o imágenes generadas.

## Contratos y verificación al continuar

- Un reloj autorizado, dominios explícitos: **1min real=1h visible**; 24min reales=24h visibles. `nativeMinute` conserva .12min nativos/s real, .03 al escribir. Preparación/recibos y ventanas reales no se multiplican globalmente.
- Un propietario por paciente/signos; indicación→preparación física→ejecución→recibo→fisiología→reevaluación. Estudio/consulta pendiente no equivale a hecho/aceptado. Cierre y XP se acreditan una sola vez.
- No modificar main, V4, golden master ni ramas históricas. Desde el HEAD inicial `00984d4329ffbff504914625f6f0bdd5fcd54276` no hay modificaciones en `src/clinical`, `src/integration`, `vendor` ni `api`; los módulos originales reutilizados se importan de forma pura y en sólo lectura.
- QA V4 usa `qa/physiology-live/native-journey-487.mjs` únicamente en tests. No introducir VM, HTML generado, wrappers o sobrescrituras globales en runtime V5.
- Antes de publicar: `npm run test:v5`, `npm run test:v5-core`, `npm run build:v5`, `npm run build:v5-core`, `node scripts/audit-v5-boundary.mjs`, `git diff --check`. Después comprobar ambas CI del SHA exacto, regresión histórica completa, HTTP/navegadores y manifiesto de preview. No afirmar CI verde por sólo aprobar core.

Lecturas de procedencia: [C12.h](STEP_12H_LEGACY_FUNCTIONAL_AUDIT.md), [C12.i](STEP_12I_FLUID_RECEIPT_BRIDGE.md), [C12.j](STEP_12J_LEGACY_SEPSIS_PHYSIOLOGY.md), [C12.k corregido](STEP_12K_MEDICATION_AND_CLOCK_DOMAINS.md). Continuar desde esas evidencias; no repetir una auditoría global.
