# Recompensas compartidas y deuda — preparación de staging

Estado: **implementado y probado en PostgreSQL local; NO aplicado ni certificado en Supabase alojado**. Esta preparación no autoriza Production ni activa RESP-01 V2.

## Cambio

Migración generada con Supabase CLI: `supabase/migrations/20261122013909_cooperative_rewards_and_disposition_debt.sql`.

Extiende la RPC invoker existente `atria_v5_award_verified`; conserva RLS, permisos, bloqueo de cuenta `FOR UPDATE`, índice terminal único y prueba nativa del evento. Añade `xp_debt`, Observación insegura, distribución por participantes capturados al producirse el evento y descuentos compartidos de pistas/revelación de diagnóstico. La información revelada continúa privada. Un autor clínico conserva su identidad aunque otro integrante comparta el coste.

La clave de recibos incluye `event_id`: dos médicos que cometen errores distintos generan dos costes compartidos; un reintento del mismo evento no genera otro. El índice terminal sigue impidiendo dos recompensas o muerte más cierre del mismo paciente. Los recibos históricos no se recalculan; filas antiguas sin cohorte conservan su atribución documentada.

Alta/Observación cargan 15 XP por recibo nativo y conservan la parte no financiada como deuda; las siguientes recompensas pagan deuda antes de incrementar saldo. La muerte causal conserva la regla histórica de hasta 15 XP disponibles; esta migración no crea una deuda por muerte nueva ni cambia fisiología. La ausencia excluye incluso al autor original si ya no participa cuando se registra esa consecuencia.

## Evidencia local y límites

9 pruebas ejecutan DDL y PL/pgSQL reales con PGlite 0.5.17 y checkpoints del runtime/sesión originales: cuatro modos; ausencia/reincorporación; pista compartida; Alta y Observación; deuda con saldo cero; recompensa posterior; recibos falsos; dos autores; muerte causal realmente producida por sobrecarga nativa; RLS/permisos invoker; repetición y restauración.

No equivalen a PostgREST/Auth alojados, múltiples conexiones, reconexión de red ni concurrencia real. El adaptador REST actual no proyecta todavía `xp_debt` de la cuenta: deberá incorporarse junto con el despliegue versionado del esquema, después de probar staging. El runtime ya muestra la deuda de guardia; eso no certifica la deuda de carrera tras nuevo inicio de sesión.

Reproducción aislada:

```bash
npm install --prefix /tmp/atria-sql --no-save --ignore-scripts @electric-sql/pglite@0.5.17
ATRIA_PGLITE_MODULE=/tmp/atria-sql/node_modules/@electric-sql/pglite/dist/index.js node --test qa/v5/persistence/cooperative-reward-sql.test.mjs
```

CI permanente: `.github/workflows/atria-v5-reward-sql.yml`. Un verde allí certifica PostgreSQL **local**, no Supabase staging.

## Bloqueo observado y siguiente procedimiento

El proyecto ATRIA accesible es `hugqjejfyyilslbomsgi`; la lista de ramas staging devuelve `[]`. La consulta de metadatos de solo lectura devuelve `28P01 password authentication failed`. No se creó infraestructura con coste ni se modificó la base existente.

1. Restablecer acceso y proporcionar staging separado del proyecto público. Confirmar destino antes de cualquier DDL.
2. Exportar esquema, definición de RPC, restricciones e índices actuales. Aplicar las migraciones faltantes en orden; detenerse si difieren de los prerrequisitos históricos conservados. No reparar divergencias con SQL improvisado.
3. Probar con Auth/PostgREST reales: 2/3/4 cuentas, doble petición paralela de un mismo evento, dos errores de autores distintos, guardado CAS, reinicio del propietario, reconexión con respuesta perdida, deuda entre guardias, cierre y muerte incompatibles, aislamiento competitivo, balance de todos los actores.
4. Añadir la proyección versionada de deuda al adaptador de cuentas; confirmar que clientes con contrato anterior no ocultan deudas ni bloquean login. No habilitar una lectura de columna nueva sobre una base sin migrar.
5. Vincular evidencias al mismo SHA del backend y Preview. Esta aceptación sigue bloqueando GO.

## Reversión

En staging, detener primero los nuevos escritores/Preview. Restaurar la versión anterior de la RPC desde `20261112133500_diagnosis_reveal_rewards.sql` solo después de verificar su compatibilidad con los recibos nuevos. Mantener columna, deuda y recibos: no borrarlos ni cambiar XP para fingir rollback. La clave ampliada y el índice terminal pueden conservarse. Si hay costes nuevos, reconciliar desde recibos originales en una migración revisada; no volver a una función que ignore esos costes y seguir jugando. V1 y los contratos históricos siguen disponibles. Production requiere autorización independiente.
