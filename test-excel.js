import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

const badge = document.querySelector("#test-badge");
const message = document.querySelector("#test-message");
const columnStatus = document.querySelector("#column-status");
const rowCount = document.querySelector("#row-count");
const publishedCount = document.querySelector("#published-count");
const sheetName = document.querySelector("#sheet-name");
const previewWrap = document.querySelector("#preview-wrap");
const previewRows = document.querySelector("#preview-rows");
const runButton = document.querySelector("#run-test");

const normalize = value => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const hiddenStates = new Set(["editando", "borrador", "oculto", "inactivo", "archivado", "no publicar"]);
const unavailableStates = new Set(["adoptado", "adoptada", "adoptados", "adoptadas", "reservado", "reservada", "no disponible"]);

function setResult(kind, label, text) {
  badge.className = `excel-test-badge is-${kind}`;
  badge.textContent = label;
  message.textContent = text;
}

async function runTest() {
  runButton.disabled = true;
  previewWrap.hidden = true;
  previewRows.replaceChildren();
  badge.className = "excel-test-badge is-loading";
  badge.textContent = "En curso";
  message.textContent = "Descargando y leyendo Animales.xlsx…";
  columnStatus.textContent = "Pendiente";
  rowCount.textContent = "—";
  publishedCount.textContent = "—";
  sheetName.textContent = "—";

  try {
    const currentSheetName = "Sheet1";
    const response = await fetch("./assets/database/Animales.xlsx", { cache: "no-store" });
    if (!response.ok) throw new Error(`El servidor respondió ${response.status} al solicitar el archivo.`);
    const workbook = XLSX.read(await response.arrayBuffer());
    const sheet = workbook.Sheets[currentSheetName];
    if (!sheet) throw new Error(`No existe la hoja ${currentSheetName} en Animales.xlsx.`);
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    const headers = (rows.shift() ?? []).map(normalize);
    const nameIndex = headers.indexOf("nombre");
    const ageIndex = headers.indexOf("edad");
    const descriptionIndex = headers.indexOf("descripcion");
    const stateIndex = headers.indexOf("estado web");
    const missing = [
      ["Nombre", nameIndex],
      ["Edad", ageIndex],
      ["Descripción", descriptionIndex]
    ].filter(([, index]) => index < 0).map(([label]) => label);

    sheetName.textContent = currentSheetName;
    const dataRows = rows.filter(row => row.some(value => String(value).trim()));
    rowCount.textContent = String(dataRows.length);
    if (missing.length) {
      columnStatus.textContent = `Faltan: ${missing.join(", ")}`;
      setResult("error", "Revisar columnas", "La primera fila debe contener Nombre, Edad y Descripción para que la web pueda mostrar los perros.");
      return;
    }

    columnStatus.textContent = "Nombre, Edad y Descripción: correctas";
    const rowsWithRequiredData = dataRows.map(row => ({
      name: String(row[nameIndex] ?? "").trim(),
      age: String(row[ageIndex] ?? "").trim(),
      description: String(row[descriptionIndex] ?? "").trim(),
      state: stateIndex < 0 ? "" : String(row[stateIndex] ?? "").trim()
    })).filter(row => row.name && row.age && row.description);
    const publishedRows = rowsWithRequiredData.filter(row => !hiddenStates.has(normalize(row.state)) && !unavailableStates.has(normalize(row.state)));
    publishedCount.textContent = String(publishedRows.length);
    previewRows.innerHTML = rowsWithRequiredData.map(row => {
      const isPublished = !hiddenStates.has(normalize(row.state)) && !unavailableStates.has(normalize(row.state));
      return `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.age)}</td><td>${escapeHtml(row.state || "—")}</td><td><span class="excel-test-row-state ${isPublished ? "is-published" : "is-hidden"}">${isPublished ? "Sí" : "No"}</span></td></tr>`;
    }).join("");
    previewWrap.hidden = false;
    setResult("success", "Lectura correcta", `${publishedRows.length} perro(s) tienen datos completos y se mostrarían en la página principal.`);
  } catch (error) {
    console.error("Diagnóstico de Animales.xlsx:", error);
    columnStatus.textContent = "No disponible";
    setResult("error", "No se pudo leer", "Comprueba que Animales.xlsx esté en assets/database y abre esta página desde la web publicada o desde un servidor local.");
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", runTest);
