# Bienvenida RPG y nombre de médico — 27 de octubre de 2026

Implementación sobre el HEAD remoto `4fa60b9`, exclusivamente en la rama experimental. Checkpoints: `63ad1fd` (nombres/cuentas), `3ea2ffe` (bienvenida e ilustración), `424de68` (sesiones revocadas). El checkpoint que contiene este informe añade la evidencia y corrige la coordinación de los bots; conserva los mismos módulos de producción que `424de68`.

## Resultado funcional

- Primera visita: nombre natural → disponibilidad real → selector original de sexo/ambo → contraseña de al menos 12 caracteres → hospital.
- Regreso: cuenta autenticada, ilustración y botón Continuar; sin entrada automática. Una sesión vencida requiere autenticación. «Recordar» controla realmente la persistencia de la cookie HttpOnly Secure.
- Otro dispositivo: nombre de médico y contraseña recuperan el mismo actor y su apariencia/progreso. Cambiar o crear cuentas conserva separadas las relaciones y guardias.
- La transición usa la carga real de cuenta/presencia y el renderer original del hospital. No se añadieron cámara, reloj, controlador de movimiento ni motor clínico.
- La imagen adjunta es el recurso real `src/v5/content/assets/welcome-doctors.webp` (1536×1024, WebP sin pérdida). Se editaron sólo las dos zonas superiores de los globos; se conservaron los píxeles visibles fuera de esas zonas, las proporciones y los personajes originales. Se reutilizó el monograma y la marca ATRIA existentes.

## Autoridad y migración

Supabase mantiene el mismo actor permanente. Un único espacio de nombres normaliza mayúsculas, espacios y tildes; una restricción y un trigger reservan el nombre atómicamente. Los accesos antiguos se reservan antes de los nombres visibles. Los nombres anteriores ambiguos no se reasignan: siguen usando su acceso original, explicado en la bienvenida, y pueden elegir un nombre único desde Perfil.

Migraciones aplicadas: `20261027211319_atria_v5_character_names` y `20261027212227_atria_v5_login_aliases`; fuentes versionadas en `docs/migration/`. Las ocho cuentas anteriores conservaron sus 590 XP y cuatro casos, sin alias perdidos. Se mantuvo RLS y no se concedieron permisos de XP al cliente. Registro concurrente real: exactamente un 200 y un 409; PostgreSQL confirmó un propietario y ninguna identidad Auth huérfana.

Se reprodujo un error real: Supabase devolvía 403 por una sesión revocada y el adaptador lo convertía a 400. Ahora se traduce a 401, se elimina la cookie y vuelve la bienvenida. Las indisponibilidades 503 siguen siendo reintentables.

## Verificación

[Evidencia sin credenciales](../evidence/welcome/acceptance.json). Las pruebas reales se completaron por etapas para reutilizar las cuentas después de encontrar el error de sesión; no se repitió la carrera de registro. Las contraseñas de esas cuentas de QA se rotaron para continuar; no se tocaron credenciales de jugadores.

- Registro completo en preview, dos sesiones independientes, mayúsculas/tildes equivalentes, cookie con/sin persistencia, cierre y reapertura real de Chromium, amistad y apariencia compartidas.
- Cierre de sesión, rechazo de la cookie anterior, nueva autenticación y recuperación del mismo paciente/guardia. Creación de otro médico con otro actor, cero XP y cero amigos.
- Cuenta anterior con nombre visible ambiguo: acceso original operativo, 457 XP, nivel 3 y tres casos conservados. Un payload con XP/nivel inventados no alteró el saldo.
- Dos cuentas entraron desde la bienvenida al lobby y aceptaron una invitación cooperativa real: mismo paciente, guardia y miembros en Supabase; apariencia persistente conservada.
- Navegador local: escritorio, vertical, horizontal y altura reducida por teclado; sin errores de página. La CI incorpora este recorrido con el gateway real y un backend de fixture explícito. Las pruebas clínicas históricas conservan su instalación de práctica local.
- 2309/2309 pruebas V5 en la primera integración; después se añadieron pruebas focalizadas de renovación, sesiones vencidas y errores Auth. 40/40 core, `build:v5`, `build:v5-core` y auditoría de límites aprobados; 136 módulos de producción y un RAF.
- Equipos durables de tres y cuatro navegadores: recuperación del anfitrión, dos administraciones confirmadas y siete/ocho mensajes, respectivamente.

Se corrigió el bot de navegación: sus offsets de 18/20 px enviaban a varios médicos a la misma baldosa. Ahora usa cuatro baldosas transitables distintas, manteniendo entrada física, llegada autoritativa y los límites de proximidad. La prueba de movimiento remoto espera el mismo límite espacial que ya exigía, en lugar de leer antes del siguiente paquete de presencia. No se cambió la fisiología ni el movimiento para hacer pasar bots.

Se observaron timeouts RTC en CI. Una comprobación focalizada del cliente anterior `4fa60b9` reprodujo el mismo fallo; el Chromium local no produjo candidatos ICE, incluso sin STUN. No se atribuye una causa al runner remoto sin evidencia. El resultado final debe consultarse en [la CI del HEAD experimental](https://github.com/javierdario48-star/ATRIA/actions?query=branch%3Aatria-5.0-core-rebuild-experimental); no confundir intentos anteriores con el último resultado.

Validación móvil por emulación; no hubo teléfono físico. No se repitieron los 500 recorridos históricos ni la auditoría de mortalidad para esta entrega.
