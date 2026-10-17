# ATRIA 5.0 — C12.j: motor fisiológico heredado de peritonitis/sepsis (extracción verificada)

Fecha: 2026-10-17. Rama exclusiva `atria-5.0-core-rebuild-experimental`. No tocar main, V4.8.7, golden master, mapa, UI, chat, tratamientos o cierres.

## Alcance y resultado

Se extrajeron del código V4.8.7 **efectivamente generado** las tres funciones nativas: `initialPhysiology`, `updatePhysiologyState`, `progressionOffsets`, después de ejecutar `apply487()` sobre el golden master. El script reproducible `qa/v5/legacy-clinical-owner-source.mjs` se ejecuta en CI y registra el cuerpo del código utilizado, para evitar trasladar pseudocódigo o el experimental B1.

**Hallazgo fundamental**: el motor longitudinal completo nativo se activa sólo si `C.physiology.engine` es `peritonitis` o `sepsis_source`. En APP-001 y CIRR-001, las funciones nativas retornan sin modificar dicho estado. Una importación indiscriminada a APP/CIRR añadiría comportamientos que ni el juego antiguo tenía.

Se creó `src/v5/clinical/sepsis-physiology-487-core.js`:
- `initialLegacySepsisPhysiology487(caseData)`: instancia el mismo estado latente V4: inflamación, volumen efectivo, SVR, contractilidad, oxigenación, reserva renal, control de foco y estrés renal.
- `advanceLegacySepsisPhysiology487(previousState,caseData,nativeMinute,{coverageScore,coverageRamp,albuminActive})`: conserva las ecuaciones del update original para crecimiento/recuperación de infección, tercer espacio, lesión renal, estrés, vasoplejía, bomba y oxigenación, pero devuelve un nuevo estado sin efectos secundarios. Cobertura terapéutica es una entrada **explícita** que deberá provenir de dosis verdaderamente confirmadas; el módulo jamás acredita una simple orden.
- `legacySepsisVitalsOffsets487(state,baseline,caseData)`: proyecta los seis ejes de signos vitales con los coeficientes del juego original, pero **NO escribe los signos**. El único escritor futuro será el ejecutor clínico autorizado.
- Rechaza tipos de caso ajenos, tiempos invertidos, cobertura falsificada y saltos >1,5 minutos nativos. El juego antiguo silenciosamente recortaba saltos largos: el bridge exige que el reloj superior fragmente las actualizaciones para evitar perder tiempo patológico.

## Comparación REAL ejecutada

`src/v5/clinical/sepsis-physiology-487-core.test.js` importa el mismo `createLiveNativeJourney487()` de la QA clásica y llama al método `ctx.updatePhysiologyState()` original, sin IV ficticios ni cambios de paciente. Compara todos los ejes del estado y los offsets, para:
- PERI-PBE-001: 0,12; 0,30; 0,60 y 0,90 minutos nativos.
- PERI-SEC-001: iguales momentos.
- PERI-TER-001: iguales momentos.

Resultados: equivalencia numérica con tolerancias 1e-9/1e-8, sin copiar errores de temporizador ni importar HTML al bundle. Regresión V5 con **316/316** y núcleo 40/40 aprobados en CI inicial de este checkpoint. El resultado del resto de trabajos (navegador, legado y HTTP) se comprobará en la misma ejecución antes de declarar 4/4.

CI código: https://github.com/javierdario48-star/ATRIA/actions/runs/39056298843

## Fronteras aún NO migradas (deliberado)

- **No se conecta aún al runtime jugable**: los tres casos PERI tienen fichas en JSON, pero siguen sin un ejecutor native-care que aplique medicaciones/órdenes/cierre; conectar este módulo directamente desde guard-session generaría un motor paralelo. Primero migrar el care de PERI usando el mismo puerto y reloj V5, y luego enchufar el único escritor.
- Falta extracción/validación de la ruta **inmediata de tratamientos** `applyImmediatePhysiology` y sus wrappers V3, `csSecondaryBridgePhysiology487` y `csCriticalRescuePhysiology487`. No basta copiar la función base: hay correcciones posteriores en V4.8.7 y los recibos de medicación deben correlacionarse 1:1. B1 experimental continúa prohibido.
- La farmacología de los otros casos requiere su propio motor antiguo: APP/CIRR no usaban la progresión latente de sepsis, por lo que no podemos prometer paridad fisiológica adicional sin diseñar explícitamente reglas educativas diferenciadas.
- Reloj 24 minutos reales ≠ 24 horas simuladas sigue pendiente. Una subida global de velocidad alteraría fármacos, estudios y rescate.
- No se agregan casos nuevos de contenido; la prioridad es migrar ejecutores y mecanismos originales, sin reproducir defectos de multijugador.

## Siguiente checkpoint técnico ordenado

1. Leer los tests antiguos `qa/ATRIA_487_PHYSIOLOGY_TRANSITION_RESULTS.md` y `qa/ATRIA_487_RESCUE_OWNERSHIP_RESULTS.md` junto al script extractor de writers.
2. Extraer y probar la **aplicación inmediata de medicamentos por recibo** en un módulo puro. Comparar V4 y V5 en PERI-SEC para 0/500/1000/2000 ml, con/sin antibióticos y fuente quirúrgica confirmada; no incluir la ruta B1 en sombra.
3. Migrar sólo el puerto clínico ejecutor de PERI-SEC y conectar éste como único dueño de estado+signos. Mantener el evaluador/XP original, enfermería V5, una cola, UID por caso y tests reales 2 clientes.
4. Solo después avanzar a PBE/TER y otros casos del catálogo por reutilización de contratos.

Se debe mantener todo el código anterior que ya funciona. Este documento y CURRENT_HANDOFF contienen la verdad de migración, no reescribir sistemas por desconocerlos.
