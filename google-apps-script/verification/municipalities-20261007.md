# Comprobación de Prueba-002 — 7 de octubre de 2026

## Problema observado

La fila 6 de Buyer Profiles tenía cuatro enlaces de Ripollet, `partial`. El comprador escribió Sant Cugat como municipio principal y prioritario, y Ripollet y Cerdanyola como zonas aceptables. El rango conservado es 300.000–500.000 €, calculado con las reglas existentes.

El filtro comparaba Sant Cugat y Cerdanyola exactamente con las URLs y títulos publicados. Descartó 43 anuncios por ubicación. También omitía rutas con guiones bajos de Pisos.com, usaba un h1 que podía mostrar solo la calle y leía algunos listados Idealista sin su barra final. La muestra contenía muchos anuncios por debajo o por encima del rango.

## Corrección publicada

- Equivalencias exactas Sant Cugat / Sant Cugat del Vallès y Cerdanyola / Cerdanyola del Vallès para Barcelona. No acepta municipios distintos por compartir prefijo.
- Título completo propio de cada ficha; en Pisos.com, municipio del primer párrafo bajo el h1. No hereda la ciudad del listado ni de la agencia.
- Lectura de rutas con guiones bajos y normalización de la barra en listados Idealista.
- Listados por precio derivados únicamente de municipios ya descubiertos en Idealista. Comparten el límite total de ocho páginas y sesenta fichas; no añaden consultas Tavily.
- Decodificación de entidades catalanas y recorte de viviendas relacionadas. Una descripción de la comarca deja de interpretarse como municipio contradictorio.
- Nota con localidad, precio, mínimos incumplidos y obligatorios sin confirmar para cada candidato.

No se cambiaron presupuesto, zonas, criterios de clasificación ni la flexibilización de mínimos previamente existente.

## Validación real y límites

Una búsqueda completa con los nombres corregidos consumió **8 créditos** (cuatro consultas advanced). Antes de las correcciones posteriores de HTML produjo cero candidatos; no sustituyó la fila. Sus URLs quedaron archivadas en `municipalities-initial-run-20261007.json`.

Las correcciones posteriores se comprobaron con relecturas de las mismas fuentes, sin más consultas Tavily. El listado de Sant Cugat con rango 300.000–500.000 € respondió HTTP 200 y contenía treinta fichas. La comprobación final usó 23 URLs de listados descubiertas en la búsqueda, leyó ocho listados y sesenta fichas, y guardó diez enlaces. No se repitieron las cuatro consultas de pago con la versión final.

Los diez enlaces son de Sant Cugat y tienen precio comprobado dentro del rango; están en `needs_review`. **Cada uno presenta al menos un mínimo incumplido** de habitaciones, baños o superficie. Algunas características obligatorias siguen sin confirmar. Estos resultados no acreditan diez coincidencias completas ni disponibilidad. El registro estructurado contiene precio y carencias por enlace.

La comparación A1:BR10 confirma que solo cambiaron estado, nota, diez enlaces y fecha de búsqueda de la fila 6. Los importes, preferencias, otros datos y otras filas quedaron intactos. CellData confirmó diez hipervínculos; la selección BH6:BQ6 muestra Cantidad: 10 a zoom normal. Se preservó el ancho existente de las columnas.

## Pruebas y publicación

- 22 comprobaciones de validación crítica, 14 de cobertura y 11 de municipios: **47 superadas**.
- Código final guardado en Google idéntico al archivo local: longitud recortada 47709; hashes de comprobación a=3462302121, b=938219261.
- Helpers manuales retirados antes de publicar; permanecen únicamente como evidencia local.
- Google confirmó publicación en **versión 9** de la implementación `AKfycbyikU88UJU9XM_VnACN_sT-hYDebavFZjqmKb4EaNaqzr7_aBuhB5zMU1RWUPvbfwQVDQ`, misma URL y permisos.
- Descripción: Municipios y listados por presupuesto — 7 octubre 2026.
- Pruebas gráficas: `municipalities-sheet-20261007.jpg` y `municipalities-deployment-20261007.jpg`.

La suite histórica conserva expectativas de criterios anteriores; no se alteraron las reglas actuales para satisfacerla.
