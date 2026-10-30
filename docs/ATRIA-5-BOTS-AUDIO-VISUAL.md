# ATRIA 5.0 — Bots, audio y marcador

Continuación de `b0c4acc4667ea5deb96e27f7c0c039dc1a43a9c9` en `atria-5.0-core-rebuild-experimental`.

## Cambios de producto

- `8195b5b4860b8037f42ab503288ad1876cae14af`: ganancia exclusiva de música de 1,4 (+2,92 dB), reloj compacto y regresiones de audio/geometría. El master compartido conserva `.68`; el trim relativo del tema conserva `.22`. El crossfade sigue en 2,5 s y el silencio gradual en 250 ms. Las preferencias guardadas mantienen sus valores.
- El checkpoint de certificación conserva el marcador a 121 px en escritorio y 112 px en móvil, más safe area. Con la ruta clínica abierta, reserva espacio lateral en anchos de hasta 600 px. En ventanas horizontales bajas se alinea bajo el reloj a la derecha, dejando libre al paciente y su rueda clínica.
- La prueba CSS anterior no encontraba la regla móvil porque su expresión terminaba en la primera llave del bloque multimedia. Se corrigió su búsqueda y se complementó con medidas reales del navegador.
- Las pruebas del preview verifican los hashes de aplicación, CSS y ambos módulos de audio. No basta con que `application.js` coincida mientras se sirve CSS de otro despliegue.

## Bots funcionales y persistencia

La aceptación de `8195b5b4` se ejecutó sobre el preview real de Vercel con cuentas persistentes y cuatro procesos independientes de Chromium. No se exportaron contraseñas, cookies, tokens ni estados de autenticación.

`qa/v5/authority-presence-preview.mjs` aprobó:

1. Presencia mutua y movimiento sincronizado de dos cuentas en el lobby.
2. Recuperación de los píxeles del avatar tras restaurar su Canvas2D auxiliar.
3. Perfiles verificados, solicitud y aceptación de amistad, conservada al ingresar desde otro dispositivo.
4. Inicio de una cuenta nueva sin guardia previa que finalizar.
5. Rechazo del acceso y de la toma de control por otra cuenta.
6. Un segundo login no roba silenciosamente una guardia activa.
7. Transferencia explícita del control a la misma cuenta autenticada.
8. Recuperación de la guardia abandonada conservando al paciente.
9. Atención y cierre nativo de FECAL-001, con 133 XP y un caso resuelto persistentes.
10. Finalización explícita desde otro dispositivo, rechazo posterior del dispositivo anterior y comienzo de una guardia distinta conservando el progreso.

`qa/v5/guard-entry-preview.mjs` aprobó Aprendiz, Solitario, Cooperativo y Competitivo, con pacientes visibles, respuesta del paciente y controles musicales. También recuperó el mismo paciente después de descartar el recordatorio de una guardia retenida.

`qa/v5/competitive-browser.mjs` aprobó dos procesos independientes, asignación por contacto físico y dos rechazos de acciones de rivales sobre pacientes ajenos.

Las pruebas existentes de CI también aprobaron guardias de 24 horas simuladas, admisiones sucesivas, recuperación de autoridad, cierre cooperativo y XP único. Los contratos y contenidos clínicos no se modificaron.

## Mediciones digitales de audio

El tema original mide aproximadamente −13,3 LUFS integrados y −0,6 dBTP. Su cadena predeterminada era `0,22 × 0,8 × 0,74 × 0,68 = 0,0885632`. La nueva salida musical resulta `0,12398848`, manteniendo la misma proporción entre ambas composiciones.

El render de Web Audio de 20 segundos, antes y después del cambio, obtuvo:

- Tema nuevo, configuración predeterminada: RMS −38,241 → −35,319 dBFS.
- Música clásica, configuración predeterminada: RMS −48,354 → −45,431 dBFS.
- Ganancia medida de ambas composiciones: +2,92256 dB.
- Sonidos clínicos aislados: cambio de 0 dB; pico idéntico de −25,425 dBFS.
- Ocho escenarios de música, controles al máximo y mezclas clínicas: cero muestras recortadas. Pico máximo observado en ese render: −16,238 dBFS.
- El tema completo, con la ganancia final predeterminada, mide aproximadamente −31,5 LUFS y −18,7 dBTP.

RMS dBFS, LUFS y dBTP son mediciones distintas. Las cifras anteriores identifican qué se midió en cada caso.

`qa/v5/audio-browser.mjs` aprobó autoplay estricto, loop real de 164,407 s, cruce de 2,5 s, silencio gradual, recuperación del offset, persistencia, controles en los cuatro modos y limpieza de nodos. En el render del loop, la discontinuidad de la unión fue cero.

## Certificación visual

`qa/v5/guard-score-browser.mjs` comprueba entrada y atención junto al paciente, guardando capturas y rectángulos. Verifica que el marcador quede dentro del viewport, no intercepte pulsaciones y deje libres reloj, HUD, paciente, ruta clínica y botones.

Las vistas de regresión incluyen Android vertical de 393 px, Android vertical de 480 px, Android horizontal de 851 × 393, escritorio de 1280 × 900 e iPhone 13 en Chromium y WebKit. WebKit es obligatorio en CI; una falla al iniciarlo hace fallar la certificación.

Los fallos reproducidos fueron la invasión del reloj sobre el marcador, el cruce con la ruta clínica en pantallas estrechas e intermedias y el cruce con la atención al paciente en horizontal. La regresión final conserva la elevación solicitada y comprueba los espacios disponibles junto al paciente detenido.

## Validación y trazabilidad

- Compilación canónica V5 y verificación de límites arquitectónicos: aprobadas.
- Regresión local de UI, aplicación, render y social: 277 pruebas aprobadas, cero fallidas.
- Regresión focal de audio y posición: 27 pruebas aprobadas, cero fallidas.
- [CI integral de 8195b5b4](https://github.com/javierdario48-star/ATRIA/actions/runs/40977814842): 29 trabajos aprobados.
- [CI de audio de 8195b5b4](https://github.com/javierdario48-star/ATRIA/actions/runs/40977814874): aprobado.
- [CI de aceptación del preview de 8195b5b4](https://github.com/javierdario48-star/ATRIA/actions/runs/40977814867): aprobado.

Un intento de navegador local quedó bloqueado por la restricción de sockets de ese entorno; se utilizó un entorno aislado de Vercel y GitHub Actions. Una ejecución integral duplicada en esa VM se detuvo al confirmarse aprobada la suite íntegra del mismo código en CI.

Las capturas y las pruebas móviles corresponden a emulación. La vista WebKit usa ese motor en Linux con perfil iPhone, no un iPhone físico. Queda pendiente comprobar la escucha con los altavoces reales de Android e iPhone; ninguna medición digital certifica su volumen acústico.
