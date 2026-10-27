# Prompt de continuidad — ATRIA 5.0

Continúa trabajando en `javierdario48-star/ATRIA`, exclusivamente en `atria-5.0-core-rebuild-experimental`. La entrega está en el HEAD que contiene este archivo. Antes de cambiar nada consulta el HEAD remoto y el checkout; no regreses a un hash anterior. El último checkpoint anterior al cierre de esta entrega es `9be8d9a33cb3572604ce0b3fed62cb9efe682d98`; los cambios finales están en su descendiente que incluye este prompt y el informe. Toma el SHA actual de GitHub, no el valor histórico de un chat.

Lee primero `docs/qa/2026-10-27-rpg-results.md` y, si hace falta, `docs/qa/2026-10-27-rpg-progress.md`. No reinicies auditorías, no reconstruyas lo implementado, no copies motores V4 y no repitas los 500 recorridos antiguos para obtener contexto. Si el remoto avanzó, inspecciona sólo la diferencia. No modifiques main, V4 ni las fuentes originales de caracterización clínica. Publica únicamente checkpoints pequeños comprobados, sin pedir confirmación por cada paso.

## Estado publicado

- `257a0a1`: auditoría anterior de 25 casos.
- `bd9b359cb90cace7270d776380cc6fadd5a9d130`: 166 escenarios de mortalidad, 62 muertes nativas, 35 derivaciones, trazas y no resurrección. Conservado, no rehecho. Informe `docs/qa/2026-10-26-mortality-results.md`, evidencia `docs/evidence/c4a/`.
- `375364981105f53c3ed2f7bfe74a1d8a6a3509be`: integración RPG.
- `3fe4583582a8017554284d63c94c3afa92143119`: cercado de dispositivos/liberaciones y renovación.
- `9be8d9a33cb3572604ce0b3fed62cb9efe682d98`: perfiles/invitaciones de invitados y comprobación real del progreso.
- La revisión actual incluye además retirada del puntero de recuperación de la identidad anterior, XP históricos visibles como práctica pendiente y QA de cuentas compartidas. Consulta los checks de ese HEAD para el resultado final, no los fallos ya corregidos de CI anteriores.

## Arquitectura que debes conservar

Un único runtime/clock clínico, supervivencia `src/v5/clinical/survival-487-bridge.js`, tratamientos nativos y progreso acreditado por el servidor. La duración sigue siendo 1440 segundos reales por guardia. No cambies signos/muerte/dosis/XP desde bots ni reduzcas umbrales.

Supabase del proyecto `hugqjejfyyilslbomsgi` (atria-clinical). Auth guarda contraseñas. El cliente sólo conoce perfil público; tokens en cookie Secure HttpOnly SameSite. No publiques secretos ni obtengas claves privilegiadas para incorporarlas al cliente. No reutilices una clave de dispositivo de un actor ya reclamado.

`api/_accounts.js` compone el backend persistente y el transporte social V5 sobre el legado intacto. `api/_core.js` y `api/clinical.js` usan esa identidad. `src/v5/server/account-gateway.js` controla registro/login/perfil, cookies, solicitudes sociales y la generación del publicador. `supabase-account-store.js` es el adaptador privado. `postgres-guard-store.js` liga el CAS a actor/sesión. `clinical-http.js`, `durable-guard-authority.js` y `clinical/guard-runtime.js` siguen siendo la única ruta de ejecución clínica para cuentas, incluidos Solitario y Aprendiz.

El CAS verifica y bloquea cuenta/controlador en su propia transacción. `atria_v5_released_guards` impide que una solicitud en curso vuelva a activar una guardia abandonada. Al salir, el cliente dispone la réplica, espera su solicitud y después libera. Otra sesión puede consultar amigos/perfil, pero debe recuperar control explícitamente. Un login secundario no desplaza la presencia del controlador.

Migraciones ya aplicadas y versionadas, no repetir:
- `20261027043549_atria_v5_persistent_accounts.sql`
- `20261027045128_atria_v5_claimed_guard_fencing.sql`
- `20261027_atria_v5_controller_atomic_fence.sql`
- `20261027_atria_v5_release_fencing.sql`

No concedas escrituras ni RPC de progreso a anon/authenticated. El RPC de recompensa sólo acepta actor/guardia y valida cierres/muertes ya guardados; nunca acepta XP del navegador. Se conserva el actor derivado y los amigos. El historial puramente local está archivado sin confianza y visible en el perfil propio; no inventes una verificación que no existe.

## Propietarios visuales

- `social/account-client.js`, `social/cooperative-link.js` y `app/application.js`: integración de cuenta y recuperación. Cuenta adoptada retira el puntero de sala anterior.
- `social/room-membership-store.js`: membresía y perfil de invitados sin cambiar V4.
- `ui/player-profile-card.js`: tarjeta compacta, avatar, estadísticas verificadas, amistad, eliminación e invitación con caso. Pacientes/objetos clínicos tienen prioridad en los taps.
- `engine/movement-progression.js` + `app/world.js`: velocidad `205*(1+.24*(L-1)/(L+24))`, límite +24 %, nivel del servidor, navegación/interpolación originales. No agregues otro controlador.
- `render/avatar-palette.js`, `ui/avatar-creator.js`, `render/hospital.js`: una paleta navy compartida. El recurso masculino original navy era negro; se conserva como negro y se transforma sólo la tela verde en azul. No modificar los hashes originales V4.
- `ui/hospital-audio.js`: único AudioContext, default .74 para nuevos perfiles, preferencias existentes intactas, ecos finitos de 90/180ms atenuados; no archivos de Pokémon.
- El examen físico sigue exclusivamente en su panel, conservando todos sus eventos clínicos internos.

## Evidencia que no debes rehacer

`docs/evidence/rpg/accounts-preview.json`: dos registros reales, amistad anterior, cookies seguras, clave vieja rechazada, apariencia entre dispositivos, permisos, takeover, recuperación, liberación, renovación y logout. Se completó FECAL con reloj real: 133 XP y un caso, conservados en otra sesión, sin premio repetido; PostgreSQL confirmó un recibo único.

`docs/evidence/rpg/accounts-shared-preview.json`: dos cuentas reales entraron en Cooperativo y Competitivo, éste con dos pacientes. Tarjeta en vertical/horizontal y movimiento remoto con máximo salto 3,7884 px. No fue un teléfono físico.

Pruebas principales: baseline2258; CI de9be2276; último conjunto focalizado104; compilaciones V5/core y auditoría134 módulos aprobadas. Navegación escritorio/Pixel/landscape, EF móvil, competitivo de cuatro navegadores y cooperativo durable de cuatro con recuperación del anfitrión pasaron. La CI de la entrega añade la regresión del puntero de cuenta; consulta el total exacto del HEAD actual.

El bot `qa/v5/cooperative-ui.mjs` conserva destinos y llegada autoritativa, pero cierra únicamente la tarjeta social que abre cuando otro médico ocupa el waypoint. No eliminar ese paso ni cerrar diálogos clínicos arbitrariamente para pasar pruebas. Un CI anterior detectó justamente esa nueva interacción; el recorrido de cuatro médicos pasó tras esa adaptación.

Para una comprobación concreta usa `npm run build:v5`, `npm run build:v5-core`, `node scripts/audit-v5-boundary.mjs` y las pruebas afectadas. `npm run test:v5` y los checks remotos cubren la regresión completa cuando cambia el motor. No debilites pruebas.

Los recorridos WAN son `qa/v5/accounts-preview.mjs` y `accounts-shared-preview.mjs`; los secretos de cuentas QA se generan/leen sólo desde scratch privado, nunca son artefactos ni logs. No reutilices cuentas reales del usuario ni muestres claves. Verifica siempre que las cuentas sean QA antes de prepararlas o limpiarlas.

## Límites y siguiente acción

No hay recuperación de contraseña por correo. Supabase tiene desactivada la protección opcional de contraseñas filtradas; quedó documentada, sin cambiar plan/facturación. Validación móvil por emulación; audio requiere valoración subjetiva del usuario. No prometas que el XP exclusivamente local se convirtió en XP autorizado.

Revisa el HEAD y sus checks finales, conserva el checkpoint estable y atiende una observación concreta del usuario con una regresión pequeña. Si no hay defecto nuevo, la siguiente acción es la prueba manual del usuario con su identidad y sus dispositivos; no iniciar otra auditoría general.
