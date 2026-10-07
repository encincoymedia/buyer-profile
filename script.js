/* Configura aquí la URL pública del despliegue de Google Apps Script. */
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyikU88UJU9XM_VnACN_sT-hYDebavFZjqmKb4EaNaqzr7_aBuhB5zMU1RWUPvbfwQVDQ/exec";

// Diagnóstico temporal: ejecutar manualmente desde la consola del navegador.
window.testAppsScriptConnection = async function () {
  const payload = {
    clientCode: "TEST-BROWSER",
    searchRequested: true,
    searchStatus: "pending"
  };
  return fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
};

const choices = {
  transportChoices: { name: "transport", values: ["Coche", "Metro", "Tren/Cercanías", "Autobús", "Bicicleta", "A pie", "Indiferente"] },
  propertyTypes: { name: "propertyTypes", values: ["Piso", "Ático", "Bajo", "Dúplex", "Casa", "Chalet", "Adosado", "Obra nueva", "Indiferente"] },
  floorChoices: { name: "acceptedFloors", values: ["Bajo", "1ª", "2ª", "3ª", "4ª o superior", "Ático", "Indiferente"] },
  acceptedStates: { name: "acceptedStates", values: ["Nueva", "Reformada", "Buen estado", "Necesita actualización ligera", "Reforma parcial", "Reforma integral"] },
  disqualifiers: { name: "disqualifiers", values: ["Vivienda ocupada", "Vivienda alquilada", "Nuda propiedad", "No visitable", "Subasta", "Cesión de remate", "Sin ascensor", "Reforma integral", "Interior", "Bajo", "Sin garaje", "Fuera de las zonas seleccionadas"] },
  matchingFactors: { name: "matchingFactors", values: ["Precio", "Zona", "Tamaño", "Habitaciones", "Estado de la vivienda", "Terraza/balcón", "Garaje", "Luz natural", "Transporte", "Servicios cercanos", "Edificio", "Potencial de reforma"] }
};

const features = ["Ascensor", "Terraza", "Balcón", "Garaje", "Trastero", "Exterior", "Buena luz natural", "Aire acondicionado", "Calefacción", "Piscina", "Zonas comunes", "Accesibilidad", "Transporte público cercano"];
const priorities = ["Obligatorio", "Importante", "Deseable", "Indiferente", "No lo quiere"];
const priorityShort = { "Obligatorio": "Obligatorio", "Importante": "Importante", "Deseable": "Deseable", "Indiferente": "Indiferente", "No lo quiere": "No lo quiere" };

function renderChoices() {
  Object.entries(choices).forEach(([containerId, config]) => {
    const container = document.getElementById(containerId);
    config.values.forEach((value, index) => {
      const label = document.createElement("label");
      label.className = "choice";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = config.name;
      input.value = value;
      input.id = `${config.name}-${index}`;
      if (containerId === "matchingFactors") input.addEventListener("change", onFactorChange);
      const text = document.createElement("span");
      text.textContent = value;
      label.append(input, text);
      container.append(label);
    });
  });
  renderFeaturePriorities();
}

function renderFeaturePriorities() {
  const root = document.getElementById("featurePriorities");
  features.forEach((feature, index) => {
    const row = document.createElement("div");
    row.className = "priority-row";
    const name = document.createElement("span");
    name.className = "priority-name";
    name.textContent = feature;
    const segment = document.createElement("div");
    segment.className = "segmented";
    segment.setAttribute("role", "radiogroup");
    segment.setAttribute("aria-label", `Prioridad para ${feature}`);
    priorities.forEach((priority, pIndex) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `feature_${index}`;
      input.value = priority;
      input.setAttribute("aria-label", `${feature}: ${priority}`);
      const text = document.createElement("span");
      text.textContent = priorityShort[priority];
      label.append(input, text);
      segment.append(label);
    });
    row.append(name, segment);
    root.append(row);
  });
}

let selectedFactors = [];
function onFactorChange(event) {
  const checked = [...document.querySelectorAll('input[name="matchingFactors"]:checked')];
  if (checked.length > 5) {
    event.target.checked = false;
    showFactorError("Puedes seleccionar un máximo de 5 aspectos.");
    return;
  }
  selectedFactors = checked.map(input => input.value);
  showFactorError("");
  renderSelectedFactors();
}

function showFactorError(message) {
  document.getElementById("factor-error").textContent = message;
}

function renderSelectedFactors() {
  const root = document.getElementById("selected-priorities");
  root.replaceChildren();
  selectedFactors.forEach((factor, index) => {
    const row = document.createElement("div");
    row.className = "selected-row";
    const rank = document.createElement("span");
    rank.className = "rank";
    rank.textContent = String(index + 1).padStart(2, "0");
    const label = document.createElement("span");
    label.textContent = factor;
    const up = document.createElement("button");
    up.type = "button";
    up.className = "move-button";
    up.textContent = "↑";
    up.setAttribute("aria-label", `Subir ${factor} de prioridad`);
    up.disabled = index === 0;
    up.addEventListener("click", () => moveFactor(index, -1));
    const down = document.createElement("button");
    down.type = "button";
    down.className = "move-button";
    down.textContent = "↓";
    down.setAttribute("aria-label", `Bajar ${factor} de prioridad`);
    down.disabled = index === selectedFactors.length - 1;
    down.addEventListener("click", () => moveFactor(index, 1));
    row.append(rank, label, up, down);
    root.append(row);
  });
}

function moveFactor(index, offset) {
  const destination = index + offset;
  if (destination < 0 || destination >= selectedFactors.length) return;
  [selectedFactors[index], selectedFactors[destination]] = [selectedFactors[destination], selectedFactors[index]];
  renderSelectedFactors();
}

const form = document.getElementById("buyer-form");
const submitButton = document.getElementById("submit-button");
const errorBox = document.getElementById("form-error");
const marketSelect = document.getElementById("market");
const otherMarketField = document.getElementById("otherMarketField");
const otherMarketInput = document.getElementById("otherMarket");

marketSelect.addEventListener("change", () => {
  const isOther = marketSelect.value === "Otra";
  otherMarketField.hidden = !isOther;
  otherMarketInput.required = isOther;
  if (!isOther) clearFieldError(otherMarketInput);
});

document.querySelectorAll("#buyer-form input, #buyer-form select, #buyer-form textarea").forEach(control => {
  control.addEventListener("input", () => clearFieldError(control));
  control.addEventListener("change", () => clearFieldError(control));
});

function clearFieldError(control) {
  control.removeAttribute("aria-invalid");
  const field = control.closest(".field");
  if (field) {
    const message = field.querySelector(".field-error");
    if (message) message.textContent = "";
  }
}

function setError(control, message) {
  control.setAttribute("aria-invalid", "true");
  const field = control.closest(".field");
  const error = field?.querySelector(".field-error");
  if (error) error.textContent = message;
}

function validateForm() {
  clearErrors();
  const requiredControls = [...form.querySelectorAll("[required]")].filter(control => control.type !== "checkbox");
  let firstInvalid = null;
  requiredControls.forEach(control => {
    if (!control.value.trim()) {
      setError(control, "Este campo es obligatorio.");
      firstInvalid ||= control;
    }
  });
  ["maxPrice", "targetPrice", "mortgageAmount", "ownFunds", "renovationBudget", "minArea", "idealArea"].forEach(id => {
    const control = document.getElementById(id);
    if (control.value && Number(control.value) < 0) {
      setError(control, "Introduce un valor igual o superior a cero.");
      firstInvalid ||= control;
    }
  });
  const maxPrice = Number(document.getElementById("maxPrice").value);
  const targetPriceControl = document.getElementById("targetPrice");
  if (targetPriceControl.value && maxPrice && Number(targetPriceControl.value) > maxPrice) {
    setError(targetPriceControl, "El precio objetivo no puede superar el precio máximo.");
    firstInvalid ||= targetPriceControl;
  }
  const minArea = Number(document.getElementById("minArea").value);
  const idealAreaControl = document.getElementById("idealArea");
  if (idealAreaControl.value && minArea && Number(idealAreaControl.value) < minArea) {
    setError(idealAreaControl, "La superficie ideal no puede ser inferior a la mínima.");
    firstInvalid ||= idealAreaControl;
  }
  const consentInputs = [...form.querySelectorAll('.consent-check input[type="checkbox"]')];
  const consentError = document.querySelector(".consent-error");
  if (consentInputs.some(input => !input.checked)) {
    consentError.textContent = "Debes confirmar ambos puntos para guardar el perfil.";
    firstInvalid ||= consentInputs.find(input => !input.checked);
  }
  const missingCode = document.getElementById("clientCode").value.trim() === "";
  const messages = [];
  if (firstInvalid) messages.push("Revisa los campos obligatorios y los valores señalados.");
  if (missingCode) messages.push("Introduce un código interno para el perfil.");
  return { valid: !firstInvalid, firstInvalid, messages };
}

function clearErrors() {
  errorBox.hidden = true;
  errorBox.textContent = "";
  document.querySelectorAll(".field-error").forEach(error => error.textContent = "");
  document.querySelectorAll('[aria-invalid="true"]').forEach(control => control.removeAttribute("aria-invalid"));
}

function serializeForm() {
  const data = {};
  [...form.elements].forEach(control => {
    if (!control.name || control.type === "button" || control.type === "submit") return;
    if (control.type === "checkbox") {
      if (control.name === "anonymizedConsent" || control.name === "purposeConsent") data[control.name] = control.checked;
      else if (control.checked) (data[control.name] ||= []).push(control.value);
      else if (!(control.name in data)) data[control.name] = [];
      return;
    }
    if (control.type === "radio") {
      if (control.checked) data[control.name] = control.value;
      else if (!(control.name in data)) data[control.name] = "";
      return;
    }
    data[control.name] = control.value.trim();
  });
  data.market = data.market === "Otra" ? data.otherMarket : data.market;
  delete data.otherMarket;
  data.featurePriorities = Object.fromEntries(features.map((feature, index) => {
    const selected = form.querySelector(`input[name="feature_${index}"]:checked`);
    return [feature, selected ? selected.value : ""];
  }));
  data.matchingFactors = selectedFactors.map((factor, index) => ({ factor, priority: index + 1 }));
  data.schemaVersion = "1.0";
  data.searchRequested = true;
  data.searchStatus = "pending";
  data.searchRequestedAt = new Date().toISOString();
  return data;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const validation = validateForm();
  if (!validation.valid) {
    errorBox.textContent = "Revisa los campos obligatorios y las confirmaciones antes de continuar.";
    errorBox.hidden = false;
    errorBox.focus();
    validation.firstInvalid?.focus();
    validation.firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (!GOOGLE_APPS_SCRIPT_URL.startsWith("https://script.google.com/macros/s/")) {
    showError("Configura la URL del Web App de Google Apps Script en script.js antes de enviar.");
    return;
  }
  const payload = serializeForm();
  console.info("[Buyer Profile] Submit detectado; payload construido.", {
    clientCode: payload.clientCode,
    fieldNames: Object.keys(payload),
    searchStatus: payload.searchStatus
  });
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "GUARDANDO Y PREPARANDO BÚSQUEDA…";
  try {
    console.info("[Buyer Profile] Iniciando POST a Google Apps Script.");
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
    console.info("[Buyer Profile] fetch completado.", {
      responseType: response.type,
      status: response.status
    });
    // Con no-cors, la respuesta opaca confirma la finalización del envío,
    // pero no permite comprobar el resultado del guardado en Apps Script.
    showSuccess(payload.clientCode);
  } catch (error) {
    console.error("[Buyer Profile] Error de red durante el POST.", error);
    showError("No hemos podido guardar el perfil. Comprueba la conexión e inténtalo nuevamente.");
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "GUARDAR Y BUSCAR PROPIEDADES";
  }
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  errorBox.focus();
  errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showSuccess(code) {
  document.querySelector(".form-shell").hidden = true;
  document.querySelector(".intro").hidden = true;
  document.getElementById("success-code").textContent = code;
  const success = document.getElementById("success-panel");
  success.hidden = false;
  success.focus();
  success.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.getElementById("new-profile").addEventListener("click", () => {
  form.reset();
  selectedFactors = [];
  renderSelectedFactors();
  showFactorError("");
  clearErrors();
  otherMarketField.hidden = true;
  otherMarketInput.required = false;
  document.getElementById("success-panel").hidden = true;
  document.querySelector(".form-shell").hidden = false;
  document.querySelector(".intro").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderChoices();
renderSelectedFactors();

// Navegación activa según la sección visible.
const navLinks = [...document.querySelectorAll(".section-nav a")];
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) navLinks.forEach(link => link.classList.toggle("active", link.hash === `#${entry.target.id}`));
    });
  }, { rootMargin: "-15% 0px -75% 0px" });
  navLinks.forEach(link => {
    const section = document.querySelector(link.hash);
    if (section) observer.observe(section);
  });
}
