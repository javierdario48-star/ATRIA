# C04 — Examen anatómico y Glasgow de CIRR/APP

## Alcance y estado

Examen por región/técnica conectado a la UI real de los dos casos completos.
Implementación publicada; puertas locales y CI aprobadas. La preview del SHA
funcional se probó públicamente con el alcance limitado descrito abajo.
No incluye las once patologías diferidas, docencia Vega ni procedimientos terapéuticos.

## Recuperación exacta

- Repositorio: `javierdario48-star/ATRIA`.
- Rama única: `atria-5.0-core-rebuild-experimental`.
- Inicio C02: `0bb0c7fa2e56b803c2ebc248482f5f61bd9aa239`.
- SHA remoto funcional comprobado: `6e75b18d26dc1dcd3bf3ffa08af177f20efe01fe`.
- Árbol idéntico al código local probado: `18f6f1dfbdff2858cf0cd1488ac9e8fa4bb66460`.
- C04 y C05.a comparten este commit porque la interacción/UI usa los mismos contratos.
- CI: [38845430021](https://github.com/javierdario48-star/ATRIA/actions/runs/38845430021), **completed/success, 3/3 trabajos**.
- Preview READY de ese SHA: https://night-shift-clinical-bwfecjjv2-javierdario4878-7324.vercel.app/
  Prueba pública efectiva: portada, lobby, inicio de guardia, panel de paciente,
  signos desconocidos, selección anatómica, rechazo de palpación desde lejos sin
  registrar examen, retorno al lobby. Recorridos clínicos completos en local/CI;
  no se atribuyen a esta prueba pública limitada.

## Implementación y arquitectura

- `clinical/exam-contract.js`: vocabulario ligero de regiones/técnicas/Glasgow,
  compartido por router/UI/puerto y distribuido también en build de core.
- `clinical/physical-exam.js`: observaciones por órgano y registros con UID,
  evento y tiempo. CIRR/APP usan este módulo desde sus políticas existentes.
  La selección no registra; cada técnica solicitada sí registra solo su región.
  Comandos antiguos de técnica completa mantienen compatibilidad.
- `clinical/patient-observations.js`: consciencia, dolor original (CIRR 3/10,
  APP 7/10) y tendencia de presentación calculada sobre signos nativos reales.
  Esta lectura no es motor fisiológico, no trata ni modifica relojes/cierre/XP.
- `ui/examination-panel.js`: silueta interactiva, alternativas de botones,
  técnicas disponibles, resultado observado y registro completo separados.
- `ui/render-content.js`: conserva controles/foco/pulsaciones entre refrescos.
- `ui/clinical-controller.js`: estado de selección/paneles, sin timers ni
  listeners propios. `application.js` conserva un lifecycle/RAF/dispatch únicos.
- `core/speech-router.js`: región/técnica y Glasgow validados; bloquea claves
  heredadas como `constructor` y `__proto__`.

Completar examen exige impresión general y las cuatro técnicas **abdominales**.
Auscultar tórax no completa abdomen; palpar abdomen no revela bazo. Glasgow no
se conoce hasta evaluar componentes; el total permanece incompleto/NT si falta uno.
Cada observación pertenece al paciente/evento correcto. No administra ni acelera fisiología.

## Pruebas y correcciones verificadas

- `npm run test:v5`: **126/126** (incluye ahora pruebas UI del teclado).
- `characterize-exam-native.mjs`: **40 comparaciones** contra extractos efectivos
  del original, incluyendo dolor, tendencia, hipotensión, hipoxemia y taquipnea.
  Se conservan caracterizaciones CIRR/APP de dosis/preparación/fisiología.
- Chromium real: hospital-interactions, navegación desktop/Pixel/landscape,
  teclado/cámara, boot/foco y estudios aprobados. CIRR/APP completos desde UI:
  100/100, 133 XP por caso, sin doble administración ni doble recompensa.
- Regresión histórica `npm test`: exit 0. Builds game/core independientes.
- RED→GREEN: región parcial, órgano correcto, técnicas abdominales, Glasgow
  parcial, identidad/rango, comandos inválidos y dolor original.
- Revisión independiente encontró pérdida de foco/pulsación al reemplazar botones
  cada segundo. Reproducida en Chromium; corregida con nodos estables. E2E mantiene
  foco durante 1.2 s, ejecuta Enter y mantiene pointerdown/refresco/pointerup.
- APP V5 tenía datos positivos de inspección/percusión no presentes en el original.
  Se corrigieron a «Sin hallazgo específico modelado», con pruebas de paridad.

## Dependencias, límites y próximo trabajo

No se importa HTML/integration/QA en runtime ni se usa reemplazo de HTML para
migrar. Se eliminaron tablas duplicadas de examen de las dos políticas y la
importación APP→CIRR para nombres. El arte, navegación, teclado/cámara y fisiología
nativa de ambos casos permanecen como base. No se cambió el golden master.

El sistema de hipoperfusión avanzada/complicaciones de los otros casos sigue
pendiente; no se declara migrado por disponer de Glasgow. La silueta es una UI
clínica, no reemplaza mapa ni sprites. No hay certificación Android físico nueva.
Siguiente: C05.a (informe propio), luego comunicación/anamnesis C06 y enfermería.

## Reproducción y continuación

`npm run test:v5`; `npm run build:v5-core`; `npm run build:v5`;
`node qa/v5/characterize-exam-native.mjs`;
`node qa/v5/hospital-interactions-browser.mjs`; `node qa/v5/cirr-browser.mjs`;
`node qa/v5/app-browser.mjs`; `npm test`.
Chromium/Playwright según `qa/v5/browser-harness.mjs`; ningún path privado es requisito.

UI: Solitario/CIRR → caminar a B1 → tocar paciente → Examen físico → región →
técnica; abrir cabeza para Glasgow. Consultar Historia para el registro obtenido.

Prompt: «Continúa ATRIA 5.0 en `javierdario48-star/ATRIA`, rama exclusiva
`atria-5.0-core-rebuild-experimental`. Verifica HEAD/CI, lee
`docs/migration/{STATUS,CURRENT_HANDOFF,STEP_04_HANDOFF,STEP_05_HANDOFF}.md`.
Conserva el examen anatómico, los controles estables, la autoridad/puerto y los
recorridos CIRR/APP del SHA `6e75b18d26dc1dcd3bf3ffa08af177f20efe01fe` o su sucesor
comprobado. No añadas patologías ni rehagas teclado/cámara/mapa. Sigue el checkpoint
concreto pendiente del CURRENT_HANDOFF, implementa y prueba UI real/CI/histórico,
publica solo experimental y deja traspaso completo con hechos verificados.»
