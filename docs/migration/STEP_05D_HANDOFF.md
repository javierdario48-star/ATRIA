# ATRIA 5.0 — C05.d — ECG dinámico y órdenes dentro del monitor

## 1. Identidad y punto de partida

- Repositorio: `javierdario48-star/ATRIA`; **única rama modificada**: `atria-5.0-core-rebuild-experimental`.
- SHA inicial comprobado: `ce829f29837fde923e39f181fc010a26eebf370a`, CI [38855005951](https://github.com/javierdario48-star/ATRIA/actions/runs/38855005951) final success 3/3.
- Último SHA funcional/QA anterior a la documentación de este checkpoint: `aa344f7affedc50de145076130670b1c22b3d258`. **No suponer que es el HEAD actual**: confirmar branch ref y CI al retomar.
- CI del último SHA código: consultar corrida asociada por la rama. La prueba intermedia [38856749587](https://github.com/javierdario48-star/ATRIA/actions/runs/38856749587) verificó los contratos del núcleo; revisar terminación de navegador, caso APP/CIRR, comparación mapa y regresión histórica. La CI del SHA documental será distinta y se verifica separadamente.

## 2. Qué se implementó realmente

- `src/v5/clinical/ecg-morphology.js`: catálogo puro de 8 morfologías didácticas: sinus, sinus_tachycardia, sinus_bradycardia, atrial_fibrillation (RR variable determinista), ventricular_tachycardia (QRS ancho), ventricular_fibrillation (trazo caótico), asystole (plano), st_elevation (segmento ST elevado). Generador vectorial P-QRS-T muestreado con ritmo y FC, `ecgPath`, integración `advanceEcgPhase`. Sin segundo motor de fisiología ni acción clínica: no diagnostica ni trata.
- Solo `patient.ecg.rhythm` **explícito, validado por `initialCaseEcg(c)`** activa morfologías patológicas. Se incorporó la semilla opcional de caso en `src/v5/clinical/{cirr-care,app-care}.js`. Los casos CIRR/APP originales no contienen campo ECG patológico: muestran modelo sinusal; no se introdujeron nuevos casos ni diagnósticos ficticios. El campo queda disponible para futuras reglas clínicas con test propio.
- `src/v5/ui/clinical-panels.js`: mantiene diseño de monitor bedside, sustituyendo un path SVG fijo por `#monitorEcgPath` real, reconociendo conexiones, mediciones conocidas, paciente cerrado y morfología explícita. Si no hay medición o monitor conectado, no inventa FC ni ECG. El monitor desconectado conserva la última medición puntual, sin señal continua.
- `src/v5/ui/clinical-controller.js`: `animate(now)` desde el RAF de la app, sin timer paralelo; calcula la señal a partir de FC *medida y autorizada* y una fase integrada para no saltar al modificarse por la fisiología real. Render del cuadro clínico sigue consumiendo únicamente snapshots. El ECG es simulación educativa de una derivación; **no es ECG de 12 derivaciones ni fuente de un diagnóstico electrocardiográfico**.
- `src/v5/ui/monitor-order-suggestions.js`: asistencia de órdenes por *caso y frases validadas* con búsqueda insensible a acentos, sugerencias, botón Pistas y autocompletado; devuelve ejemplos, nunca ejecuta. CIRR (sodio, espironolactona 100 mg, paracentesis) y APP (vías, monitor, Ringer 500 ml, ceftriaxona 1 g, metronidazol 500 mg, ayuno y consulta) como dos contratos de referencia, no catálogo universal de terapias. Los ejemplos aún requieren autorización del mismo router.
- `src/v5/ui/clinical-controller.js`: un campo para indicar tratamientos en el propio monitor, con feedback `pending/executed/rejected` proveniente del recibo clínico; nada se marca administrado por autocomplete. `src/v5/app/application.js` delega `input`, Enter y animación por el ciclo de vida ya existente.
- `src/v5/web/game.css`: panel compacto de indicaciones integrado sin ventanas anidadas; se preservan menú contextual, teclado ATRIA, cámara y mapa.

## 3. Fisiología real que SÍ existe

En `src/v5/clinical/native-app.js`, administración real de `fluid` inicia una respuesta nativa con objetivos sys +14 mmHg, dia +7 mmHg, hr -12 lpm, rr -1 rpm, acercamiento dinámico limitado por `advanceAppVitals`. Ceftriaxona y metronidazol **no** poseen cambios agudos inventados de signos en APP. En `native-cirr.js`, `paracentesis_ter` reduce objetivo de FC 3 lpm y FR 2 rpm; espironolactona y restricción de sodio sin cinética aguda modelada. El monitor conectado recibe mediciones de `refreshMonitoring`; no salta signos por abrir UI. Fuera de CIRR/APP no se considera migrado el motor clínico, ritmos patológicos ni terapéutica específica.

## 4. QA y regresión

- `src/v5/clinical/ecg-morphology.test.js`: morfologías, FC↔R-R, AF irregular, asystole plana, VF, diferencia ST, prohibición de inferir patologías por signos, configuración explícita del caso, integridad y fase acumulada.
- `src/v5/ui/bedside-presentation.test.js`: ausencia de filtración de signos/ECG, datos puntuales vs monitor conectado, autocomplete por caso (sin acciones al seleccionar), respuesta física de APP tras fluidos y cambio de frecuencia del ECG.
- `qa/v5/hospital-interactions-browser.mjs`: se extendió para demostrar path ECG cambia entre cuadros, sugerencia de espironolactona no administra, Pistas accesibles, orden de paracentesis cursada desde **el monitor** y transición a intervenciones en el motor real, más examen y tap de monitor B1.
- Verificar `npm run test:v5`, `npm run build:v5`, `node qa/v5/hospital-interactions-browser.mjs`, CIRR/APP completos, regresión 4.8.7 y CI 3/3 sin omisiones.
- Incidente de QA: se introdujo accidentalmente un literal de regex mal escapado en el nuevo browser test; corregido en `f036e36172167c13a11d8376551096f6ad191650`. El error era de compilación del test, no de lógica del juego. No bajar aserciones de ejecución clínica.

## 5. Pendiente y decisiones de cuidado

- El ECG actual representa morfologías **educativas**, no un ECG diagnóstico real multiderivación; no simula isquemia ni arritmias espontáneas de CIRR/APP. El catálogo es una interfaz preparada; la activación en casos futuros exige reglas de enfermedad, temporalidad, fisiología y pruebas específicas. No inferir STEMI, asistolia, FA o TV desde taquicardia, fiebre o shock.
- No se implementó maquinaria de enfermería caminando, DEA, tratamientos antiarrítmicos, desfibrilación ni el resto de casos. C07/C08, Vega, voz y multiplayer continúan según plan.
- Las pruebas de CI Chromium emulado no equivalen a prueba física Android: pedir validación de UI móvil.
- Campo de búsqueda del monitor es input HTML estándar; evaluar en Android real interacción con teclado del sistema y teclado ATRIA; no crear otro teclado privado sin revisión.

## 6. Instrucción para próximo agente

> Continúa ATRIA 5.0 en `javierdario48-star/ATRIA`, `atria-5.0-core-rebuild-experimental`. Lee `docs/migration/CURRENT_HANDOFF.md`, `STATUS.md`, `STEP_05D_HANDOFF.md` y plan maestro. Confirma HEAD/CI/preview. C05.d añadió ECG dinámico sincronizado con FC observada y patrones explícitos, búsqueda de tratamientos con autocomplete/pistas sobre monitor. Código anterior a documentación `aa344f7affedc50de145076130670b1c22b3d258`. **Verifica que el último código tiene CI 3/3 aprobada**; si falla, corrige la causa real sin silenciar pruebas. Ningún nuevo caso permitido. Preserva CIRR/APP, monitor con mediciones solo conocidas, fase/FC, autoridad de enfermería, teclado/cámara, examen y chat. Próximo trabajo es completar C07/C08 sin motores paralelos; dejar nuevo STEP_NN_HANDOFF, STATUS y CURRENT_HANDOFF. No declarar ECG diagnóstico o ritmos inducidos cuando son solo morfologías configurables.
