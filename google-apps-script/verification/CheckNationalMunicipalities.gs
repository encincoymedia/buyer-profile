// Comprobación puntual sin acceder a Sheets ni consultar servicios externos.
// Se retira del editor antes de publicar.
function checkNationalMunicipalities20261007() {
  const cases = [
    ["Torrejón", "Madrid", "Torrejón de Ardoz"],
    ["Alcalá", "Madrid", "Alcalá de Henares"],
    ["Chiclana", "Cádiz", "Chiclana de la Frontera"],
    ["Santiago", "A Coruña", "Santiago de Compostela"],
    ["Hospitalet", "Barcelona", "L'Hospitalet de Llobregat"],
    ["Sant Cugat", "Barcelona", "Sant Cugat del Vallès"],
    ["San Sebastián", "Gipuzkoa", "Donostia"],
    ["San Sebastián", "Madrid", "San Sebastián de los Reyes"]
  ];
  const results = cases.map(([input, province, expected]) => {
    const actual = BuyerSearch.resolvePlace(input, province);
    if (actual.status !== "resolved" || actual.canonical !== expected) throw new Error("Municipio incorrecto: " + input + " / " + province);
    return { input, province, municipality: actual.canonical };
  });
  const profile = { mainCity: "Torrejón", market: "Madrid", mortgageAmount: 450000, ownFunds: 50000, targetPrice: 350000 };
  const criteria = BuyerSearch.makeCriteria(profile);
  if (!criteria.query.includes("Torrejón de Ardoz (Madrid)") || criteria.minPrice !== 300000 || criteria.maxPrice !== 500000) throw new Error("Consulta incorrecta.");
  let ambiguousStopped = false;
  try { BuyerSearch.makeCriteria({ ...profile, mainCity: "Pozuelo" }); }
  catch (error) { ambiguousStopped = /ambigua/.test(error.message); }
  if (!ambiguousStopped) throw new Error("No detuvo un nombre ambiguo.");
  console.info(JSON.stringify({ checked: results, query: criteria.query, ambiguousStopped, tavilyCalls: 0, sheetWrites: 0 }));
}
