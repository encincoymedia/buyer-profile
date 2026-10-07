# Búsqueda de Buyer Profile

## Proyecto y archivos

- Hoja: `1tMeqaKrxuLcfofKzWIe0kSTsfbzDAN6u_M4r_ujNaeA`, pestaña **Buyer Profiles**.
- Apps Script: `1iDOVbppfYBOE9DYwagFbvaxJ1oAIXah2-bqM2cc6Y7uywnBxKC0U3SA9`.
- `BuyerSearch.gs`: búsqueda, comprobación, clasificación y escritura de `match1` a `match10`.
- `Code.gs`: guarda el perfil antes de llamar a búsqueda. Actualizar este archivo o publicar el Web App es un paso distinto de guardar el buscador en el editor.
- Copia anterior a la corrección del 7 de octubre: `backups/BuyerSearch.before-coverage-20261007.txt`.
- Copia anterior a la corrección de municipios: `backups/BuyerSearch.before-municipalities-20261007.txt`.
- Copia de la versión 9 anterior al catálogo nacional: `backups/BuyerSearch.before-national-municipalities-20261007.txt`.
- Copia anterior a la validación crítica del 5 de octubre: `backups/BuyerSearch.before-critical-validation-20261005.txt`.

Editar archivos locales no cambia Google. Guardar en el editor permite probar la versión actual; las implementaciones versionadas del Web App necesitan una nueva versión para usar los cambios.

El 7 de octubre de 2026 se publicó la corrección en la versión 8 de la implementación que usa el formulario. La prueba PRUEBA-001 conserva diez enlaces en `needs_review`; ver `verification/coverage-20261007.md`.

La versión **9** reconoce municipios equivalentes, conserva la localidad del título y encabezado propios de la ficha, y limita los listados de Idealista al presupuesto del perfil. Prueba-002 contiene diez candidatos de Sant Cugat en `needs_review`; cada uno tiene al menos un mínimo incumplido, reflejado en la nota. Ver `verification/municipalities-20261007.md`.

La versión actual es la **10**, publicada el 7 de octubre de 2026 a las 12:27 en la misma implementación. Incluye el catálogo municipal de todas las provincias y la equivalencia expresa Madrid + Torrejón → Torrejón de Ardoz. Ver `verification/national-municipalities-20261007.md`.

## Flujo

Formulario → perfil guardado con `pending` → búsqueda con `searching` → hasta diez enlaces y estado final.

`runPrueba001` procesa únicamente la fila con código **PRUEBA-001**. Exige una sola fila, una solicitud de búsqueda, estado `pending` y resultados vacíos. Si el estado ya cambió, omite el trabajo sin consumir créditos. No procesa TEST-POST, TEST-BROWSER ni TEST-FORM.

Durante la búsqueda vuelve a localizar la fila por código y timestamp. Antes de escribir comprueba que no cambiaron sus datos ni se añadieron resultados. Solo escribe `searchStatus`, su nota, `searchedAt` y `match1`–`match10`.

## Recuperación de anuncios

1. Cuatro consultas Tavily `advanced`, una por portal, con `max_results: 20`, dominios completos e información de uso. El límite sigue siendo ocho créditos; no hay reintentos automáticos.
2. Consulta municipio principal, zonas prioritarias y zonas aceptables. La clasificación conserva primero las zonas prioritarias.
   Usa el catálogo INE a 1 de enero de 2026 (8.132 municipios en 52 ámbitos provinciales, incluidas Ceuta y Melilla). La provincia distingue las localidades. Reconoce nombres oficiales, tildes, denominaciones bilingües, artículos y abreviaturas que identifican un único municipio. Conserva los nombres escritos por el comprador en el perfil.
   Las equivalencias expresas son Sant Cugat / Sant Cugat del Vallès y Cerdanyola / Cerdanyola del Vallès en Barcelona, y Torrejón / Torrejón de Ardoz en Madrid, según el ejemplo del usuario. Los nombres completos Torrejón de Velasco y Torrejón de la Calzada mantienen su identidad. Un nombre ambiguo como Pozuelo detiene la búsqueda con una nota explicativa antes de consultar Tavily. Los barrios y zonas no catalogados se conservan como texto; no se convierten automáticamente en municipios de otra provincia.
3. Pide contenido `markdown` para conservar los enlaces de los listados. Los listados no se guardan como resultados.
4. Si un listado de venta de una localidad aceptada no contiene enlaces, lee su HTML. De los municipios ya descubiertos en Idealista deriva listados limitados al mismo rango económico para evitar que la muestra se agote con precios extremos. Examina hasta ocho listados en total, repartidos entre portales y dando preferencia al municipio principal.
5. Recupera hasta sesenta fichas adicionales desde URLs individuales del mismo portal. No sigue enlaces externos ni rutas arbitrarias. No sigue redirecciones ni elude bloqueos.
6. Lee cada ficha por separado. Nunca usa el precio, la localidad o las características de otra tarjeta del listado. Reutiliza esa respuesta HTTP en la comprobación final.
   Conserva el título completo de la ficha para acreditar la localidad cuando el h1 muestra solo una calle. En Pisos.com admite también el municipio publicado en el primer párrafo bajo el h1; evita usar la dirección de la agencia o las viviendas relacionadas. Admite guiones bajos y normaliza la barra de los listados Idealista antes de sus parámetros.

Las lecturas HTTP de listados y fichas no añaden consultas Tavily. La muestra sigue siendo limitada; no constituye un inventario completo del mercado.

## Criterios conservados

- Máximo económico: `mortgageAmount + ownFunds`; campos opcionales vacíos aportan cero. No se sustituye por `maxPrice`. Rechaza importes inválidos, negativos y sumas no positivas.
- Mínimo económico: `targetPrice - 50.000 €`, con suelo cero, cuando hay precio objetivo positivo. Para PRUEBA-001: **200.000–280.000 €**.
- Solo se guardan anuncios con precio leído dentro de ese rango. Se comprueba nuevamente al leer la ficha; no se usan cuotas hipotecarias ni precios de anuncios relacionados.
- Descarta anuncios retirados, respuestas 404/410, ocupación detectada, alquileres, tipos incompatibles, ubicaciones no acreditadas y descartes expresos reconocibles.
- Conserva el comportamiento previo de mínimos, obligatorios, características no deseadas, preferencias Importantes y Deseables y puntuación. Los mínimos y características no deseadas pueden quedar señalados para revisión según las reglas ya existentes; esta corrección no altera esas reglas.
- Orden: zona, precio comprobado, incumplimientos de mínimos, características no deseadas, nivel de preferencias y puntuación. Deduplica URLs y duplicados entre portales cuando hay evidencia suficiente.
- No calcula distancias ni confirma disponibilidad, cercanía a colegios, financiación, reforma o cumplimiento de comentarios libres. Los datos pendientes se explican en la nota del estado.
- La nota identifica la localidad y precio de cada enlace, sus mínimos incumplidos y las características obligatorias sin confirmar.

## Estados

| Estado | Significado |
| --- | --- |
| pending | Solicitud preparada. |
| searching | Búsqueda en curso. |
| needs_review | Hay candidatos que requieren revisión. |
| no_matches | Ningún candidato utilizable en la muestra examinada; no prueba ausencia de viviendas. |
| partial | Alguna fuente o lectura falló; puede haber candidatos de otras fuentes. |
| error | No se pudo completar la búsqueda o el perfil cambió. |

## Prueba y publicación

Para probar manualmente, abre el mismo proyecto, comprueba el estado y los diez campos de PRUEBA-001 y ejecuta `runPrueba001` una sola vez. No reenvíes el formulario para repetir una prueba. Si la fila quedó en `searching`, revisa primero **Ejecuciones**.

Para activar en nuevos envíos, comprueba que Código.gs llama a `runBuyerSearch_` después de guardar y publica una nueva versión de la implementación existente. Conserva la URL `/exec` y sus permisos. El formulario usa `no-cors`: la respuesta es opaca; el resultado real se verifica en la hoja y en **Ejecuciones**.

## Comprobaciones locales

```sh
node google-apps-script/tests/critical-validation.test.cjs
node google-apps-script/tests/coverage.test.cjs
node google-apps-script/tests/municipalities.test.cjs
node google-apps-script/tests/national-municipalities.test.cjs
```

Estas suites comprueban la validación crítica, los criterios actuales, la recuperación desde listados, la separación de datos entre viviendas, deduplicación, prioridad de zonas, equivalencias de municipios y el límite de diez. No usan red, créditos ni Google Sheets.

La suite nacional verifica la identidad provincial de los 8.132 nombres oficiales y la separación entre los tres Torrejones. El catálogo queda incluido en el código publicado; no añade una consulta externa por perfil. La procedencia y huella del archivo original están en `data/municipalities-ine-2026.source.json`.

`verification/CheckNationalMunicipalities.gs` es una comprobación puntual sin Sheets ni servicios externos. Se retira del editor antes de publicar.

La suite histórica `buyer-search.test.cjs` conserva expectativas de reglas anteriores y no valida los criterios actuales. No se modificaron los criterios para satisfacerla.

`verification/ReplayKnownLists.gs` es una herramienta de comprobación puntual con los listados observados el 7 de octubre. No se instala como activador ni forma parte de la versión final guardada en Google. Usa cero consultas Tavily y evita escribir si la fila cambió o no obtiene diez candidatos.

`verification/RepairPrueba002.gs`, `ReplayPrueba002.gs` e `InspectPrueba002.gs` son comprobaciones puntuales archivadas, fuera del código publicado. La primera consume hasta ocho créditos; las otras no consultan Tavily. La reparación y relectura quedan bloqueadas ahora por la comprobación de los cuatro enlaces originales y del estado `partial`.

Referencia del proveedor: [Tavily Search](https://docs.tavily.com/documentation/api-reference/endpoint/search).
