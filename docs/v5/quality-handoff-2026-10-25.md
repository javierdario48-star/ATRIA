# ATRIA V5 — QA de arquitectura y concurrencia (25-10-2026)

Rama: `atria-5.0-core-rebuild-experimental`. Este documento describe un
checkpoint experimental, **no autoriza promover a `main`**.

## Límites de módulo preservados

- `src/v5/ui/chat-transcript.js`: único propietario del DOM y del historial
  visual del chat. Recibe mensajes que la aplicación ya filtró; no determina
  distancias, destinos, diagnóstico, terapia, XP ni autoridad.
- `src/v5/ui/spatial-ward-speech.js`: alcance acústico y obstáculos del mapa.
  Nunca interpreta órdenes ni crea asignaciones.
- `src/v5/app/reception-assignment.js`: intención temporal de caminar hacia
  una cama. Sólo solicita `claim` al arribar y espera el recibo del servidor.
- `src/v5/clinical/guard-runtime.js`: instancia autoritativa por guardia,
  sesión clínica independiente por paciente y exclusividad del competitivo.
- `src/v5/server/durable-guard-authority.js`: compare-and-swap, leases
  durables y deduplicación de eventos. No copiarlo al navegador ni implementar
  otro árbitro.
- `src/v5/social/cooperative-link.js`: canal social, presencia, invitaciones
  y transporte visual. No administra fármacos.

## Pruebas añadidas

`src/v5/ui/chat-transcript.test.js` comprueba texto seguro, límite de historial,
roles visuales y vistas previas sin crear entradas clínicas.

`src/v5/server/concurrency-load.test.js` ejecuta:

1. 320 identidades autenticadas simultáneas en el coordinador de lobby,
   1600 movimientos, 32 reingresos, exclusión de secuencias antiguas y
   expiración por barrido diferido en la siguiente mutación.
2. 2, 4, 8 y 16 instancias de autoridad compitiendo por el mismo ID de
   comando. El almacenamiento SQLite usa una sola escritura confirmada por
   ronda; errores `busy` y `fenced` se tratan como conflictos recuperables,
   no como una autorización alternativa.

Las cifras de tiempo corresponden a Node/SQLite **en el runner de CI**. NO son
resultados de carga del servidor Vercel ni representan cientos de conexiones
RTC reales. Una guardia individual sigue limitada a 2–4 médicos.

## Puertas de aceptación

- `npm run test:v5`: cada prueba debe estar verde.
- Los **21 trabajos del workflow V5** deben concluir en verde en el SHA final.
  No confundir `Vercel READY` con aprobación de las interacciones.
- La regresión histórica V4 debe pasar sin modificar archivos de V4.
- CI con Chromium por separado para 2/3/4 médicos, y caso de salida +
  reinvitación de invitado.
- Control manual pendiente: dos dispositivos físicos, misma URL nueva,
  identidades diferentes, lobby mutuo, asignación desde recepción, conversación
  aislada por paredes, salida/reingreso, segundo caso y permanencia prolongada.
  Sin disponer de esos dispositivos no afirmar validación física.

## Observación aún no cerrada

La ejecución V5 `40185703739` detectó una conexión `connecting` de
WebRTC histórico en la **segunda sala** de la prueba
`real-cooperative-team-browser (3)`, mientras el host y otro invitado estaban
dentro de la guardia. La clínica persistente y el test de CAS tienen ruta
separada. No tapar el fallo ampliando timeouts indiscriminadamente, saltando
aceptación o creando un segundo motor. Para investigarlo, recoger estado
SDP/ICE, cambio de generación de sala y logs de señalización en los dos
extremos; sólo después modificar el propietario real del transporte.

## Próximos cambios seguros

1. Verificar que la segunda entrada WebRTC abandona realmente la generación
   anterior y no consume SDP viejo del relay de señalización.
2. Probar ese fallo con 3 clientes antes de ajustar la política única
   `peer-recovery-policy.js`.
3. Extraer gradualmente presentación de conversaciones y coordinación
   de admisión de `application.js`, siempre en un único checkpoint por bloque.
