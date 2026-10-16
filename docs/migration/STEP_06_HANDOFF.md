# C06.a — Anamnesis natural y contexto de pacientes CIRR/APP

## Alcance real y recuperación

Checkpoint implementado y publicado; **C06 global permanece parcial**. Se
migraron los perfiles y las interacciones descritas abajo para CIRR/APP. No se
incorporaron patologías, tutor completo, voz, enfermería física ni transporte social.

- Repositorio: `javierdario48-star/ATRIA`.
- Rama exclusiva: `atria-5.0-core-rebuild-experimental`.
- SHA inicial: `6e75b18d26dc1dcd3bf3ffa08af177f20efe01fe`.
- SHA funcional remoto: `3ea74db7f788bd174cb341d0a4be7fa82c021e71`.
- Árbol probado idéntico al publicado: `63d255a7812fa9e8ada4424ca8d2f54f4fc65c82`.
- CI: [38847059492](https://github.com/javierdario48-star/ATRIA/actions/runs/38847059492), **completed/success, 3/3 trabajos**.
- Preview exacta READY: https://night-shift-clinical-17f62zm28-javierdario4878-7324.vercel.app/ . Alcance de prueba pública en CURRENT_HANDOFF.

## Funciones conectadas a la interfaz

El chat existente responde preguntas ALiCIA, preguntas combinadas, antecedentes,
síntomas y repreguntas cortas. El síntoma precedente se conserva por UID: preguntar
desde cuándo tras fiebre no completa la duración abdominal. Si el original no
define la duración del vómito, la respuesta expresa incertidumbre. Nombrar dolor
o hinchazón vuelve explícitamente al cuadro principal.

Un saludo no oculta la pregunta posterior. Preguntar por dolor «al comer» conserva
la dimensión pedida y no concede anorexia. Antecedentes usan el clasificador puro
original antes del antiguo scoring de palabras. Las respuestas técnicas se
presentan con vocabulario de paciente. Se conserva una respuesta global por
mensaje; una pregunta desconocida recibe una respuesta visible.

La historia muestra dimensiones obtenidas y último reporte subjetivo, con evento,
paciente y tiempo. «¿Se siente mejor?» lee la tendencia fisiológica real, pero no
realiza reevaluación, medición, examen ni tratamiento. Espironolactona no mejora
signos de manera instantánea. Los nombres explícitos Enfermera/Vega prevalecen
sobre un interlocutor seleccionado anteriormente.

## Módulos y arquitectura

Rutas bajo `src/v5/` salvo indicación contraria:

- `clinical/patient-profiles.js`: datos exactos de los dos perfiles efectivos
  `ns421-patient-dialogue`; intensidad compartida con observaciones, sin duplicarla.
- `clinical/patient-dialogue.js`: entrevista pura respecto de fisiología y
  tratamientos; solo actualiza contexto/evidencia adquirida del paciente.
- `clinical/{cirr-care,app-care}.js`: usan el mismo ejecutor de entrevista desde
  sus políticas existentes. Se eliminan dos matchers duplicados de anamnesis.
- `clinical/patient-observations.js`: lee intensidad del perfil compartido;
  conserva cálculo de presentación a partir de signos nativos reales.
- `clinical/guard-session.js`: respuesta desconocida del paciente sin prefijo de
  fallo terapéutico; no crea otro transcript.
- `core/speech-router.js`: precedencia de mención explícita antes de foco previo.
- `ui/clinical-panels.js`: presenta ALiCIA y respuesta subjetiva adquiridas.
- `clinical/patient-dialogue.test.js`, `history-presentation.test.js`:
  aislamiento, adquisición, ausencia de efectos ocultos y colisiones de lenguaje.
- `qa/v5/{characterize-dialogue-native,patient-dialogue-browser}.mjs` y
  `.github/workflows/atria-v5-core.yml`: caracterización efectiva y UI real en CI.

Contexto `p.interview`: `lastSymptom`, `dimensions`, `symptoms`, `subjective`.
Evidencia canónica `p.intentHistory`; emisión por autoridad/puerto existentes.
No existe chat, estado fisiológico, cola de enfermería ni motor clínico nuevo.
Fuente original compleja caracterizada en QA; nunca importada en runtime. Se
conserva el módulo puro `src/clinical/anamnesis-intents.js` sin modificarlo.
Listado exacto de archivos: [changes.json](../evidence/migration-session-2026-10-16/changes.json).

## Pruebas y diferencias justificadas

- `npm run test:v5`: **136/136**, cero omitidos/fallidos; core **39/39**.
- Comparación efectiva original: **2 perfiles exactos, 20 respuestas** ALiCIA,
  repreguntas, fiebre y colisión de «comer»; examen **40 comparaciones**.
- Caracterización farmacológica CIRR: 4 escenarios, preparación 550 ms,
  trayectorias originales. APP: 5 escenarios, Ringer .8 s y antibióticos 1.5 s.
- Chromium real Pixel emulado: preguntas combinadas, repreguntas largas/cortas,
  colisiones, adquisición en historia, proximidad, aislamiento de casos, una sola
  conversación, mención explícita, ningún fármaco/reevaluación ficticia y limpieza.
- CIRR y APP completos en UI tras las correcciones: **100/100 y 133 XP cada uno**;
  CIRR una administración, APP tres; sin duplicación de recompensa.
- Builds game/core independientes aprobados. Evidencia permanente en
  [migration-session-2026-10-16](../evidence/migration-session-2026-10-16/).
- La suite histórica completa aprobó en CI. No se retiraron ni debilitaron pruebas.

El original podía marcar inicio al saludar y migración al preguntar intensidad.
Se corrigieron esos créditos falsos: solo la información efectivamente revelada
concede evidencia. Pruebas específicas conservan la respuesta clínica original.
La revisión independiente de C06.a encontró tres regresiones reproducidas
RED→GREEN: duración con «empezó», saludo con pregunta y apetito que ocultaba dolor.
Las tres tienen contratos nuevos y cobertura móvil; no se presentan como abiertas.

Una ejecución local de UI cargó el build anterior mientras se reconstruía
`out-v5`: reprodujo el parser viejo. Se comprobó igualdad fuente/distribución y
se repitió la prueba después del build; aprobada. Reproducción siempre secuencial:
primero build, después navegador. No se cambió el producto para resolver ese error.

## Pendientes y límites

No se certifica comprensión arbitraria de español ni anamnesis de los once casos
diferidos. Variantes del diálogo fuera de los contratos requieren caracterizar
el original antes de ampliar reglas. Glasgow/orientación no sustituye examen.
No se han completado C07–C12, voz, guardia continua, carrera o multijugador. El
monitor C05 sigue sin ECG/ondas y controles completos. Android físico no probado.

## Reproducción y próximo checkpoint

```sh
npm run test:v5
npm run test:v5-core
node qa/v5/characterize-dialogue-native.mjs
node qa/v5/characterize-exam-native.mjs
node qa/v5/characterize-cirr-native.mjs
node qa/v5/characterize-app-native.mjs
npm run build:v5-core
npm run build:v5
node qa/v5/patient-dialogue-browser.mjs
node qa/v5/cirr-browser.mjs
node qa/v5/app-browser.mjs
npm test
```

Playwright y Chrome configurados según `qa/v5/browser-harness.mjs` y workflow;
no dependen de rutas/herramientas privadas. Manual: Solitario/CIRR o APP, caminar
a B1, hablar desde proximidad; probar «¿Tuvo fiebre?» → «¿Y desde cuándo empezó?»,
«Hola doctor, ¿toma alcohol?» y las dimensiones de dolor; consultar Historia.

Siguiente C07/C08: caracterizar cláusulas/dosis/vías/negaciones/preparación/
dependencias del original; mantener una única cola/autoridad y verificar que
enfermería confirma solamente una ejecución real vinculada al paciente/evento.

## Prompt autosuficiente

Continúa ATRIA 5.0 en `javierdario48-star/ATRIA`, únicamente en
`atria-5.0-core-rebuild-experimental`. Verifica HEAD remoto y CI antes de editar;
lee el plan maestro y `docs/migration/{STATUS,CURRENT_HANDOFF,STEP_02_HANDOFF,
STEP_04_HANDOFF,STEP_05_HANDOFF,STEP_06_HANDOFF,PARITY_MATRIX}.md`, además de los
handoffs generales y STEP_01. El código publicado incluye C04/C05.a en `6e75b18`
y C06.a en `3ea74db7f788bd174cb341d0a4be7fa82c021e71`; confirma sucesores. No
añadas casos: solo CIRR/APP completos. Conserva mapa/sprites, teclado de cuatro
filas, cámara/movimiento/ambo, examen por región, signos conocidos, autoridad/
puerto y limitaciones fisiológicas. Implementa C07/C08 con pruebas originales,
UI Chromium móvil y regresión CIRR/APP; sin confirmaciones ficticias ni colas
paralelas. Publica solo experimental, verifica CI/preview exactos y actualiza
STEP/STATUS/CURRENT_HANDOFF con SHA, riesgos y trabajo no publicado. No dependas
de ninguna conversación o herramienta auxiliar anterior.
