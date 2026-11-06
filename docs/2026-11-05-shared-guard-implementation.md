# Libertad clínica y guardias compartidas — plan de implementación

Base remota verificada antes de editar: `63ebc26e77a400f4bc832b42b28691cadc48bac3`.
Rama única: `atria-5.0-core-rebuild-experimental`.

La especificación vinculante es la misión del usuario del 5 de noviembre de 2026.
Se conservan el motor, las sesiones, la contabilidad de pistas y las reglas de
cierre existentes. Cada checkpoint se verifica antes de publicarse.

## Componentes e interfaces

1. **Ejecución clínica** — `native-medication-eligibility`, `native-medications`,
   `acute-care`, adaptadores V5 de exposición y `guard-session`.
   La capacidad técnica permite ejecutar; la pertinencia produce advertencias,
   consecuencias y evaluación. Las pistas siguen usando pertinencia, no permisos.
2. **Endocarditis** — datos autorizados CARD-09, órdenes de estudios y selección
   de pistas existentes. Obtener tres pares no equivale a conocer el cultivo.
3. **Transporte** — `durable-cooperative-replica`, `durable-guard-authority`,
   `clinical-http`, `postgres-guard-store`, `api/clinical`, `cooperative-link`.
   `observe` lee una vista autorizada confirmada sin adquirir la escritura.
   `clinical.committed` sólo despierta esa lectura por el canal existente.
   Los efectos y ACK siguen pasando por CAS; no se ejecutan paquetes de pares.
4. **Comunicación** — chat de equipo persistido en el mismo agregado de guardia;
   actividad como proyección de eventos clínicos existentes con médico y paciente.
   La UI agrega pestañas compactas al chat actual y conserva el canal clínico.
5. **Selección cooperativa** — foco local inmediato sobre datos ya confirmados;
   cada orden lleva paciente persistente y la autoridad comprueba proximidad.
   Se mantiene la asignación exclusiva solamente en Competitivo.
6. **Anamnesis** — datos canónicos y expresiones personales separadas;
   intención de medicación habitual distinta de exposición, sobredosis y adherencia.
7. **Turnos** — `shift-flow`, `guard-runtime` y UI de fin/recuperación.
   `shiftControl(actorId,{op,turnId,requestId})` persiste decisiones idempotentes.
   `clinical.shift.turn` informa participantes, consentimiento y estado del turno.
   Un turno nuevo agrega 1440 segundos sin recrear pacientes, relojes ni recibos.
8. **Certificación** — regresiones específicas y dos navegadores autenticados
   con almacenamiento aislado; escritorio y Pixel emulado; 55 casos y 550 rutas.

## Ejecución y pruebas por checkpoint

- [x] 1. Reproducir bloqueos de evidencia/dosis; ejecutar medicación técnicamente
  posible y comprobar dosis reales, daño, atribución, evaluación y deduplicación.
- [x] 2. Recorrer CARD-09 con cultivos solicitados/obtenidos/incubando, terapia,
  pistas y destino. Conservar las fuentes clínicas autorizadas del caso.
- [x] 3. Reproducir lectura antigua bloqueada y contención autenticada; agregar
  observación independiente, avisos de commit, cancelación de transporte obsoleto
  y trazas de tiempos sin textos de conversaciones ni credenciales.
- [x] 4. Probar equipo sin órdenes y actividad confirmada entre pacientes/médicos,
  mensajes iniciales bidireccionales, recuperación ordenada y restricciones rivales.
- [x] 5. Probar selección rápida A/B y dos médicos concurrentes sobre el mismo
  paciente; idempotencia, proximidad y vallado competitivo en el servidor.
- [x] 6. Probar CARD-09 cotidiano, subintenciones de medicación, repreguntas,
  diversidad real de arquetipos y persistencia de hechos/cronología/negaciones.
- [x] 7. Recorrer 1440 segundos; continuar, guardar/salir y recuperar sin reinicios;
  consentimiento cooperativo, peticiones repetidas y compatibilidad de snapshots.
8. Revisión independiente, regresión V5, bots, navegador real, publicación,
  verificación del HEAD/manifest/API desplegados y GitHub Actions.

## Evidencia de integración

Las revisiones independientes corrigieron cuatro defectos reproducidos: una
dosis insignificante atribuida al daño de otro médico, pérdida de avance durante
recuperación acotada, bloqueo del primer invitado por pedirle una vinculación que
su primera transacción debía crear y exposición del paciente rival en la vista
competitiva predeterminada. La metadata entre pares deduplica identidades, sin
usar una época no verificada para descartar eventos futuros.

Las dosis positivas dejan de ser permisos clínicos. Las dosis inferiores a la
referencia conservan su cantidad y una fracción de beneficio; 1 ml no equivale a
500 ml. El modelo de mortalidad conserva sus umbrales nativos y solo atribuye un
descuento a grupos de autores cuya exposición adversa nativa resulta causal.
La cuenta se liquida mediante el RPC existente y el resultado usa su recibo real.

La primera campaña local completa ejecutó 2889 pruebas y detectó 11 regresiones
de contratos anteriores. Se corrigieron y los siete archivos afectados se
ejecutaron de nuevo: 53/53 aprobadas. Además: 42/42 de dosis nativas, 42/42 del
agregado compartido y 93/93 de transporte/observación/presentación. El gate de CI
de la rama ejecuta la campaña completa sobre el HEAD publicado.

El recorrido de `shared-guard-auth-browser.mjs` utiliza dos procesos Chromium y
dos cuentas aisladas, una con Pixel 5 emulado. Comprobó 13 órdenes clínicas,
dos administraciones físicas y tres mensajes de equipo sin errores de página.
Pérdida de respuesta después del commit, recarga, selección A/B, guardado y
recuperación preservaron identidades y recibos. Su extensión de 1440 segundos
usa exclusivamente un reloj del servidor de prueba acelerado; no se presenta
como una espera de 24 minutos reales ni como Android físico.

`shared-guard-preview.mjs` agrega la comprobación sobre Auth/Postgres reales,
dos procesos independientes y hash de los módulos publicados. La opción
`V5_REAL_TURN=1` espera el límite real de 24 minutos y requiere dos votos. No
inyecta pacientes, relojes ni resultados en el preview. Sus resultados se
informan únicamente después de ejecutar el recorrido.

Cada corrección comienza con una prueba que reproduce el defecto, se observa
fallar y después se verifica. Las campañas integrales se ejecutan sobre el árbol
integrado; no se repiten por cada archivo ni se sustituyen por cantidades supuestas.

## Decisiones operativas

- La instrucción de implementación autónoma autoriza implementar y publicar estos
  checkpoints sin una ronda adicional de aprobación de diseño.
- El trabajo ocurre en el checkout dedicado de la rama autorizada; no se crean
  otras ramas ni se modifica el motor de ATRIA 4.8.7.
- Los avisos entre pares contienen sólo sala y época. La pérdida de un aviso se
  recupera leyendo el estado durable; el aviso nunca es un recibo clínico.
- Desconectarse no equivale a consentir un nuevo turno. Guardar/salir es una
  decisión explícita; los médicos que permanecen deben consentir la extensión.

## Revisión focalizada

Revisar especialmente respuesta perdida después de commit, transferencia de
control durante una lectura, órdenes A/B mientras cambia el foco, ACK de pista
en el mismo lote que un cierre, salida durante consenso y mensajes de equipo que
contienen nombres de tratamientos pero no deben ejecutarse.
