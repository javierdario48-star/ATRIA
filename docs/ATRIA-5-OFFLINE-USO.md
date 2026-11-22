# ATRIA 5 · Pruebas personales sin servidor

[Descargar RESP-01 V2 experimental](https://chatgpt.com/library?file_id=libfile_265e4f76fbf48191adb047365dba2bc4&account_id=personal). Es el HTML exacto de [CI45020275964](https://github.com/javierdario48-star/ATRIA/actions/runs/45020275964), SHA `906e50e34fe815a616fb12daa74e3e3a167024b6`. También están [el paquete de CI con V1/V2, instrucciones y evidencias](https://github.com/javierdario48-star/ATRIA/actions/runs/45020275964/artifacts/14753636884) y el [manifiesto de integridad](evidence/resp01-v2-graph-2026-11-22/offline-manifest.json).

1. Descargar el HTML y abrirlo con Chrome. En escritorio funciona por apertura directa `file://`: no requiere servidor HTTP local ni Vercel.
2. Entrar al lobby y elegir **Hacer guardia → Solitario o Aprendiz → Caso específico → neumonía de bajo riesgo**. En la copia V2, esa selección es RESP-01 V2 experimental.
3. Entrar a **Recepción → Ir al box**. Usar el menú del paciente y el chat para historia, exploración, estudios, indicaciones a Enfermería y Dr. Vega. Las órdenes pasan por sus colas y recibos reales; no se confirma una medicación por haberla escrito.
4. Elegir **Guardar y salir** antes de cerrar el archivo. Para volver: abrir el mismo HTML, entrar al lobby y elegir **Hacer guardia → Retomar guardia guardada**. El reloj estuvo pausado mientras estaba cerrado.

Conservar el HTML de la misma revisión para retomar sus guardias. El guardado depende de este navegador y su almacenamiento local. Un cierre abrupto sin guardar no tiene garantía de recuperación. Los perfiles/XP y las guardias V1 y V2 usan espacios separados; no se convierten en recompensas verificadas de una cuenta.

`ATRIA-5-Solitario.html` conserva los55 casos V1. La copia experimental contiene55 identidades lógicas, con RESP-01 V2 aislado; no se agregaron duplicados al catálogo activo ni se eliminaron casos V1. Los otros54casos no necesitan revisiónV2 para probar este piloto.

Sin backend, los modos jugables son Solitario y Aprendiz. Cooperativo/Competitivo conservan su código y sus pruebas de autoridad; requieren servidor y otros participantes. No se simulan cuentas ni multijugador en el archivo offline. Tampoco se promete voz entre jugadores sin su infraestructura.

Se probaron escritorio y Pixel5 emulado, incluyendo una atención completa con reloj real, enfermera pendiente al guardar, recarga, misma identidad, nuevas órdenes, cierre y XP. Android físico sigue pendiente: en un teléfono, la apertura puede depender del navegador o del gestor (`file://`/`content://`). El empaquetador contempla `content://`, pero eso no equivale a aceptación de un dispositivo real.

La prueba de interfaz conservó133 XP brutos,126 tras una pista y111 netos tras una decisión insegura de−15; una sola administración de amoxicilina y un solo cierre. No se añadieron XP para ocultar la sanción.

Para reconstruir desde el repositorio se utiliza `scripts/build-v5-solo-compact.mjs`, con esbuild0.25.12 mediante `ATRIA_ESBUILD_MODULE`; `--resp01-v2` produce la segunda copia. Mismo dominio clínico, interfaz y límites de transporte que el build modular. La anulación de APIs está solo en la entrada de empaquetado offline. El build web normal conserva su transporte para futura Preview.
