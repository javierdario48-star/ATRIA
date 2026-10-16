# ATRIA 5.0 — C05.c — Menú contextual sobre el paciente y monitor de cabecera

**Alcance:** migración de presentación e interacción del hospital con referencia al ATRIA anterior. **C05 sigue parcial**: no implica ECG diagnóstico, sistema de monitorización fisiológica adicional ni tratamientos nuevos.

## 1. Recuperación

- Repositorio `javierdario48-star/ATRIA`; rama exclusiva `atria-5.0-core-rebuild-experimental`.
- HEAD previo a esta sesión: `90a426d1121ce34d5bfdd0c9b04c1e4ed7a5edd8`. [Su CI 38852518386](https://github.com/javierdario48-star/ATRIA/actions/runs/38852518386) estaba terminada success 3/3 al iniciar.
- SHA de **último cambio ejecutable/QA en C05.c+C07.b** antes de publicar documentación: `1949d67ed716d08a6618e469a1278b4001f9416d`. Verificar HEAD actual en GitHub; los informes son sucesores.
- La referencia proporcionada por el usuario consta de dos capturas: monitor digital antiguo con números/ondas; menú circular de acciones sobre el personaje en B1. No son especificaciones pixel-perfect. Se reutilizaron conceptos y ritmo, no código histórico de capas UI.

## 2. Cambios funcionales

- `src/v5/ui/patient-actions.js` NUEVO: menú de seis acciones visibles sobre el mundo (Hablar, Examinar, Historia, Estudios, Tratamiento, Resolver). Cada botón delega a los componentes y autoridad ya existentes. El menú conoce solo UID/coordenadas del paciente, nunca toca fisiología, estudios o tratamiento. No crea listeners ni timers propios.
- `src/v5/web/index.html`: un host semántico `nav#patientWheel` encima del canvas; no añade otro dialog ni otra aplicación.
- `src/v5/app/application.js`: el toque sobre un paciente valida la entidad espacial y muestra el menú, no un modal administrativo; recalcula su posición tras cada render usando `renderer.screen` y el área disponible entre HUD y chat/teclado. Toque sobre monitor continúa abriendo un monitor de cabecera. El toque en el mapa fuera del menú lo cierra. Esc, entrada a guardia/lobby, abrir paneles y dispose lo ocultan. Un único listener de delegación gestionado por el lifecycle.
- `src/v5/ui/clinical-controller.js`: `openSection(patient,section)` vincula cada opción al paciente y a los métodos de UI existentes; los comandos clínicos siguen pasando por la misma `guard-session`, autoridad y puerto nativo. `showPatient` conserva el acceso clásico desde HUD y para la pantalla de resolución/dx. `showMonitor` recibe un layout de dispositivo separado del resto.
- `src/v5/ui/clinical-panels.js`: `monitorHTML` presenta FC, SpO2, PA, FR, temperatura, estado conectado/desconectado/atención cerrada y trazo **explícitamente ilustrativo y no diagnóstico**. Solo se muestran `lastVitalsKnown`; abrir o conectar el panel no genera nuevas cinéticas ni revela signos privados. Al cerrar el caso el trazo deja de mostrarse; ECG real queda pendiente.
- `src/v5/web/game.css`: menús circulares pequeños, botón/icono táctil, pantalla de monitor con lecturas tipo instrumento e indicadores; sin añadir más ventanas administrativas.

## 3. Aceptación y pruebas

- `src/v5/ui/bedside-presentation.test.js`: monitor sin mediciones no revela PA/FC/temperatura ni trazo; medición puntual no equivale a conexión; conexión/fin cambian semántica; destinos de menú reutilizan seis interfaces conocidas.
- `qa/v5/hospital-interactions-browser.mjs`: toque sobre pantalla real de monitor B1 muestra dialog específico con UID correcto y mediciones reconocidas; toque del paciente muestra **patientWheel sin modal**, examen físico mediante botón circular; historia/Glasgow/lecturas y rotación siguen conectados. Guarda evidencia `contextual-patient-wheel.png`, `bedside-monitor.png`.
- Regresión del juego intacta requerida: teclado ATRIA/posición de cámara/ambo, CIRR y APP 100/100+XP único, estudios, diálogo, física del reloj, regresión histórica. CI del código `1949d67`: [38854505822](https://github.com/javierdario48-star/ATRIA/actions/runs/38854505822); comprobar tres jobs concluídos antes de declararlo aprobado. Si un test falla, corregir con evidencia sin cambiar reglas clínicas ni desactivar suite.
- Cambios C07.b en la misma sesión: solo prueba ampliada en `src/v5/clinical/app-care.test.js` para orden compuesta dos vías + monitor + Ringer 500 ml + ceftriaxona 1 g + metronidazol 500 mg y comprobantes separados a .8/1.5 s. No acredita enfermería física C08.

## 4. Decisiones arquitectónicas y límites

- La proyección de mundo para el menú no utiliza coordenadas CSS como identidad clínica. El UID procede de `world.interactionAt`; la cámara solo proyecta presentación.
- Los modales permanecen para herramientas que necesitan espacio: examen anatómico, historia y tratamiento. La acción inicial ya no cubre todo el mundo.
- El monitor ilustra una señal pulsátil **sin atribuir ritmo, diagnóstico electrocardiográfico ni ondas reales**. C05 ECG/controles históricos completos sigue pendiente.
- No se migraron tareas físicas de enfermería, voz, tutor Vega, multipaciente, multijugador o nuevos casos. Se conservan CIRR/APP y la política específica de farmacología.
- No hay prueba nueva en Android físico; la CI de navegador representa Chromium con emulación Pixel 5. Una preview READY no acredita intervención manual.

## 5. Próxima misión

1. Confirmar CI y preview del SHA funcional antes de validar C05.c. Probar en Android real apertura del menú junto al paciente y en B1, y que el teclado no tape botones.
2. Completar C07 scanner de órdenes combinadas, negaciones/dosis/rutas y mensajes fiables; C07.a ya rechazó reutilización de dosis inválidas, C07.b caracteriza combinación existente. Mantener un solo ejecutor.
3. Diseñar/ejecutar C08 auténtica sin mentir sobre IV instantánea: modelar trabajo físico de enfermera, dependencias y recepción nativa ligada al paciente, con pruebas de ruta y transiciones. Reutilizar el mismo motor del mundo y autoridad, no crear paralelo.
4. Continuar C09 Vega, voz, etc. No introducir los once casos diferidos.

## 6. Prompt autosuficiente

Continúa ATRIA 5.0 en `javierdario48-star/ATRIA` solo rama `atria-5.0-core-rebuild-experimental`. Lee `docs/migration/{CURRENT_HANDOFF,STATUS,STEP_05C_HANDOFF,STEP_07_HANDOFF}.md` y plan maestro. Confirma HEAD/CI y preview exactos. El último código anterior al cierre documental es `1949d67ed716d08a6618e469a1278b4001f9416d`. El paciente ahora abre un menú circular anclado al mundo; los monitores muestran datos conocidos en una UI de instrumento y solo un trazo ilustrativo, nunca un ECG inventado. C07.b añadió prueba para cinco tipos de intervención/6 efectos con una sola orden. Conserva mapa, sprites, teclado propio, cámara estable, CIRR/APP y recibos de dosis. El siguiente trabajo es C07/C08 completo con caracterización de 4.8.7 y navegador real, sin nuevos casos. Actualiza informes, STATUS y CURRENT_HANDOFF con SHAs/CI y lo que quede sin publicar. Nunca declares sistemas completos ni prueba Android físico sin evidencia.
