# Catálogo municipal

Fuente: [INE, relación de municipios y códigos a 1 de enero de 2026](https://www.ine.es/daco/daco42/codmun/26codmun.xlsx), descargada el 7 de octubre de 2026.

`municipalities-ine-2026.json` conserva el nombre oficial de cada ámbito provincial y municipio. Cada clave es el código provincial de dos dígitos; el primer elemento es la provincia y los restantes sus municipios. Incluye 8.132 municipios en 52 entradas, con Ceuta y Melilla. Solo se importaron filas con CPRO coincidente y nombre; se omitieron dos filas vacías finales del Excel.

`municipalities-ine-2026.source.json` registra fecha de referencia, descarga, recuento y SHA-256 del Excel original.

El objeto `MUNICIPALITY_DATA` de `BuyerSearch.gs` contiene una copia compacta del JSON. Así no se depende de la disponibilidad del INE durante cada búsqueda ni se consumen créditos para resolver nombres. Si se actualiza el catálogo, actualizar ambos objetos y ejecutar la suite `national-municipalities.test.cjs` antes de volver a publicar.

Las abreviaturas deben identificar un solo municipio de la provincia. Las excepciones expresas Sant Cugat, Cerdanyola y Torrejón están en `PLACE_ALIASES`; el nombre completo siempre mantiene su identidad. No se corrigen erratas ni se interpreta un barrio no catalogado como municipio de otra provincia.
