# Municipios de toda España — 7 de octubre de 2026

Publicado en la versión **10** de la implementación usada por `script.js`, a las 12:27 Europe/Madrid. Apps Script mostró «Se actualizó correctamente la implementación». Se conservaron la URL y los permisos existentes.

## Cambio

- Catálogo oficial INE a 1 de enero de 2026: 8.132 municipios y 52 ámbitos provinciales, incluidas Ceuta y Melilla. JSON y procedencia en `../data/`; copia compacta incluida en `BuyerSearch.gs`, sin dependencia de red por perfil.
- Nombres oficiales, variantes bilingües, tildes, artículos y abreviaturas únicas se resuelven dentro de la provincia. Se conservan los valores originales del perfil.
- Equivalencia expresa del ejemplo del usuario: Madrid + Torrejón → Torrejón de Ardoz. Los nombres completos Torrejón de Velasco y Torrejón de la Calzada mantienen su identidad.
- Un nombre ambiguo como Pozuelo produce un error con las alternativas antes de consultar Tavily. Esta comprobación incluye municipio principal, zonas prioritarias, aceptables y descartes.
- Los barrios o nombres no catalogados se conservan como texto; no se interpretan automáticamente como municipios de otra provincia. No se corrigen erratas.
- Se evita que una URL de Pisos.com o Milanuncios con un municipio de nombre más largo pase por compartir la abreviatura.

## Verificación

56 comprobaciones locales: 22 de validación crítica, 14 de cobertura, 11 de municipios de Barcelona y 9 de resolución nacional. La última suite verifica los 8.132 nombres oficiales y varias situaciones de ambigüedad, bilingüismo y Torrejones distintos. Servicios simulados: cero red, créditos o escrituras en Google Sheets.

En el editor de Apps Script se ejecutó una comprobación pura de ocho ejemplos y la consulta Madrid + Torrejón. La ejecución se completó con Torrejón de Ardoz, Alcalá de Henares, Chiclana de la Frontera, Santiago de Compostela, L'Hospitalet de Llobregat, Sant Cugat del Vallès, Donostia y San Sebastián de los Reyes. Pozuelo se detuvo como ambiguo. Evidencia: `national-municipalities-check-20261007.json`.

La comprobación temporal `CheckNationalMunicipalities.gs` se retiró del editor antes de publicar. Después se guardaron dos protecciones adicionales de rutas de Pisos.com, verificadas en las suites locales. La copia final guardada en Google coincidió exactamente con el archivo local: 178.676 caracteres, huellas auxiliares a=1753814061 y b=253853865. Ninguna comprobación de este cambio accedió a Sheets ni consultó Tavily. No se hicieron búsquedas reales nuevas de anuncios.

La suite histórica `buyer-search.test.cjs` sigue reflejando criterios antiguos; no forma parte de estas 56 comprobaciones. Los criterios económicos, mínimos, preferencias y clasificación de la versión 9 se conservaron.

## Evidencia y recuperación

- Publicación: `national-municipalities-deployment-20261007.jpg`.
- Fuente original y SHA-256: `../data/municipalities-ine-2026.source.json`.
- Copia anterior: `../backups/BuyerSearch.before-national-municipalities-20261007.txt`.
- Para revertir, seleccionar la versión 9 en la misma implementación.
