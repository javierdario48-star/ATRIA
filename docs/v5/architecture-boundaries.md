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
6. **La guardia dura 24 minutos reales.** Los siguientes pacientes locales comparten el tiempo acumulado; el multijugador necesita una transición aprobada por su autoridad común.
7. **Competitivo permanece no habilitado** hasta que exista propiedad clínica por jugador, resolución y marcador independientes certificados.

## Flujo de mantenimiento obligatorio

1. Reproducir el fallo en pruebas específicas y registrar la causa.
2. Corregirlo **solo en el módulo propietario**, sin agregar condiciones de caso, coordenadas de cama o reintentos de interfaz al coordinador principal.
3. Probar el módulo con una regresión nueva, junto a `clean-core-contract`, los recorridos completos de casos y navegador real de 2/3/4 participantes cuando se toca multijugador.
4. Revisar la CI **en el SHA definitivo**, no en un checkpoint anterior. Rojo o pendiente significa no certificado.
5. Realizar cambios pequeños con lease de Git y no publicar como estable un Preview que todavía falla.

## Deuda explícita que no debe ocultarse

- `src/v5/app/application.js` sigue siendo un coordinador grande. Se extrajeron la política de enfermería y la rotación local, pero quedan tareas de separar render de conversaciones y admisión cooperativa **tras** cerrar las regresiones actuales. Hacerlo todo de una sola vez aumentaría el riesgo.
- Los cinco ejecutores clínicos certificados son los únicos habilitados para rotación local. El resto del catálogo requiere migración fisiológica antes de habilitar cierres y EXP.
- Las pruebas de navegador pueden descubrir conflictos entre el botón flotante de diagnóstico y los toques de movimiento. El diseño debe resolverlos geométricamente; nunca se deben forzar clics a través de controles visibles.
- Las pruebas de CI y el Preview deben reportarse por separado. Un despliegue READY no equivale a jugabilidad clínica certificada.
