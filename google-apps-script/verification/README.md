# Verificación de PRUEBA-001 — 5 de octubre de 2026

La copia de `BuyerSearch.gs` del editor de Google coincidía con la copia local anterior. Se guardó y comprobó el archivo corregido en ese mismo proyecto. No se publicaron nuevas versiones del Web App ni se editaron Código.gs, TavilyDiagnostic.gs o el formulario.

## Cambio aplicado

- Recupera precio y ocupación de la ficha cuando el fragmento del buscador no los contiene.
- Comprueba nuevamente el rango antes de guardar y excluye precios sin comprobar.
- Solicita las URLs de Idealista con su barra final para obtener la ficha en lugar de una redirección 301. Mantiene desactivado el seguimiento de redirecciones.
- Mantiene consulta, financiación, zonas, prioridades, otros filtros y máximo de diez resultados.
- Copia de recuperación: `../backups/BuyerSearch.before-critical-validation-20261005.txt`.

## Prueba real y comprobación posterior

Se ejecutó `runPrueba001` una sola vez: cuatro consultas de Tavily, 8 créditos informados. Terminó en `no_matches`, con las diez celdas de resultados vacías. La comparación de las filas 1–5 confirmó que los datos del perfil y las otras filas permanecieron iguales; cambiaron el estado y la fecha de búsqueda de PRUEBA-001.

Esa ejecución reveló que las cinco URLs de Idealista respondían 301 al faltar la barra final. Se corrigió únicamente ese formato y se comprobaron las mismas fichas mediante lecturas HTTP, sin Tavily ni escrituras en la hoja:

| Anuncio | HTTP | Precio leído | Ocupación detectada | Motivo para descartarlo |
| --- | --- | --- | --- | --- |
| 111045307 | 404 | — | — | Ficha no encontrada |
| 106356204 | 200 | 71.000 € | Sí | Precio inferior a 200.000 € y ocupación |
| 112641161 | 200 | 194.999 € | No | Precio inferior a 200.000 € |
| 109272862 | 200 | 155.000 € | No | Precio inferior a 200.000 € |
| 110364422 | 404 | — | — | Ficha no encontrada |

«No detectada» no certifica ausencia de ocupación. Los cinco candidatos de esa muestra quedan fuera por precio o vigencia. Esto no demuestra que no existan otras viviendas válidas en el mercado.

La búsqueda completa no se repitió después del ajuste de la barra final. La función temporal de lectura se retiró y la versión final guardada volvió a compararse con el archivo local probado. PRUEBA-001 permanece en `no_matches`.

## Verificación local

`node tests/critical-validation.test.cjs`: 22 pruebas específicas superadas, incluida integración simulada del guardado, recuperación de precios, ocupación, 404, URL canónica, límites, deduplicación y prioridades. Sin red ni Google Sheets. Comprobación de sintaxis superada.

La suite histórica `tests/buyer-search.test.cjs` sigue pendiente de adecuación a criterios anteriores de mínimos y preferencias: ya fallaba antes de esta corrección. No se alteraron esos criterios para satisfacerla.

Evidencia: `link-check-20261005.jpg`, `link-check-20261005.txt` y `prueba-001-20261005.jpg`.
