# ATRIA 5.0 — cuentas persistentes y experiencia RPG

Entrega del 27 de octubre de 2026, exclusivamente en `atria-5.0-core-rebuild-experimental`. El HEAD de entrega es la revisión que contiene este informe; comprobarlo en [la rama](https://github.com/javierdario48-star/ATRIA/tree/atria-5.0-core-rebuild-experimental). No se modificaron main, V4 ni las fuentes originales de caracterización.

## Continuidad y mortalidad

Se retomó `bd9b359cb90cace7270d776380cc6fadd5a9d130`, posterior a `257a0a1`. El checkpoint de mortalidad ya publicado conserva 166 escenarios, 62 muertes nativas confirmadas, 35 derivaciones indicadas y las comprobaciones de recuperación sin resurrección. No se repitió esa batería ni la auditoría de 500 recorridos para reconstruir trabajo.

La evidencia y la tabla completa por escenario siguen en [el informe de mortalidad](2026-10-26-mortality-results.md), con [resultados JSON](../evidence/c4a/mortality-regression.json) y trazas comprimidas. Sus resultados son del videojuego:

- El abandono produjo muerte en peritonitis secundaria, PBE, terciaria, colangitis y hemorragia variceal. HDA, hemorragia baja, pancreatitis e isquemia mesentérica se deterioraron sin alcanzar los umbrales fatales en esa ventana; sobrevivir a la observación no equivale a curación.
- La heparina realmente administrada en las tres hemorragias agravó el cuadro respecto del control y produjo colapso. La unidad es el protocolo nativo, sin inventar una dosis en unidades clínicas.
- Morfina 30 mg repetida y 20 bolos de Ringer de 500 ml produjeron hipoxemia fatal en los escenarios documentados. La variante explícita de alergia grave a ceftriaxona produjo reacción y colapso.
- Furosemida 40 mg repetida en hipovolemia y gentamicina repetida con riesgo renal produjeron daño, pero no se les atribuye una diferencia de mortalidad que no ocurrió respecto del control.
- Noradrenalina 1 µg/kg/min causó respuesta presora excesiva documentada sin muerte automática. Su daño conserva el propietario original.
- El rescate de toxicidad opioide con oxígeno, volumen y suspensión de opioides sobrevivió; el soporte tardío de peritonitis demoró la muerte sin reemplazar el control del foco. Los controles competentes completaron las derivaciones indicadas.

No se cambiaron los umbrales de muerte ni se añadió otro motor de supervivencia.

## Implementación

**Identidad.** Supabase Auth maneja las contraseñas. El servidor entrega una cookie Secure, HttpOnly y SameSite; el navegador no recibe tokens de acceso/renovación en JSON ni guarda contraseñas. Se verifican el usuario y la vigencia real de `auth.sessions`. Una renovación exitosa se conserva incluso si falla después una consulta de perfil o progreso. Registro e inicio tienen límites de intentos.

**Migración.** La posesión de la clave del dispositivo permite reclamar únicamente su actor derivado. Se conservan identificador, amigos, solicitudes y apariencia. Después del reclamo se rechazan las claves y tokens sociales antiguos. Las dos migraciones ya aplicadas por el chat anterior se recuperaron de Supabase y quedaron versionadas en `docs/migration`.

Los cierres y penalizaciones respaldados por la autoridad durable se proyectan una sola vez a la cuenta. El historial exclusivamente local permanece archivado y visible como XP de práctica pendiente de verificación; no se convierte en nivel autorizado usando cifras enviadas por el navegador. No se borró ese historial del dispositivo.

**Guardias y dispositivos.** Solitario y Aprendiz con cuenta reutilizan el mismo runtime y CAS de Cooperativo/Competitivo. Todas las guardias de cuenta tienen autoridad del servidor. Cada cuenta tiene un controlador clínico por guardia; otro dispositivo puede consultar su identidad y amigos. Recuperar el control es una acción explícita. El CAS valida al controlador dentro de la transacción y también cerca el cierre de participación: una solicitud antigua no puede reactivar una guardia liberada. Cambiar de cuenta retira el puntero de recuperación del antiguo dispositivo.

La presencia usa una generación del servidor. Otro ingreso no puede retirar la presencia ni romper la señalización del controlador activo. La misma validación se aplica a `/api/lobby-sync` y a la ruta anterior `/api/lobby/state`.

**Perfil social.** Al tocar un médico se abre una tarjeta con avatar, nombre, nivel, XP, casos, amigos y estado real. Permite amistad, aceptación, eliminación e invitación con selección de caso. El perfil propio está en Perfil → Ver perfil social. Los invitados anteriores conservan amistad e invitaciones; sus cifras locales no se presentan como estadísticas verificadas. Los objetos/pacientes clínicos tienen prioridad sobre otro avatar en guardia. El mentor comparte ahora su posición autoritativa en Aprendiz.

**Movimiento.** Se conserva la navegación, las colisiones barridas, animación por distancia y los mecanismos de interpolación existentes. El principio de recompensa por nivel se contrastó con [el manual oficial de Tibia](https://www.tibia.com/gameguides/?section=characters&subtopic=manual); la fórmula de ATRIA es propia:

`v(L) = 205 × (1 + 0,24 × (L − 1) / (L + 24))` píxeles/s.

| Nivel | Velocidad | Mejora |
|---|---:|---:|
| 1 | 205,00 | 0 % |
| 5 | 211,79 | 3,31 % |
| 10 | 218,02 | 6,35 % |
| 20 | 226,25 | 10,36 % |
| 50 | 237,58 | 15,89 % |
| 100 | 244,28 | 19,16 % |

La curva se aproxima a +24 %, sin progresión lineal ilimitada. El servidor deriva el nivel del XP verificado; editar el payload no otorga velocidad clínica. Las pruebas cubren 30/60/120 Hz, colisiones y recuperación de rutas con 2/3/4 médicos. Los niveles altos se verificaron como fixtures autoritativos, sin fabricar XP en cuentas reales.

**Ambo azul.** El recurso masculino navy era idéntico al negro. Se conserva el original y se aplica una única paleta azul al recurso verde existente, compartida por creador, render del hospital y tarjeta. Se preservan piel, máscara, detalles, contornos y transparencia. Negro y los demás colores mantienen sus recursos. La apariencia queda en la cuenta y en la presencia verificada.

**Audio.** El valor inicial pasa de 0,62 a 0,74. Las preferencias guardadas permanecen exactas. Los menús tienen dos ecos finitos atenuados, de 90 y 180 ms, sin realimentación ni un segundo AudioContext. Un nuevo gesto retira el efecto anterior. Se conservan silenciamiento, canales y desbloqueo por gesto móvil. No se usaron archivos de Pokémon.

**Examen físico.** Se mantuvo la corrección existente. La prueba real de navegador verificó panel anatómico, maniobras, Glasgow, proximidad, rotación y evidencia clínica conservada, sin resultados en chat ni globos de enfermería. Los mensajes de enfermería para estudios y medicamentos continúan funcionando.

## Pruebas y evidencia

- Baseline recuperada: 2258/2258 pruebas V5.
- CI de `9be8d9a33cb3572604ce0b3fed62cb9efe682d98`: 2276/2276 pruebas V5; las pruebas históricas y los 25 paneles originales se mantuvieron.
- Última comprobación local de esta entrega: 104/104 pruebas focalizadas, compilaciones V5/core y auditoría de límites correctas: 134 módulos, un RAF, sin temporizadores ni ejecutores clínicos nuevos en UI.
- Navegación real: escritorio, Pixel emulado vertical y horizontal; cinco entradas/salidas por dispositivo y limpieza de listeners/RAF.
- Examen físico móvil: pasó en ambas orientaciones, con evidencia interna preservada y sin mensajes visibles duplicados.
- Competitivo: cuatro navegadores independientes pasaron. La CI también cubre 2 y 3.
- Cooperativo durable de cuatro navegadores: pasó con recuperación del anfitrión, enfermería compartida, dos administraciones reales y ocho mensajes. El bot ahora cierra exclusivamente la tarjeta social que abre cuando un médico ocupa su waypoint; conserva la misma ruta y las exigencias de llegada. No se omiten diálogos clínicos.
- [Cuenta real entre sesiones](../evidence/rpg/accounts-preview.json): dos registros, amistad previa conservada, cookie HttpOnly, rechazo de claves antiguas, apariencia compartida, permisos, control exclusivo, recuperación del mismo paciente, liberación definitiva, renovación real y logout por dispositivo.
- En esa prueba se completó FECAL por el motor real y el reloj de pared: **133 XP y un caso resuelto**. Una repetición del cierre no duplicó XP y la segunda sesión recuperó 133 XP. PostgreSQL confirmó un único recibo `clinical.closure` por 133 XP.
- [Multijugador con cuentas reales](../evidence/rpg/accounts-shared-preview.json): invitación y guardia cooperativa, tarjeta con XP persistido en vertical/horizontal, movimiento remoto continuo y competitivo con dos pacientes. Máximo salto remoto observado: **3,7884 px**.

El estado final de CI debe comprobarse en [los checks de la rama experimental](https://github.com/javierdario48-star/ATRIA/actions?query=branch%3Aatria-5.0-core-rebuild-experimental). No confundir el primer CI con los resultados posteriores a las correcciones de perfiles de invitados y de interacción de los bots con las nuevas tarjetas.

## Seguridad y límites concretos

Las tablas de cuentas, relaciones, recibos y liberaciones tienen RLS activo; no hay concesiones directas a anon/authenticated y anon no puede ejecutar el CAS. El aviso informativo de RLS sin políticas es intencional: sólo accede el servidor autorizado.

Supabase informó que la comprobación opcional de contraseñas filtradas está desactivada. No se cambió el plan ni la configuración de facturación. [Referencia del aviso](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

La validación móvil se hizo con emulación, no con teléfonos físicos. El gusto y volumen final de los sonidos requieren escucha del usuario. No se añadió recuperación automática de contraseña por correo. Las estadísticas exclusivamente locales quedan identificadas como históricas pendientes de verificar. Para una guardia que incluye cuentas reclamadas, los participantes deben usar sus cuentas; no se permite que una clave antigua controle esa guardia.

## Commits y propietario de cada cambio

- `bd9b359`: mortalidad previamente publicada, conservada.
- `375364981105f53c3ed2f7bfe74a1d8a6a3509be`: cuentas, perfiles, autoridad para modos individuales, curva, paleta y audio.
- `3fe4583582a8017554284d63c94c3afa92143119`: cercado de control/liberación, renovación segura y pruebas reales de cuentas.
- `9be8d9a33cb3572604ce0b3fed62cb9efe682d98`: compatibilidad de tarjetas/invitaciones de invitados y evidencia de XP.
- La revisión que contiene este informe termina la limpieza de recuperación de cuenta, conserva los XP históricos visibles e incorpora el recorrido real de cuentas compartidas y las evidencias. El SHA exacto se obtiene del HEAD remoto de la rama.
