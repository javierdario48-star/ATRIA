# Migración de sistemas: contrato y ejecución de Fase A

Solicitud vinculante: migrar sistemas de 4.8.7 sobre C01, sin añadir patologías.
Base comprobada: `7dff1e82bb27f3e381c757c8f41f7fe3faf924aa`; CI
[38841164329](https://github.com/javierdario48-star/ATRIA/actions/runs/38841164329)
completa success. Baseline local: 103/103 contratos V5.

## Diseño

El mundo define entidades y hitboxes en coordenadas del hospital. La cámara
solamente proyecta el punto táctil; la selección resuelve UID, distancia y cama.
La UI conserva ese UID y emite comandos por el router/autoridad/puerto existentes.
No se modifica el mapa, sprites, teclado de cuatro filas ni interpolación.

Un módulo de examen compartido por CIRR/APP separa región, técnica y hallazgo.
Los datos proceden de `ns421-clinical-exam` de la referencia efectiva. El progreso
exige impresión general y las cuatro técnicas abdominales efectivamente hechas;
explorar tórax no completa abdomen. Glasgow conserva componentes independientes.
Las consultas no ejecutan fármacos ni hacen avanzar el reloj.

Los monitores pertenecen a la cama y a su paciente. Abrirlos no mide ni conecta.
Medición puntual, última medición y monitorización continua se distinguen;
solo la autoridad conecta/desconecta y actualiza observaciones continuas.
Historia y paneles representan únicamente evidencia obtenida.

## Tareas ejecutables

1. C02: matriz por sistema/caso y clasificación de módulos originales; actualizar
   prioridad del plan, manteniendo once casos deliberadamente diferidos.
2. C04: RED de región/técnica/Glasgow/progreso/aislamiento; módulo canónico
   `clinical/physical-exam.js`, datos originales y conexión a los dos ejecutores.
3. C05.a: RED de hitboxes/proximidad/UID, monitor desconocido/conectado/desconectado;
   `engine/interactions.js`, integración mundo y selección explícita en aplicación.
4. UI real: `ui/examination-panel.js`, monitor e historia reutilizables; seleccionar
   anatomía no registra hallazgos. El botón de técnica realiza esa técnica en la
   región elegida. Mantener comandos de técnica completa por compatibilidad.
5. QA: unitarias, caracterización efectiva del original, Chromium móvil/desktop,
   CIRR/APP completos, teclado/cámara, build reproducible e histórico completo.
6. Publicar exclusivamente experimental, verificar CI y preview; actualizar
   STEP_02, STEP_04, STEP_05 y CURRENT_HANDOFF con alcance real y limitaciones.

## Riesgos que se deben probar

- Cambiar cámara/teclado/orientación no cambia el objeto tocado.
- Seleccionar un paciente no permite mutar otro ni evita comprobar proximidad.
- Examen parcial no completa órganos ni técnicas no efectuadas.
- Un monitor desconectado no filtra fisiología ni actualiza mediciones previas.
- Recarga/transición cancela presentación, listeners y trabajo del caso anterior.

## Decisiones de ejecución

La petición actual autoriza implementación autónoma y sustituye los gates humanos
genéricos de documentos antiguos para estos cambios ya especificados. No se
requiere otra ronda de diseño. Se conserva provisionalmente la estética aprobada.
Checkout limpio dedicado a la rama experimental; no se necesita otro worktree.
No se inicia C03 (portada/perfil completos) ni C13–C17 (casos nuevos).
