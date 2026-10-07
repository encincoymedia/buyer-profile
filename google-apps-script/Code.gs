const SPREADSHEET_ID = "1tMeqaKrxuLcfofKzWIe0kSTsfbzDAN6u_M4r_ujNaeA";
const SHEET_NAME = "Buyer Profiles";

const HEADERS = [
  "timestamp",
  "clientCode",
  "market",
  "buyerStatus",

  "targetDate",
  "maxPrice",
  "targetPrice",
  "mortgageAmount",
  "ownFunds",
  "renovationBudget",

  "mainCity",
  "priorityZones",
  "acceptableZones",
  "excludedZones",
  "nearbyMunicipalities",
  "radius",
  "commute",
  "transport",
  "nearbyPoint",

  "propertyTypes",
  "minBedrooms",
  "idealBedrooms",
  "minBathrooms",
  "minArea",
  "idealArea",

  "feature_Ascensor",
  "feature_Terraza",
  "feature_Balcón",
  "feature_Garaje",
  "feature_Trastero",
  "feature_Exterior",
  "feature_Buena luz natural",
  "feature_Aire acondicionado",
  "feature_Calefacción",
  "feature_Piscina",
  "feature_Zonas comunes",
  "feature_Accesibilidad",
  "feature_Transporte público cercano",

  "acceptedFloors",
  "noElevator",
  "buildingAge",
  "acceptedStates",
  "renovationLevel",

  "disqualifiers",
  "otherDisqualifiers",

  "idealHome",
  "instantReject",
  "additionalNotes",

  "matchingFactor1",
  "matchingFactor2",
  "matchingFactor3",
  "matchingFactor4",
  "matchingFactor5",

  "anonymizedConsent",
  "purposeConsent",
  "schemaVersion",

  "searchRequested",
  "searchStatus",
  "searchRequestedAt",

  "match1",
  "match2",
  "match3",
  "match4",
  "match5",
  "match6",
  "match7",
  "match8",
  "match9",
  "match10",

  "searchedAt"
];


/*
  Permite comprobar desde el navegador que
  la aplicación web está publicada correctamente.
*/
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: "Buyer Profile Web App funcionando"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}


/*
  Recibe el Buyer Profile enviado desde el formulario.
*/
function doPost(e) {
  try {

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No se recibieron datos.");
    }

    const data = JSON.parse(e.postData.contents);

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
    }

    /*
      Si la hoja estuviera vacía, crea los encabezados.
    */
    if (sheet.getLastRow() === 0) {
      sheet
        .getRange(1, 1, 1, HEADERS.length)
        .setValues([HEADERS]);

      sheet.setFrozenRows(1);
    }

    const featurePriorities = data.featurePriorities || {};
    const matchingFactors = data.matchingFactors || [];

    const rowData = {
      ...data,

      timestamp: new Date(),

      transport: joinArray(data.transport),
      propertyTypes: joinArray(data.propertyTypes),
      acceptedFloors: joinArray(data.acceptedFloors),
      acceptedStates: joinArray(data.acceptedStates),
      disqualifiers: joinArray(data.disqualifiers),

      "feature_Ascensor":
        featurePriorities["Ascensor"] || "",

      "feature_Terraza":
        featurePriorities["Terraza"] || "",

      "feature_Balcón":
        featurePriorities["Balcón"] || "",

      "feature_Garaje":
        featurePriorities["Garaje"] || "",

      "feature_Trastero":
        featurePriorities["Trastero"] || "",

      "feature_Exterior":
        featurePriorities["Exterior"] || "",

      "feature_Buena luz natural":
        featurePriorities["Buena luz natural"] || "",

      "feature_Aire acondicionado":
        featurePriorities["Aire acondicionado"] || "",

      "feature_Calefacción":
        featurePriorities["Calefacción"] || "",

      "feature_Piscina":
        featurePriorities["Piscina"] || "",

      "feature_Zonas comunes":
        featurePriorities["Zonas comunes"] || "",

      "feature_Accesibilidad":
        featurePriorities["Accesibilidad"] || "",

      "feature_Transporte público cercano":
        featurePriorities["Transporte público cercano"] || "",

      matchingFactor1:
        getMatchingFactor(matchingFactors, 0),

      matchingFactor2:
        getMatchingFactor(matchingFactors, 1),

      matchingFactor3:
        getMatchingFactor(matchingFactors, 2),

      matchingFactor4:
        getMatchingFactor(matchingFactors, 3),

      matchingFactor5:
        getMatchingFactor(matchingFactors, 4),

      /*
        Estos campos solicitan la búsqueda después de guardar el perfil.
      */
      searchRequested: true,
      searchStatus: "pending",
      searchRequestedAt: new Date(),

      match1: "",
      match2: "",
      match3: "",
      match4: "",
      match5: "",
      match6: "",
      match7: "",
      match8: "",
      match9: "",
      match10: "",

      searchedAt: ""
    };

    // Guarda primero y protege los envíos simultáneos. Se respetan las
    // columnas existentes aunque alguien las haya reordenado.
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (HEADERS.some(h => !headers.includes(h)) ||
          new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) {
        throw new Error("Los encabezados no coinciden con Buyer Profiles.");
      }
      const row = headers.map(header => normalize(rowData[header]));
      sheet.appendRow(row);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    // Un fallo de búsqueda no convierte en fallido un perfil ya guardado.
    let searchStatus = "pending";
    try {
      const result = runBuyerSearch_({
        clientCode: String(rowData.clientCode),
        timestamp: String(normalize(rowData.timestamp))
      });
      searchStatus = result.status;
    } catch (_) {
      searchStatus = "error";
      console.error("[Buyer Search] Perfil guardado; no pudo completarse la búsqueda. Revisar la fila y Ejecuciones.");
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        clientCode: data.clientCode || "",
        searchStatus: searchStatus
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


function joinArray(value) {
  if (Array.isArray(value)) {
    return value.join(" | ");
  }

  return value || "";
}


function getMatchingFactor(factors, index) {
  if (!Array.isArray(factors)) {
    return "";
  }

  const item = factors[index];

  if (!item) {
    return "";
  }

  if (typeof item === "string") {
    return item;
  }

  return item.factor || item.name || item.value || "";
}


function normalize(value) {

  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  if (Array.isArray(value)) {
    return value.join(" | ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}
