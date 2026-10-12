import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

const workbookPath = "./assets/database/Rifa.xlsx";
const numberGrid = document.querySelector("#raffle-numbers");
const status = document.querySelector("#raffle-number-status");
const price = document.querySelector("#raffle-price");
const date = document.querySelector("#raffle-date");
const prizeDescription = document.querySelector("#raffle-prize-description");
const prizeText = document.querySelector("#raffle-prize-text");
const gallery = document.querySelector("#raffle-gallery");
const galleryStatus = document.querySelector("#raffle-gallery-status");
const prizeGallery = document.querySelector("#raffle-prize-gallery");
const prizeGalleryStatus = document.querySelector("#raffle-prize-gallery-status");
const collaboratorsSection = document.querySelector(".raffle-collaborators");
const collaboratorLinks = document.querySelector("#raffle-collaborator-links");
const galleryPrevious = document.querySelector(".raffle-gallery-prev");
const galleryNext = document.querySelector(".raffle-gallery-next");
const purchasedIconPath = "./media/web/dog-footprint.svg";
galleryPrevious?.addEventListener("click", () => gallery.scrollBy({ left: -gallery.clientWidth, behavior: "smooth" }));
galleryNext?.addEventListener("click", () => gallery.scrollBy({ left: gallery.clientWidth, behavior: "smooth" }));
function updateGalleryControls() {
  const showControls = gallery.children.length > 1;
  if (galleryPrevious) galleryPrevious.hidden = !showControls;
  if (galleryNext) galleryNext.hidden = !showControls;
}

function cellText(cell) {
  if (!cell || cell.v === undefined || cell.v === null || String(cell.v).trim() === "") return "";
  return String(cell.w ?? cell.v).trim();
}

function setMultilineText(element, value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) {
    element.textContent = fallback;
    return;
  }
  const nodes = text.split(/\r\n?|\n/).flatMap((line, index) =>
    index ? [document.createElement("br"), document.createTextNode(line)] : [document.createTextNode(line)]
  );
  element.replaceChildren(...nodes);
}

async function loadRaffleImages() {
  const folderUrl = "./media/rifa/";
  try {
    let filenames = [];
    const folderResponse = await fetch(folderUrl, { cache: "no-store" });
    if (folderResponse.ok) {
      const listing = new DOMParser().parseFromString(await folderResponse.text(), "text/html");
      const folderPath = new URL(folderUrl, window.location.href).pathname;
      filenames = [...listing.querySelectorAll("a[href]")]
        .map(link => {
          const url = new URL(link.getAttribute("href"), folderResponse.url);
          const name = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
          return url.origin === window.location.origin && url.pathname.startsWith(folderPath) && /^[^/\\]+\.(avif|gif|jpe?g|png|webp)$/i.test(name) ? name : null;
        })
        .filter(Boolean);
    }
    if (!filenames.length) {
      const response = await fetch("https://api.github.com/repos/joisor1/asociacionalmasbellas.github.io/contents/media/rifa?ref=main", { headers: { Accept: "application/vnd.github+json" } });
      if (!response.ok) throw new Error(`No se pudieron listar las fotos de la rifa (${response.status}).`);
      const files = await response.json();
      filenames = files
        .filter(file => file.type === "file" && /^[^/\\]+\.(avif|gif|jpe?g|png|webp)$/i.test(file.name))
        .map(file => file.name);
    }
    filenames.sort((a, b) => a.localeCompare(b, "es", { numeric: true }));

    const images = document.createDocumentFragment();
    filenames.forEach(filename => {
      const image = document.createElement("img");
      image.src = `${folderUrl}${encodeURIComponent(filename)}`;
      image.alt = "Premio de la rifa solidaria";
      image.loading = "lazy";
      image.addEventListener("error", () => { image.remove(); updateGalleryControls(); }, { once: true });
      images.append(image);
    });
    gallery.replaceChildren(images);
    updateGalleryControls();
    galleryStatus.textContent = filenames.length ? "" : "No se encontraron imágenes en media/rifa.";
  } catch (error) {
    console.warn("No se pudieron detectar las imágenes de la rifa:", error);
    gallery.replaceChildren();
    galleryStatus.textContent = "No se pudieron detectar las imágenes de la rifa.";
  }
}

async function loadPrizeImages() {
  const folderUrl = "./media/rifa/premios/";
  try {
    let filenames = [];
    const folderResponse = await fetch(folderUrl, { cache: "no-store" });
    if (folderResponse.ok) {
      const listing = new DOMParser().parseFromString(await folderResponse.text(), "text/html");
      const folderPath = new URL(folderUrl, window.location.href).pathname;
      filenames = [...listing.querySelectorAll("a[href]")]
        .map(link => {
          const url = new URL(link.getAttribute("href"), folderResponse.url);
          const name = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
          return url.origin === window.location.origin && url.pathname.startsWith(folderPath) && /^[^/\\]+\.(avif|gif|jpe?g|png|webp)$/i.test(name) ? name : null;
        })
        .filter(Boolean);
    }
    if (!filenames.length) {
      const response = await fetch("https://api.github.com/repos/joisor1/asociacionalmasbellas.github.io/contents/media/rifa/premios?ref=main", { headers: { Accept: "application/vnd.github+json" } });
      if (!response.ok) throw new Error(`No se pudieron listar las imágenes del premio (${response.status}).`);
      const files = await response.json();
      filenames = files
        .filter(file => file.type === "file" && /^[^/\\]+\.(avif|gif|jpe?g|png|webp)$/i.test(file.name))
        .map(file => file.name);
    }
    filenames.sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    const images = document.createDocumentFragment();
    filenames.forEach(filename => {
      const image = document.createElement("img");
      image.src = `${folderUrl}${encodeURIComponent(filename)}`;
      image.alt = "Premio de la rifa solidaria";
      image.loading = "lazy";
      image.addEventListener("error", () => image.remove(), { once: true });
      images.append(image);
    });
    prizeGallery.replaceChildren(images);
    prizeGalleryStatus.textContent = filenames.length ? "" : "No se encontraron imágenes en media/rifa/premios.";
  } catch (error) {
    console.warn("No se pudieron detectar las imágenes del premio:", error);
    prizeGallery.replaceChildren();
    prizeGalleryStatus.textContent = "No se pudieron detectar las imágenes de media/rifa/premios.";
  }
}

function loadCollaborators(workbook) {
  const sheetName = workbook.SheetNames.find(name => name.trim().toLocaleLowerCase("es") === "colaboradores");
  if (!sheetName) return;

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "" });
  const collaborators = rows.slice(1)
    .map(row => ({ name: String(row[0] ?? "").trim(), link: String(row[1] ?? "").trim() }))
    .filter(item => item.name);
  const links = document.createDocumentFragment();
  collaborators.forEach(({ name, link }) => {
    const button = document.createElement(link ? "a" : "button");
    button.className = "raffle-collaborator-link";
    if (link) {
      button.href = link;
      button.target = "_blank";
      button.rel = "noopener noreferrer";
    } else {
      button.type = "button";
      button.disabled = true;
      button.setAttribute("aria-label", `${name}, enlace pendiente`);
    }
    button.textContent = name;
    links.append(button);
  });
  if (!collaborators.length) return;
  collaboratorLinks.replaceChildren(links);
  collaboratorsSection.hidden = false;
}

async function loadRaffleNumbers() {
  try {
    const response = await fetch(workbookPath, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo descargar Rifa.xlsx (${response.status}).`);

    const workbook = XLSX.read(await response.arrayBuffer());
    loadCollaborators(workbook);
    const sheet = workbook.Sheets.Sheet1;
    if (!sheet) throw new Error("Rifa.xlsx no contiene la hoja Sheet1.");

    const rawPrice = cellText(sheet.C2);
    price.textContent = rawPrice
      ? (typeof sheet.C2?.v === "number" && !/[€$£]/.test(rawPrice) ? `${rawPrice} €` : rawPrice)
      : "Por confirmar";
    date.textContent = cellText(sheet.C3) || "Por confirmar";
    setMultilineText(prizeDescription, sheet.C4?.v, "Descripción del premio por confirmar.");
    setMultilineText(prizeText, sheet.C5?.v, "Descripción del premio por confirmar.");
    await loadRaffleImages();
    await loadPrizeImages();

    const maxNumber = Number(sheet.C1?.v);
    if (!Number.isInteger(maxNumber) || maxNumber < 1) {
      throw new Error("La celda C1 de Sheet1 debe contener el número máximo de la rifa.");
    }

    const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : { e: { r: 0 } };
    const purchased = new Set();
    for (let row = 1; row <= range.e.r; row += 1) {
      const value = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })]?.v;
      const number = Number(value);
      if (value !== undefined && value !== null && String(value).trim() !== "" && Number.isInteger(number) && number >= 1 && number <= maxNumber) {
        purchased.add(number);
      }
    }

    const numbers = document.createDocumentFragment();
    for (let number = 1; number <= maxNumber; number += 1) {
      const item = document.createElement("span");
      item.className = purchased.has(number) ? "raffle-number is-purchased" : "raffle-number";
      if (purchased.has(number)) {
        const icon = document.createElement("img");
        icon.src = purchasedIconPath;
        icon.alt = "";
        icon.className = "raffle-purchased-icon";
        item.append(icon);
      } else {
        item.textContent = String(number);
      }
      item.setAttribute("aria-label", purchased.has(number) ? `Número ${number}, comprado` : `Número ${number}, disponible`);
      numbers.append(item);
    }
    numberGrid.replaceChildren(numbers);
    status.textContent = `${maxNumber} números cargados desde Sheet1.`;
  } catch (error) {
    console.error("No se pudo leer Rifa.xlsx:", error);
    numberGrid.replaceChildren();
    status.textContent = "No se pudo cargar la numeración. Comprueba que Rifa.xlsx esté en assets/database y que Sheet1 tenga el máximo en C1.";
  }
}

loadRaffleNumbers();
