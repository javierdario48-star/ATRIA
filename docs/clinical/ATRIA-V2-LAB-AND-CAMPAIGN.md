# ATRIA V2 — laboratorio offline y campaña de 10.000 trayectorias

## Laboratorio offline

`node scripts/build-v5-solo-compact.mjs --all-v2` crea ATRIA-5-V2-Laboratorio.html con exactamente 55 IDs; sólo tres candidatos sustituyen sus revisiones en esta copia aislada. No se publica V1/V2 al catálogo certificado. Guardado `all-v2-offline` separado; Aprendiz/Solitario. La aceptación combina compilación de packs, prueba de invariantes y navegador desktop/Pixel emulado por las tres enfermedades. No confundir emulación con Android físico ni una copia offline con multiplayer de Vercel.

## Campaña nativa

10.000 índices únicos; 120 estratos (3 casos × 4 modos × 10 perfiles); dos repeticiones por estrato en el piloto de 240. El resto, 9.760, en cuarenta lotes de 244, sólo después de un piloto sin fallas de integridad o revisiones clínicas pendientes. Hasta cuatro lotes concurrentes. GitHub Actions ejecuta el runtime real, sin escritura de constantes fisiológicas o de resultados. Las semillas, modo, alternativas, tiempos, orden de preguntas/exámenes/estudios, dosis adversarial y recuperación son reproducibles. No se altera el orden de tratamientos dependientes ni se crean motores alternativos.

Cada trayectoria genera una fila, estado de integridad, cobertura observacional, recibos contados, tiempos del proceso y huella del estado. Los expedientes completos de hallazgos y muestras de éxito quedan en artefactos. Clasificación: pass (invariantes de software conformes), review (recorrido clínico competente/rescate no certificado), integrity (contrato de runtime o evidencia roto), gap (cobertura no alcanzada; no es prueba de funcionamiento). Muerte por enfermedad/iatrogenia en un perfil adversarial no es por sí misma un error. Sólo una conclusión nativa acredita cierre o daño. El informe agregado comprueba índices únicos y ausentes, no multiplica cantidades ni confunde semillas con trayectorias ejecutadas.

Reproducción:
`CAMPAIGN_START=137 CAMPAIGN_COUNT=1 node qa/v5/v2-campaign.mjs`

La campaña no certifica combinaciones infinitas de dosis, experiencia de usuario humana, Vercel/Supabase, red física o latencia de producción. Los tiempos de CPU/RSS son medidas del runner, no capacidad de usuarios concurrentes. Si el piloto falla, se conservan los hallazgos y se corrige la causa compartida antes de repetir. No se declara 10.000 pruebas aprobadas por el hecho de lanzar el workflow.
