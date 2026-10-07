# Buyer Profile

Formulario local para registrar perfiles de compradores anonimizados en Google Sheets y preparar una preselección de viviendas con Tavily.

## Archivos

- `index.html`, `styles.css`, `script.js`: formulario, validaciones y envío POST `no-cors` al Web App existente. No requieren compilación.
- `google-apps-script/Code.gs`: receptor basado en el código publicado proporcionado por el usuario. Guarda la fila antes de llamar a búsqueda.
- `google-apps-script/BuyerSearch.gs`: búsqueda en Idealista, Fotocasa, Pisos.com y Milanuncios, filtros por reglas y escritura de hasta diez candidatos.
- `google-apps-script/TavilyDiagnostic.gs`: diagnóstico manual de cobertura; no interviene en el envío del formulario.
- `google-apps-script/backups/Code.published-before-search.txt`: copia del receptor anterior para restaurar el guardado sin búsqueda.

## Instalación y prueba

Sigue [la guía de integración](google-apps-script/SEARCH_SETUP.md). El proyecto existente conecta el guardado con el buscador. La versión 10, publicada el 7 de octubre de 2026, incorpora el catálogo municipal nacional del INE y reconoce Madrid + Torrejón como Torrejón de Ardoz. Las abreviaturas únicas se completan dentro de la provincia; los nombres ambiguos exigen concretar la localidad antes de consumir créditos. Ver [comprobación nacional](google-apps-script/verification/national-municipalities-20261007.md).

La versión 9 centró los listados en el presupuesto y corrigió la lectura de la localidad de cada ficha. PRUEBA-001 conserva diez enlaces; Prueba-002 tiene diez candidatos de Sant Cugat para revisión, todos con algún mínimo incumplido. Ver [comprobación de municipios](google-apps-script/verification/municipalities-20261007.md) y [comprobación de cobertura anterior](google-apps-script/verification/coverage-20261007.md).

Editar archivos locales no modifica el Apps Script publicado. La URL del formulario permanece configurada en `script.js`. La clave `TAVILY_API_KEY` se guarda exclusivamente en las propiedades del proyecto de Apps Script.

## Comportamiento

Formulario → fila guardada con `pending` → búsqueda con `searching` → hasta diez candidatos en `match1`–`match10`, fecha en `searchedAt` y estado final.

La búsqueda hace cuatro consultas avanzadas sin reintentos, hasta ocho créditos Tavily por perfil. Se ejecuta después de guardar, dentro del mismo `doPost`; el botón espera mientras termina. Si falla la búsqueda, la fila permanece guardada.

La consulta incluye las zonas prioritarias y aceptables del perfil; el orden de resultados mantiene primero las prioritarias. Los listados generales sirven para descubrir hasta 60 fichas adicionales del mismo portal. Si Tavily omite los enlaces, se leen hasta ocho listados de venta de las localidades del perfil para recuperarlos del HTML. Cada ficha se lee de forma independiente; no se heredan precios ni características del listado y esa lectura se reutiliza en la comprobación final. No se añaden consultas Tavily para esta ampliación.

Cada celda de resultados contiene únicamente el enlace clicable a una propiedad. La preselección necesita revisión humana: no confirma disponibilidad, no calcula distancias y no interpreta por completo los textos libres. La ausencia de datos no se presenta como cumplimiento. Los estados y límites están explicados en la guía.

## Comprobaciones locales

```sh
node google-apps-script/tests/critical-validation.test.cjs
node google-apps-script/tests/coverage.test.cjs
node google-apps-script/tests/municipalities.test.cjs
node google-apps-script/tests/national-municipalities.test.cjs
```

Usan servicios simulados y no consumen créditos ni escriben en Google Sheets.

La suite histórica `buyer-search.test.cjs` conserva expectativas anteriores sobre mínimos y preferencias; no valida los criterios actuales. Copia anterior a la ampliación: `google-apps-script/backups/BuyerSearch.before-coverage-20261007.txt`.
