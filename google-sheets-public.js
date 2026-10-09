import { spreadsheetId } from "./admin/config.js";

// La web pública lee solo las hojas Sheet1 y Sheet2 publicadas en Google Sheets.
export function loadPublicSheet(sheetName) {
  return new Promise((resolve, reject) => {
    const callbackName = `sheetsCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => finish(new Error("Google Sheets tardó demasiado en responder.")), 15000);
    let settled = false;

    function finish(error, value) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
      if (error) reject(error);
      else resolve(value);
    }

    window[callbackName] = (response) => {
      if (response?.status !== "ok" || !response.table) {
        finish(new Error(response?.errors?.[0]?.detailed_message || "No se pudo leer la hoja publicada."));
        return;
      }
      const headers = response.table.cols.map((column) => column.label || column.id || "");
      const rows = response.table.rows.map((row) => headers.map((_, index) => {
        const cell = row.c?.[index];
        return cell?.f ?? cell?.v ?? "";
      }));
      finish(null, [headers, ...rows]);
    };
    script.onerror = () => finish(new Error("No se pudo cargar la hoja publicada."));
    const params = new URLSearchParams({
      tqx: `responseHandler:${callbackName}`,
      sheet: sheetName,
      headers: "1"
    });
    script.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?${params}`;
    document.head.append(script);
  });
}
