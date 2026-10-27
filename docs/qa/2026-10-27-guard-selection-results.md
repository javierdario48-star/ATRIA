# ATRIA 5 — selección de guardia y XP verificada

Código funcional publicado en `2820ce5f0939af0b5ed87915927f45a0e8ec63fb`, únicamente en `atria-5.0-core-rebuild-experimental`. El commit que contiene este informe añade la evidencia y las regresiones finales; no cambia ese código de producción.

## Resultado

- Cualquier caso ×1,5, Gastroenterología ×1,2 y patología específica ×1 funcionan en Aprendiz, Solitario, Cooperativo y Competitivo. Sólo aparecen especialidades con ejecutores certificados.
- El servidor valida el catálogo y guarda selección y secuencia de seis pacientes. Cada pool se mezcla antes de reutilizarlo. La selección específica se aplica a todas las admisiones. El anfitrión configura la invitación; los invitados no pueden cambiarla. Se conserva al recargar antes de aceptar la invitación y al recuperar una guardia.
- La duración continúa en 1440 segundos reales. No se cambió el scoring clínico, la fisiología, la supervivencia ni sus fuentes originales. `atria_v5_award_verified` sigue siendo la única acreditación de cuenta. Redondea una sola vez la recompensa clínica multiplicada, conserva el recibo único y no multiplica penalizaciones. Guardias sin configuración y recibos anteriores conservan ×1.
- Migración aplicada en Supabase como `20261027182450_atria_v5_guard_selection_rewards`; SQL creado con CLI y versionado en `docs/migration/20261027182110_atria_v5_guard_selection_rewards.sql`. RLS sigue activo; anon/authenticated no pueden ejecutar el RPC ni escribir progreso.
- Recuperación de PostgreSQL corregida: JSONB puede reordenar claves y ahora se comparan valores, sin depender de su orden. Restaurar una invitación sólo conserva el puntero ligado al mismo actor autenticado; cambiar de identidad lo retira.

## Verificación

- 81/81 pruebas focalizadas: 12 combinaciones modo/selección, seis admisiones y límite 1440s, recuperación, autorización, JSONB, idempotencia de comandos, propiedad clínica y movimiento.
- SQL transaccional: 72/72 comprobaciones basadas en un cierre FECAL nativo guardado; antes de la corrección se reprodujeron los factores ausentes. Todas las modificaciones de estos fixtures se revirtieron. Los recibos existentes no cambiaron.
- Navegador: las 12 combinaciones, vertical/horizontal y escritorio, selección de campos, especialidad no vacía, misma secuencia compartida, recarga y tercera admisión competitiva después de 180 segundos de pared. Sin adelantar el reloj.
- Navegación con cinco entradas/salidas por dispositivo, teclado/cámara y recepción con conversación nativa en ambos modos individuales aprobados. Competitivo de 2 jugadores aprobado localmente; CI también aprobó 3 y 4 en el checkpoint funcional.
- Compilaciones `build:v5` y `build:v5-core` aprobadas; auditoría de límites: 135 módulos, un RAF y ningún temporizador ni ejecutor clínico adicional en UI.
- Velocidad nivel 1: 184,5 px/s; curva creciente y acotada, colisiones e interpolación conservadas en las regresiones de 2/3/4 médicos. El reloj muestra AM/PM y sol/luna y consume tiempo autoritativo.
- [Aceptación en el despliegue real](../evidence/rpg/guard-selection-preview.json): dos cuentas de QA, creación vertical, login en otra sesión horizontal, invitación recuperada antes de bootstrap, cierres nativos con los tres factores, repetición sin duplicación y saldo recuperado en otra sesión. Credenciales y cookies no se guardaron como evidencia.

| Selección | Cierre real | XP clínicos | Factor | XP acreditados |
|---|---|---:|---:|---:|
| Cualquier caso | ILEO-001 | 109 | 1,5 | 164 |
| Gastroenterología | FECAL-001 | 133 | 1,2 | 160 |
| Patología específica | FECAL-001 | 133 | 1,0 | 133 |

Saldo final 457 XP y tres casos, recuperado en la otra sesión. PostgreSQL confirmó exactamente un recibo por paciente, con base y factor separados. El debrief conserva los XP clínicos base; la cuenta refleja el premio multiplicado.

Los tests de casos concretos ahora seleccionan explícitamente «Patología específica». El test de teclado pedía fármacos de cirrosis mientras dejaba seleccionada la nueva admisión aleatoria; se corrigió su preparación manteniendo sus exigencias clínicas. La prueba del reloj ahora exige 12 horas, AM/PM y sol/luna. No se eliminaron comprobaciones para ocultar fallos.

La misma preparación explícita se aplica a la regresión de bloqueo del reloj, que administra espironolactona en cirrosis. La prueba de recarga de invitación espera «Invitación enviada» antes de recargar: hacerlo durante el POST aún no confirmado activa la cancelación intencional del transporte. Se reprodujo ese límite y pasó la recarga de la invitación ya guardada, sin cambiar la cancelación ni la lógica clínica.

La CI automática conserva sus suites existentes; no se lanzó manualmente otra auditoría de mortalidad ni la batería histórica de 500 recorridos. Un comando local amplio iniciado por error se interrumpió y no se presenta como una ejecución aprobada. Consultar los checks del SHA final para el resultado de CI; los fallos del primer checkpoint están identificados y corregidos en los tests anteriores.

La ejecución de CI de `68f4612` también registró un timeout esperando elegibilidad de sala en Cooperativo RTC de tres médicos; ese mismo recorrido pasó en el checkpoint funcional. No se le atribuye una causa no comprobada ni se relajó su condición de aprobación.

## Límite externo

La ilustración original de los dos médicos chibi no está disponible en esta conversación ni en los archivos accesibles. Se pidió adjuntarla; no se generaron personajes alternativos ni se incorporó un sustituto. Esta integración visual queda pendiente de recibir el archivo original. El registro y la creación existentes funcionan. La validación móvil fue por emulación.

[Juego](https://night-shift-clinical-git-atria-50-c-fd8524-javierdario4878-7324.vercel.app) · [CI de la rama](https://github.com/javierdario48-star/ATRIA/actions?query=branch%3Aatria-5.0-core-rebuild-experimental)
