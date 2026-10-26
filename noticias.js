const status = document.querySelector("#news-status");
const list = document.querySelector("#news-list");
const empty = document.querySelector("#news-empty");
const normalize = value => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function newsDate(value, XLSX, date1904) {
  let parts;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value, { date1904 });
    if (parsed) parts = [parsed.y, parsed.m, parsed.d];
  } else {
    const text = String(value ?? "").trim();
    const spanish = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (spanish) parts = [+spanish[3], +spanish[2], +spanish[1]];
    else if (iso) parts = [+iso[1], +iso[2], +iso[3]];
  }
  if (!parts) return null;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

async function loadNews() {
  try {
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
    const response = await fetch("assets/database/Noticias.xlsx", { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo descargar Noticias.xlsx (${response.status}).`);
    const workbook = XLSX.read(await response.arrayBuffer());
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("El archivo no contiene hojas.");
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
    const headers = (rows.shift() ?? []).map(normalize);
    const dateIndex = headers.indexOf("fecha");
    const textIndex = headers.indexOf("noticia");
    if (dateIndex < 0 || textIndex < 0) throw new Error("Faltan las columnas Fecha y Noticia.");
    const news = rows.map(row => ({
      text: String(row[textIndex] ?? "").trim(),
      date: newsDate(row[dateIndex], XLSX, Boolean(workbook.Workbook?.WBProps?.date1904))
    })).filter(item => item.text).sort((a, b) => (b.date?.getTime() ?? -Infinity) - (a.date?.getTime() ?? -Infinity));
    const formatter = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    const cards = news.map(item => {
      const article = document.createElement("article");
      article.className = "news-card";
      if (item.date) {
        const time = document.createElement("time");
        time.dateTime = item.date.toISOString().slice(0, 10);
        time.textContent = formatter.format(item.date);
        article.append(time);
      }
      const copy = document.createElement("p");
      copy.textContent = item.text;
      article.append(copy);
      return article;
    });
    list.replaceChildren(...cards);
    empty.hidden = news.length > 0;
    status.hidden = true;
  } catch (error) {
    console.error("No se pudieron cargar las noticias:", error);
    status.textContent = "No se pudieron cargar las noticias. Inténtalo de nuevo más tarde.";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn btn-secondary btn-small";
    retry.textContent = "Reintentar";
    retry.addEventListener("click", () => {
      status.textContent = "Cargando noticias…";
      loadNews();
    }, { once: true });
    status.append(" ", retry);
  }
}

loadNews();
