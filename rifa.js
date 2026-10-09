import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

const workbookPath = "./assets/database/Rifa.xlsx";
const numberGrid = document.querySelector("#raffle-numbers");
const status = document.querySelector("#raffle-number-status");
const price = document.querySelector("#raffle-price");
const date = document.querySelector("#raffle-date");
const prizeDescription = document.querySelector("#raffle-prize-description");
const gallery = document.querySelector("#raffle-gallery");
const galleryStatus = document.querySelector("#raffle-gallery-status");
const paw = "🐾";

function cellText(cell) {
  if (!cell || cell.v === undefined || cell.v === null || String(cell.v).trim() === "") return "";
  return String(cell.w ?? cell.v).trim();
}

async function loadRaffleImages() {
  try {
    // GitHub Pages and ordinary static servers do not expose directory listings;
    // the text manifest contains one image filename per line.
    const response = await fetch("./media/rifa/imagenes.txt", { cache: "no-store" });
    if (!response.ok) throw new Error("No hay lista de imágenes");
    const filenames = (await response.text()).split(/\r?\n/)
      .map((name) => name.trim())
      .filter((name) => name && /^[\w.-]+\.(avif|gif|jpe?g|png|webp)$/i.test(name));
    const images = document.createDocumentFragment();
    filenames.forEach((filename) => {
      const image = document.createElement("img");
      image.src = `./media/rifa/${encodeURIComponent(filename)}`;
      image.alt = "Premio de la rifa solidaria";
      image.loading = "lazy";
      image.addEventListener("error", () => image.remove(), { once: true });
      images.append(image);
    });
    gallery.replaceChildren(images);
    galleryStatus.textContent = filenames.length ? "" : "Añade los nombres de las imágenes de media/rifa en media/rifa/imagenes.txt, uno por línea.";
  } catch {
    gallery.replaceChildren();
    galleryStatus.textContent = "Añade los nombres de las imágenes de media/rifa en media/rifa/imagenes.txt, uno por línea.";
  }
}

async function loadRaffleNumbers() {
  try {
    const response = await fetch(workbookPath, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo descargar Rifa.xlsx (${response.status}).`);

    const workbook = XLSX.read(await response.arrayBuffer());
    const sheet = workbook.Sheets.Sheet1;
    if (!sheet) throw new Error("Rifa.xlsx no contiene la hoja Sheet1.");

    const rawPrice = cellText(sheet.C2);
    price.textContent = rawPrice
      ? (typeof sheet.C2?.v === "number" && !/[€$£]/.test(rawPrice) ? `${rawPrice} €` : rawPrice)
      : "Por confirmar";
    date.textContent = cellText(sheet.C3) || "Por confirmar";
    prizeDescription.textContent = cellText(sheet.C4) || "Descripción del premio por confirmar.";
    await loadRaffleImages();

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
      item.textContent = purchased.has(number) ? paw : String(number);
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
