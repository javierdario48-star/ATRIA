# ATRIA 5.0 — C08.d: signos vitales físicos y monitor sin visitas innecesarias

## Certificación posterior al checkpoint

**CI definitiva del ejecutable C07.e/C08.d:** [38976811507](https://github.com/javierdario48-star/ATRIA/actions/runs/38976811507) **completed/success 3/3**, commit `d32440a657537dce81288791ce0ebf847eb47d05`. Núcleo **206/206 V5 + 39/39 core**, navegador completo Chromium móvil y regresión histórica V4 aprobados. Los commits siguientes hasta el presente handoff solo son documentales. Sin preview READY matching comprobada; Android físico no probado.

Esta actualización sustituye las advertencias de CI pendiente que figuraban al redactar el informe inicialmente. Los antiguos resultados RED se mantienen como trazabilidad; no representan fallos abiertos del ejecutable verificado.

## Recuperación y autoridad
- Repositorio `javierdario48-star/ATRIA`; rama única `atria-5.0-core-rebuild-experimental`.
- Baseline previo: `9995fd34e8e3d051a546a8bded2879708378075f`, CI [38973439498](https://github.com/javierdario48-star/ATRIA/actions/runs/38973439498) **3/3 success**.
- Commits de esta implementación: `dddd3834a925d2149caae6917ee0f48e7164ded8` (nurse spot vitals), `5d532a18583d1dcd1841ec9e86ea89058a30dc39` (bot público APP), `31b4e7acc7dd4a09a7b5ba7c33dc6f61e0f8107e` (recibo si NPC llega rápido), `d32440a657537dce81288791ce0ebf847eb47d05` (monitor reconfirmado sin segundo viaje).
- CI del último ejecutable: [38976811507](https://github.com/javierdario48-star/ATRIA/actions/runs/38976811507) **pendiente al documentar**, no afirmar 3/3 sin verificar.
- Preview de este SHA no certificada por Vercel READY y SHA matching; bloque previo 402 cuota diaria. Android físico no probado.

## Contrato y cambio preciso
`src/v5/clinical/guard-session.js` conserva el mismo `invoke` clínico autorizado, la única cola espacial de `world.js`, el `nurse-dispatcher.js`, `room-authority.js`, `native-clinical-port.js` y el ejecutor `executeObservation` de APP/CIRR.

Se agrega exclusivamente `procedure.request/vitals` a la selección de tareas físicas de enfermería. En `Enfermera signos vitales` el evento queda pending y **no se crea `lastVitalsKnown`** hasta que la enfermera llegue a la cama y el puerto emita el comprobante por UID/eventId. Se registra una observación puntual `source:'spot'`; no conecta/desconecta el monitor, no administra fármaco, no altera `liveVitals` ni XP. La acción **médica directa** `/signos` conserva la observación inmediata para no modificar la experiencia aprobada.

La reutilización de `monitor` cuando ya está conectado deja de pedir un segundo viaje ficticio. `care.execute` reconfirma la conexión existente con comprobante nativo sin crear un monitor ni otra fuente de observación. Esto copia el principio ya aplicado a vías confirmadas.

## Evidencia y pruebas
- `src/v5/clinical/physical-nursing.test.js`: APP/CIRR pendiente antes de viaje, cero observación/recibo por pasar tiempo clínico sin NPC; llegada y recibo verificados; ausencia de efecto fisiológico; `/signos` directo inmediato sin viaje; monitor ya conectado no manda enfermera por un duplicado nuevo.
- `qa/v5/app-browser.mjs`: desde chat público real Pixel emulado, solicitar `Enfermera signos vitales` después de la medición directa; comprobar pending inicial y `clinical.completed` por UID/eventId, medición `spot`, monitor todavía desconectado. Si un NPC llega rápido durante lectura UI, su recibo es obligatorio; no se inventa fase pending tardía.
- V4 completa sigue habilitada en CI, y ninguna regla de cierre/dosis/caso se cambió.

## Abierto
C08 no completa aún todo el catálogo físico, múltiples pacientes y red. Las lecturas de signos no infieren tratamiento ni emergencia; faltan contraindicaciones farmacológicas C11/C12, C09 avanzado, C10 voz, C18–C25. Mantener la única autoridad; no agregar nuevas variantes de casos.

## Reproducción
1. HEAD remoto de `atria-5.0-core-rebuild-experimental`; revisar C08.d y C07.e, `CURRENT_HANDOFF.md` y matriz de paridad.
2. `npm run test:v5`, `npm run build:v5`, `node qa/v5/app-browser.mjs` con Playwright según workflow `.github/workflows/atria-v5-core.yml`, `npm test`.
3. Para efectos clínicos `/signos` sin NPC y orden `Enfermera signos vitales` con NPC: el segundo solo confirma tras llegada real. Verificar que monitor previamente conectado no genere otra visita.
4. Exigir green 3/3 del SHA exacto y preview matching READY antes de afirmar release; Android físico solo mediante prueba real del usuario.

## Prompt autónomo
> Actúa como ingeniero ATRIA 5.0 en `javierdario48-star/ATRIA`, rama `atria-5.0-core-rebuild-experimental`, consulta `docs/migration/STEP_08D_HANDOFF.md`, `STEP_07E_HANDOFF.md`, `CURRENT_HANDOFF.md`. Baseline `9995fd34`, último código `d32440a657537dce81288791ce0ebf847eb47d05`; verifica CI [38976811507](https://github.com/javierdario48-star/ATRIA/actions/runs/38976811507). C08.d convirtió signos solicitados a enfermería en acción de cama con medición/recibo verdaderos, mantuvo `/signos` médico inmediato y evitó segundo viaje por monitor ya confirmado. C07.e probó combinaciones y concurrencia clínica. Sigue próximo módulo mínimo de enfermería/farmacología con pruebas de núcleo y navegador, CI, sin tocar main, producción, vendor ni teclado; no casos nuevos y documenta el siguiente SHA.
