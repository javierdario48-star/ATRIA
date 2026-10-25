# ATRIA 5.0 — límites de arquitectura y criterios de aceptación

Rama exclusiva: `atria-5.0-core-rebuild-experimental`. V4 es referencia histórica de **solo lectura**.

## Propiedad única por bloque

| Bloque | Único propietario | Puede hacer | No puede hacer |
| --- | --- | --- | --- |
| `src/v5/clinical/` | Motor clínico y reloj de un paciente | Procesar órdenes, fisiología, evolución, puntuación, cierre confirmado | Obtener DOM, manipular cámara, reenviar RTC |
| `src/v5/core/` | Autoridad/validación de la guardia | Autenticar actor, ejecutar intentos válidos una vez, registrar revisiones | Dibujar interfaces ni inventar hallazgos |
| `src/v5/engine/` | Mundo, navegación y enfermería física | Colisiones, rutas, interacciones y trayectos | Otorgar EXP ni resolver diagnóstico |
| `src/v5/render/` | Cámara y presentación | Renderizar snapshots, proyecciones y animaciones | Mutar la posición clínica o reescribir autoridad |
| `src/v5/ui/` | Interfaz, teclado y monitor visual | Leer estado confirmado y construir controles | Ejecutar fármacos al pulsar una sugerencia |
| `src/v5/social/` | Roster, invitaciones, conectividad | Validar integrantes, reconectar enlaces, propagar mensajes | Mutar tratamientos y cierres |
| `src/v5/app/` | Composición y ciclo de vida | Conectar propietarios, crear/destruir módulos y escuchar eventos | Implementar otro motor o almacenar reglas clínicas |
| `qa/v5/` | Aceptación pública | Probar clics, errores médicos, persistencia y sincronización reales | Alterar estados internos para forzar un aprobado |

## Contratos especialmente sensibles

1. **Un solo ejecutor por paciente y sesión.** El servidor/autoridad compartida ejecuta órdenes clínicas; los clientes observan y envían intentos autenticados.
2. **XP y cierres exactamente una vez**, obtenidos de recibos clínicos confirmados. El resultado de una guardia local se agrega en `src/v5/app/local-shift.js`, nunca recalcula fisiología.
3. **Sin duplicación de transporte ni temporizadores.** El ciclo de aplicación mantiene presencia y señalización. `src/v5/social/peer-recovery-policy.js` determina exclusivamente cuándo reintentar conexiones RTC.
4. **Miembros de una sala sin pérdida por concurrencia.** `src/v5/social/room-membership-store.js` separa las aceptaciones individuales y mantiene intacto el servidor histórico caracterizado.
5. **UI nunca decide lo clínico.** `src/v5/ui/guard-message-policy.js` determina el texto, pero no crea interconsultas. `src/v5/ui/patient-overlay-layout.js` posiciona controles sin alterar navegación.
6. **Guardia continua de 24 minutos reales = 24 horas simuladas.** `createShiftFlow` controla un único calendario de hasta seis ingresos en los cuatro modos. Cada paciente tiene su propia sesión clínica nativa y su cama; el servidor conserva el reloj compartido, las salidas y el historial.
7. **Competitivo está habilitado para 2–4 médicos.** El servidor arbitra propietario por UID y primer contacto junto a la cama. La recepción permite elegir y caminar, pero no atribuye clínicamente hasta verificar llegada; rivales no pueden robar el foco ni obtener XP. Las pruebas de navegador cubren 2, 3 y 4 médicos.
8. **Proximidad y conversaciones:** `src/v5/ui/spatial-ward-speech.js` calcula solamente visibilidad acústica (rango, paredes y puertas); nunca concede acceso clínico. El backend valida en cada orden posición y propiedad por UID.

## Flujo de mantenimiento obligatorio

1. Reproducir el fallo en pruebas específicas y registrar la causa.
2. Corregirlo **solo en el módulo propietario**, sin agregar condiciones de caso, coordenadas de cama o reintentos de interfaz al coordinador principal.
3. Probar el módulo con una regresión nueva, junto a `clean-core-contract`, los recorridos completos de casos y navegador real de 2/3/4 participantes cuando se toca multijugador.
4. Revisar la CI **en el SHA definitivo**, no en un checkpoint anterior. Rojo o pendiente significa no certificado.
5. Realizar cambios pequeños con lease de Git y no publicar como estable un Preview que todavía falla.

## Deuda explícita que no debe ocultarse

- `src/v5/app/application.js` sigue siendo un coordinador grande (más de 1.000 líneas). La selección temporal de recepción está encapsulada en `src/v5/app/reception-assignment.js` (no en el motor clínico); faltan extracciones progresivas de conversación, presentación y conexión, siempre con pruebas antes de cada cambio. Evitar una reescritura simultánea.
- Hay **siete ejecutores clínicos** registrados explícitamente en `src/v5/content/clinical-cases.js`: CIRR, APP, CHOLANG, CHOLE, PERI-SEC, PERI-PBE y PERI-TER. No inferir disponibilidad de otros casos por su presencia en el catálogo.
- Las pruebas de navegador pueden descubrir conflictos entre el botón flotante de diagnóstico y los toques de movimiento. El diseño debe resolverlos geométricamente; nunca se deben forzar clics a través de controles visibles.
- Las pruebas de CI y el Preview deben reportarse por separado. Un despliegue READY no equivale a jugabilidad clínica certificada.
