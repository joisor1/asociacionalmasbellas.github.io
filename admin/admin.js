import {
  googleOAuthClientId,
  spreadsheetId,
  animalSheetName,
  adoptedSheetName,
  allowedAdminEmails,
  adminResources
} from "./config.js";

const $ = (id) => document.getElementById(id);
const loginButton = $("google-login");
const status = $("status");
const account = $("account");
const editor = $("sheet-editor");
const sheetStatus = $("sheet-status");
const form = $("animal-form");
const fieldsContainer = $("form-fields");
const recordsList = $("records-list");
const sheets = new Map();
let activeSheetName = animalSheetName;
let editingRow = null;
let accessToken = "";
let tokenClient = null;

$("year").textContent = new Date().getFullYear();
$("spreadsheet-link").href = adminResources.spreadsheet;
$("drive-link").href = adminResources.driveFolder;

const normalize = (value) => String(value ?? "").trim().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const definitions = [
  { key: "name", label: "Nombre", aliases: ["nombre", "name"], required: true },
  { key: "age", label: "Edad", aliases: ["edad", "age"], required: true },
  { key: "gender", label: "Género", aliases: ["genero", "sexo", "gender"] },
  { key: "breed", label: "Raza", aliases: ["raza", "raza del perro", "breed"] },
  { key: "folder", label: "Carpeta de fotos", aliases: ["carpeta", "folder"] },
  { key: "phone", label: "Contacto", aliases: ["telefono", "numero de telefono", "whatsapp", "phone"] },
  { key: "description", label: "Descripción", aliases: ["descripcion", "description"], required: true, wide: true, multiline: true },
  { key: "state", label: "Estado web", aliases: ["estado web", "estado", "visibilidad"] }
];

function setStatus(message, type = "") {
  status.textContent = message;
  status.className = type ? `notice ${type}` : "notice";
  status.hidden = !message;
}

function setSheetStatus(message, type = "") {
  sheetStatus.textContent = message;
  sheetStatus.className = `sheet-status${type ? ` is-${type}` : ""}`;
}

function columnName(number) {
  let result = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result;
}

function getFieldIndex(headers, definition) {
  const aliases = definition.aliases.map(normalize);
  return headers.findIndex((header) => aliases.includes(normalize(header)));
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || `Google Sheets respondió ${response.status}.`;
    if (response.status === 401) throw new Error("La autorización de Google ha caducado. Cierra sesión y vuelve a entrar.");
    if (response.status === 403) throw new Error("Esta cuenta no tiene permisos de Editor en la hoja o falta habilitar Google Sheets API.");
    throw new Error(message);
  }
  return payload;
}

async function readSheet(sheetName) {
  const range = encodeURIComponent(`'${sheetName}'!A:ZZ`);
  const data = await apiRequest(`spreadsheets/${spreadsheetId}/values/${range}?majorDimension=ROWS`);
  const values = data.values || [];
  if (!values.length) throw new Error(`${sheetName} no tiene encabezados en la primera fila.`);
  const headers = values[0].map((value) => String(value ?? ""));
  const rows = values.slice(1).map((row) => row || []);
  const nameIndex = getFieldIndex(headers, definitions[0]);
  if (nameIndex < 0) throw new Error(`${sheetName} necesita una columna Nombre.`);
  return { headers, rows };
}

async function loadAllSheets() {
  const [spreadsheet, animals, adopted] = await Promise.all([
    apiRequest(`spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`),
    readSheet(animalSheetName),
    readSheet(adoptedSheetName)
  ]);
  const ids = new Map((spreadsheet.sheets || []).map((sheet) => [sheet.properties.title, sheet.properties.sheetId]));
  for (const [name, data] of [[animalSheetName, animals], [adoptedSheetName, adopted]]) {
    if (!ids.has(name)) throw new Error(`No existe la pestaña ${name} en la hoja enlazada.`);
    sheets.set(name, { ...data, sheetId: ids.get(name) });
  }
}

function displayUser(user) {
  $("user-name").textContent = user.name || "Cuenta de Google";
  $("user-email").textContent = user.email || "";
  const photo = $("user-photo");
  if (user.picture) {
    photo.src = user.picture;
    photo.hidden = false;
  }
}

function renderRecords() {
  const sheet = sheets.get(activeSheetName);
  recordsList.replaceChildren();
  const nameIndex = getFieldIndex(sheet.headers, definitions[0]);
  const ageIndex = getFieldIndex(sheet.headers, definitions[1]);
  const folderIndex = getFieldIndex(sheet.headers, definitions[4]);
  const records = sheet.rows.map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[nameIndex] ?? "").trim());
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Todavía no hay animales en esta pestaña.";
    recordsList.append(empty);
    return;
  }
  for (const { row, rowNumber } of records) {
    const item = document.createElement("div");
    item.className = "record-row";
    const label = document.createElement("div");
    label.className = "record-name";
    label.append(document.createTextNode(String(row[nameIndex] ?? "")));
    const meta = document.createElement("small");
    meta.className = "record-meta";
    const details = [ageIndex >= 0 ? row[ageIndex] : "", folderIndex >= 0 ? row[folderIndex] : ""].filter(Boolean);
    meta.textContent = details.join(" · ");
    label.append(meta);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "record-action";
    edit.dataset.action = "edit";
    edit.dataset.row = String(rowNumber);
    edit.textContent = "Editar";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "record-action delete";
    remove.dataset.action = "delete";
    remove.dataset.row = String(rowNumber);
    remove.textContent = "Eliminar";
    item.append(label, edit, remove);
    recordsList.append(item);
  }
}

function renderFormFields(values = []) {
  const sheet = sheets.get(activeSheetName);
  fieldsContainer.replaceChildren();
  definitions.forEach((definition) => {
    const index = getFieldIndex(sheet.headers, definition);
    if (index < 0) return;
    const wrapper = document.createElement("label");
    wrapper.className = `form-field${definition.wide ? " is-wide" : ""}`;
    const title = document.createElement("span");
    title.textContent = definition.label;
    const input = document.createElement(definition.multiline ? "textarea" : "input");
    input.name = definition.key;
    input.dataset.column = String(index);
    if (!definition.multiline) input.type = "text";
    if (definition.required) input.required = true;
    input.value = String(values[index] ?? "");
    wrapper.append(title, input);
    fieldsContainer.append(wrapper);
  });
}

function openForm(rowNumber = null) {
  const sheet = sheets.get(activeSheetName);
  editingRow = rowNumber;
  const existing = rowNumber === null ? [] : sheet.rows[rowNumber - 2] || [];
  renderFormFields(existing);
  $("form-title").textContent = rowNumber === null ? "Añadir animal" : "Editar animal";
  $("cancel-edit").hidden = rowNumber === null;
  form.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  fieldsContainer.querySelector("input, textarea")?.focus({ preventScroll: true });
}

function closeForm() {
  editingRow = null;
  form.reset();
  form.hidden = true;
}

async function saveRecord(event) {
  event.preventDefault();
  const sheet = sheets.get(activeSheetName);
  const values = editingRow === null
    ? Array(sheet.headers.length).fill("")
    : [...(sheet.rows[editingRow - 2] || [])];
  while (values.length < sheet.headers.length) values.push("");
  fieldsContainer.querySelectorAll("[data-column]").forEach((input) => {
    values[Number(input.dataset.column)] = input.value.trim();
  });
  if (activeSheetName === animalSheetName) {
    const ageIndex = getFieldIndex(sheet.headers, definitions[1]);
    const descriptionIndex = getFieldIndex(sheet.headers, definitions[6]);
    if (!values[ageIndex]?.trim() || !values[descriptionIndex]?.trim()) {
      setSheetStatus("Para animales en adopción hacen falta Nombre, Edad y Descripción.", "error");
      return;
    }
  }
  const saveButton = form.querySelector("[type=submit]");
  saveButton.disabled = true;
  setSheetStatus("Guardando cambios en Google Sheets…");
  try {
    if (editingRow === null) {
      const range = encodeURIComponent(`'${activeSheetName}'!A:ZZ`);
      await apiRequest(`spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: "POST",
        body: JSON.stringify({ majorDimension: "ROWS", values: [values] })
      });
    } else {
      const range = encodeURIComponent(`'${activeSheetName}'!A${editingRow}:${columnName(sheet.headers.length)}${editingRow}`);
      await apiRequest(`spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
        method: "PUT",
        body: JSON.stringify({ majorDimension: "ROWS", values: [values] })
      });
    }
    closeForm();
    await loadAllSheets();
    renderRecords();
    setSheetStatus("Guardado en Google Sheets. La web pública leerá estos datos al recargarse.", "success");
  } catch (error) {
    setSheetStatus(error.message, "error");
  } finally {
    saveButton.disabled = false;
  }
}

async function deleteRecord(rowNumber) {
  const sheet = sheets.get(activeSheetName);
  const nameIndex = getFieldIndex(sheet.headers, definitions[0]);
  const name = sheet.rows[rowNumber - 2]?.[nameIndex] || "este animal";
  if (!window.confirm(`¿Eliminar a ${name} de ${activeSheetName}?`)) return;
  setSheetStatus("Eliminando fila…");
  try {
    await apiRequest(`spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests: [{ deleteDimension: {
        range: { sheetId: sheet.sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber }
      } }] })
    });
    if (editingRow === rowNumber) closeForm();
    await loadAllSheets();
    renderRecords();
    setSheetStatus("Fila eliminada de Google Sheets.", "success");
  } catch (error) {
    setSheetStatus(error.message, "error");
  }
}

function setActiveSheet(sheetName) {
  activeSheetName = sheetName;
  closeForm();
  document.querySelectorAll(".sheet-tab").forEach((button) => {
    const selected = button.dataset.sheet === sheetName;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  $("add-animal").textContent = sheetName === animalSheetName ? "＋ Añadir animal" : "＋ Añadir animal adoptado";
  renderRecords();
  setSheetStatus("");
}

async function loadIdentityLibrary() {
  if (window.google?.accounts?.oauth2) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("No se pudo cargar el acceso de Google."));
    document.head.append(script);
  });
}

function onTokenResponse(response) {
  (async () => {
    if (response.error || !response.access_token) {
      setStatus("Google no concedió acceso a la hoja. Revisa el consentimiento e inténtalo de nuevo.");
      loginButton.disabled = false;
      return;
    }
    accessToken = response.access_token;
    try {
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!userResponse.ok) throw new Error("No se pudo verificar la cuenta de Google.");
      const user = await userResponse.json();
      const email = String(user.email || "").toLowerCase();
      if (!user.email_verified || (allowedAdminEmails.length && !allowedAdminEmails.map((item) => item.toLowerCase()).includes(email))) {
        throw new Error("Esta cuenta no está autorizada para esta página.");
      }
      await loadAllSheets();
      displayUser(user);
      loginButton.hidden = true;
      account.hidden = false;
      editor.hidden = false;
      setActiveSheet(animalSheetName);
      setStatus("");
    } catch (error) {
      accessToken = "";
      setStatus(error.message);
    } finally {
      loginButton.disabled = false;
    }
  })();
}

loginButton.addEventListener("click", () => {
  setStatus("");
  loginButton.disabled = true;
  tokenClient.requestAccessToken({ prompt: "select_account" });
});

$("logout").addEventListener("click", () => {
  accessToken = "";
  sheets.clear();
  editor.hidden = true;
  account.hidden = true;
  loginButton.hidden = false;
  closeForm();
  setStatus("");
});

$("add-animal").addEventListener("click", () => openForm());
$("cancel-edit").addEventListener("click", closeForm);
form.addEventListener("submit", saveRecord);
document.querySelectorAll(".sheet-tab").forEach((button) => button.addEventListener("click", () => setActiveSheet(button.dataset.sheet)));
recordsList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const rowNumber = Number(button.dataset.row);
  if (button.dataset.action === "edit") openForm(rowNumber);
  if (button.dataset.action === "delete") deleteRecord(rowNumber);
});

try {
  if (!googleOAuthClientId || googleOAuthClientId.startsWith("REEMPLAZAR_")) throw new Error("Falta el ID de cliente OAuth en admin/config.js.");
  await loadIdentityLibrary();
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: googleOAuthClientId,
    scope: "openid email profile https://www.googleapis.com/auth/spreadsheets",
    callback: onTokenResponse
  });
  loginButton.disabled = false;
} catch (error) {
  $("config-notice").hidden = false;
  setStatus(error.message);
}
