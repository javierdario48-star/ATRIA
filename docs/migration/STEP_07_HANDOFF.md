# ATRIA 5.0 — C07.a — Integridad de dosis y comprobantes de enfermería

**Alcance:** corrección parcial del C07 y pruebas de orden combinada; NO significa C07 completo ni C08 físico migrado. Sin nuevos casos clínicos, sin nueva farmacología, sin modificación de UI/cámara/teclado.

## 1. Recuperación y origen

- Repositorio: `javierdario48-star/ATRIA`.
- Rama exclusiva de trabajo: `atria-5.0-core-rebuild-experimental`.
- Último HEAD de Work verificado al retomar: `416fd0547244c5e9d0e1a425944bf8a59f4f636d`. CI [38849042436](https://github.com/javierdario48-star/ATRIA/actions/runs/38849042436) terminada success, 3/3.
- Handoff fuente: `docs/migration/CURRENT_HANDOFF.md`. C02 completo, C04 examen anatómico CIRR/APP, C05 paneles/monitor parcial, C06 anamnesis parcial; C07/C08 aún pendientes.
- **Último SHA de código de este subconjunto antes de documentación:** `622fac0c5a7fd1b01a26b3ad1fece771bebf17a7`. Confirmar nuevo HEAD al retomar; los informes son commits sucesores.
- Preview con el primer commit correctivo `88444a63c0e99c896f733c4ef4211da4b12e37e9`: https://night-shift-clinical-aiyshwer7-javierdario4878-7324.vercel.app/ (Vercel READY). Es evidencia de despliegue, NO de prueba pública de interacción en esa URL. El último test de orden combinada se añadió posteriormente al SHA `622fac0`: comprobar despliegue SHA exacto antes de usarla como preview final.

## 2. Defecto reproducido RED y corrección

En `src/v5/clinical/app-care.js`, el manejo `therapy.request` de APP-001 comprobaba un tratamiento ya administrado o en preparación **antes** de validar la dosis y vía de la nueva orden. Esto permitía aceptar como `pending` o `executed/reused` una orden de `ceftriaxona 2 g` o `ceftriaxona 1 g oral` después de solicitar previamente `ceftriaxona 1 g` IV.

Pruebas añadidas en `src/v5/clinical/app-care.test.js`:
1. Dosis/vía incompatible mientras un antibiótico está en preparación nunca se une a ese trabajo. Único comprobante correcto al finalizar.
2. Dosis/vía incompatible tras administrar nunca hereda el comprobante ya ejecutado. La repetición válida sí puede leer el comprobante existente, sin otra dosis.
3. Una orden única con **dos vías + ceftriaxona 1 g + metronidazol 500 mg** pasa por el mismo `guard-session`/autoridad y produce exactamente dos administraciones tardías, no antes del vencimiento de preparación; reintentos del mismo envelope no repiten efectos.

**RED comprobado remotamente:** SHA `514dd20097d48b80df7e05c9827f1ef01f4fa137`, CI [38852239490](https://github.com/javierdario48-star/ATRIA/actions/runs/38852239490), paso `Canonical content, navigation, study and independent game contracts` falló justamente en las dos aserciones nuevas (retornaba `pending` y `executed` en vez de `rejected`).

**GREEN del núcleo observado:** SHA `88444a63c0e99c896f733c4ef4211da4b12e37e9` CI [38852264615](https://github.com/javierdario48-star/ATRIA/actions/runs/38852264615), paso `clean-core-contract` completado success tras cambiar el orden de validación. El test de orden combinada tiene un nuevo SHA de QA `622fac0c5a7fd1b01a26b3ad1fece771bebf17a7`, CI [38852370464](https://github.com/javierdario48-star/ATRIA/actions/runs/38852370464): verificar conclusión final de los tres jobs al recuperar; NO presentar como 3/3 verde mientras esté en curso.

El ejecutor se mantuvo en la política APP-001 existente. Validación de fármacos es **caso-específica** mediante `parseAppDose` y dosis originales del catálogo; no hay fórmulas de gravedad, efectos inventados, nuevo scanner, motor de fármacos, cola, tabla de casos o parches HTML. Se preserva la autorización, validación de identidad, preparación, reloj y comprobantes de `native-clinical-port.js`. CIRR queda inalterado.

## 3. Rutas modificadas

- `src/v5/clinical/app-care.js`: validación de dosis y vía antes de buscar tratamiento/pending existente.
- `src/v5/clinical/app-care.test.js`: aserciones RED→GREEN para órdenes repetidas erróneas y combinación de 3 cláusulas.

Ninguna modificación de `vendor/atria-4.8.6/**`, producción, `main`, otros casos, mundo, mapa, teclado, cámara, chat, voz o multijugador.

## 4. Límites importantes

- La colocación de vías en APP todavía se acredita instantáneamente al aceptar el comando `procedure.request/iv`; **C08 física, desplazamiento de enfermera y colas reales de tareas permanecen pendientes**. La nueva prueba demuestra orden lógico y demora de fármacos, no que una enfermera realmente caminó hasta la cama y colocó un catéter.
- No afirmar que reconocimiento y ejecución combinada de toda la terapia/nursing original está migrado. Scanner, distintas clases de órdenes, negaciones y dosificación fuera de los contratos probados necesitan completar C07.
- No añadir más casos ni fármacos como prueba. Los once casos restantes siguen diferidos.
- No se ha probado dispositivo Android físico en esta continuación; si CI da verde, eso es Chromium móvil emulado.
- Las pruebas de autoridad y fisiología del motor original no se sustituyeron ni se deshabilitaron.
- Los dos casos clínicos completos continúan siendo CIRR-001 y APP-001.

## 5. Continuación concreta

1. Comprobar HEAD remoto y ejecución CI del SHA exacto. Si falla, analizar log y corregir la causa sin rebajar test.
2. Verificar preview Vercel matching SHA, distinguir READY de verificación funcional desde UI pública.
3. Completar C07: matriz de órdenes combinadas, negaciones, dosis, vías, IV, monitor, oxígeno y estudios; garantizar que lo no soportado sea rechazado con razón, que ningún texto que mencione un medicamento administre por accidente y que las confirmaciones de enfermería sean coherentes. Basarse en el `csNurseScan487` puro ya conectado.
4. Diseñar/implementar C08 mediante **una única ejecución paciente-vinculada**, con cola canónica, caminata física por mundo y tiempos/procedimientos comprobables. Un `procedimiento solicitado` no debe marcarse `realizado` antes de su confirmación. Mantener procedimientos de APP/CIRR ya validados.
5. Ejecutar `npm run test:v5`, `npm run build:v5`, pruebas de browser de enfermería nuevas, `qa/v5/cirr-browser.mjs`, `qa/v5/app-browser.mjs` y `npm test` histórico. CI 3/3 más preview SHA comprobada.
6. Antes de dejar la sesión, actualizar `docs/migration/STATUS.md` y `CURRENT_HANDOFF.md` con SHA/CI/preview finales.

## 6. Prompt para otro ChatGPT

Continúa ATRIA 5.0 en GitHub `javierdario48-star/ATRIA`, rama única `atria-5.0-core-rebuild-experimental`. Lee `docs/migration/CURRENT_HANDOFF.md`, `STATUS.md`, `STEP_07_HANDOFF.md` y plan maestro. Verifica SHA remoto y CI antes de escribir. La última base de Work era `416fd054` con CI 3/3; C07.a corrigió que una nueva dosis/vía APP incompatible heredara el comprobante pendiente/ejecutado de la orden original, con reproducción RED→GREEN y prueba de orden combinada. Reconfirma el HEAD actual (no presupongas `622fac0`). NO añadas casos ni motores paralelos. Completa C07 y luego C08 sin afirmar que el proceso físico se implementó aún. Protege C04 examen anatómico, monitor/paneles C05, anamnesis C06, teclado/cámara/movimiento, casos CIRR/APP, relojes, fisiología específica, recibos por UID/evento y XP único. Publica commits pequeños con CI y preview SHA exacto, actualiza STEP/STATUS/CURRENT_HANDOFF al finalizar, e informa cualquier trabajo parcial.
