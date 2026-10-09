import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";
import { loadPublicSheet } from "./google-sheets-public.js";

const navToggle = document.querySelector(".mobile-nav-toggle");
const navMenu = document.querySelector("#main-nav-menu");
function closeMobileMenu() {
  navMenu?.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
  navToggle?.setAttribute("aria-label", "Abrir menú");
  if (navToggle) navToggle.textContent = "☰";
}
navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  if (isOpen) {
    closeMobileMenu();
  } else {
    navMenu?.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Cerrar menú");
    navToggle.textContent = "×";
  }
});
navMenu?.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMobileMenu));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMobileMenu();
});

const phoneWorkbookUrl = "./assets/database/info.xlsx";
const phoneSheetName = "telefonos";
const fallbackImage = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=700&q=80";
const maxAnimals = 4;
const defaultAdoptionPhone = "34692160589";
const contactPhoneFallbacks = new Map([["judith", "34608678808"]]);
const showAllAnimals = document.body.classList.contains("adoption-page");
const grid = document.querySelector(".animals-grid");
const status = document.querySelector("#animals-status");
let carouselImages = [];
let carouselIndex = 0;
let carouselRequestId = 0;
const normalize = value => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const safeImageUrl = value => {
  const raw = String(value ?? "").trim();
  if (!raw) return fallbackImage;
  try {
    const url = new URL(raw, document.baseURI);
    return ["https:", "http:"].includes(url.protocol) ? url.href : fallbackImage;
  } catch {
    return fallbackImage;
  }
};

function getWhatsAppPhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return defaultAdoptionPhone;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9) digits = `34${digits}`;
  return digits;
}

async function loadPhoneDirectory() {
  try {
    const response = await fetch(phoneWorkbookUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo descargar el directorio (${response.status}).`);
    const workbook = XLSX.read(await response.arrayBuffer());
    const sheet = workbook.Sheets[phoneSheetName];
    if (!sheet) throw new Error(`No existe la hoja ${phoneSheetName}.`);
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    const directory = new Map();
    rows.forEach(([contactName, phone]) => {
      const key = normalize(contactName);
      if (key && phone) directory.set(key, String(phone).trim());
    });
    return directory;
  } catch (error) {
    console.warn("No se pudo leer la hoja telefonos; se usará el número predeterminado:", error);
    return new Map();
  }
}

function setStatus(message, visible = true) {
  if (!status) return;
  status.textContent = message;
  status.hidden = !visible;
}

function getColumn(headers, ...names) {
  const candidates = names.map(normalize);
  return headers.findIndex(header => candidates.includes(normalize(header)));
}

function renderAnimals(animals) {
  if (!grid) return;
  if (!animals.length) {
    grid.innerHTML = "";
    setStatus("Ahora mismo no hay animales disponibles para adopción.");
    return;
  }

  grid.innerHTML = animals.map((animal, index) => {
    const name = escapeHtml(animal.name);
    const image = safeImageUrl(animal.folder ? `./media/animales/${encodeURIComponent(animal.folder)}/00.jpg` : fallbackImage);
    const meta = [animal.age, animal.gender, animal.breed].filter(Boolean).map(escapeHtml).join(" · ");
    return `<article class="animal-card" tabindex="0" aria-haspopup="dialog" aria-label="Ver información de ${name}" data-animal-index="${index}"><div class="animal-image-wrapper"><img class="animal-image" src="${escapeHtml(image)}" alt="${name}" loading="lazy" data-animal-folder="${escapeHtml(animal.folder)}" data-fallback="${escapeHtml(fallbackImage)}"></div><div class="animal-content"><h3 class="animal-name">${name}</h3><p class="animal-meta">${meta}</p><p class="animal-description">${escapeHtml(animal.description)}</p><button class="btn btn-primary btn-small" type="button">Conocer más</button></div></article>`;
  }).join("");
  grid.querySelectorAll("img[data-fallback]").forEach(image => {
    image.addEventListener("error", () => {
      image.src = image.dataset.fallback;
      image.removeAttribute("data-fallback");
    }, { once: true });
  });
  grid.querySelectorAll("img[data-animal-folder]").forEach(image => {
    loadFirstAnimalImage(image, image.dataset.animalFolder);
  });
  grid.querySelectorAll(".animal-card").forEach(card => {
    const openDetails = () => openAnimalDetails(animals[Number(card.dataset.animalIndex)]);
    card.addEventListener("click", openDetails);
    card.addEventListener("keydown", event => {
      if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      openDetails();
    });
  });
  setStatus("", false);
}

async function loadFirstAnimalImage(image, folder) {
  if (!folder) return;
  const folderUrl = `./media/animales/${encodeURIComponent(folder)}/`;
  try {
    const response = await fetch(`${folderUrl}imagenes.txt`, { cache: "no-store" });
    if (!response.ok) return;
    const firstFilename = (await response.text()).split(/\r?\n/)
      .map(filename => filename.trim())
      .find(filename => /^[^/\\]+\.(avif|gif|jpe?g|png|webp)$/i.test(filename));
    if (firstFilename) image.src = `${folderUrl}${encodeURIComponent(firstFilename)}`;
  } catch (error) {
    console.warn(`No se pudo leer la lista de imágenes de ${folder}:`, error);
  }
}

function openAnimalDetails(animal) {
  if (!animal) return;
  let dialog = document.querySelector("#animal-detail-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "animal-detail-dialog";
    dialog.className = "animal-dialog";
    dialog.setAttribute("aria-labelledby", "animal-dialog-title");
    dialog.innerHTML = `<div class="animal-dialog-card"><button class="animal-dialog-close" type="button" aria-label="Cerrar">×</button><img class="animal-dialog-image" alt=""><div class="animal-dialog-content"><h2 id="animal-dialog-title"></h2><p class="animal-dialog-meta"></p><p class="animal-dialog-description"></p><a class="btn btn-primary" href="https://wa.me/34692160589" target="_blank" rel="noopener noreferrer">Quiero adoptar</a></div><div class="animal-carousel" hidden><div class="animal-carousel-view"><button class="animal-carousel-control animal-carousel-prev" type="button" aria-label="Imagen anterior">‹</button><img class="animal-carousel-image" alt=""><button class="animal-carousel-control animal-carousel-next" type="button" aria-label="Imagen siguiente">›</button></div><p class="animal-carousel-count" aria-live="polite"></p></div></div>`;
    dialog.querySelector(".animal-dialog-close").addEventListener("click", () => dialog.close());
    dialog.querySelector(".animal-carousel-prev").addEventListener("click", () => showCarouselImage(dialog, carouselIndex - 1));
    dialog.querySelector(".animal-carousel-next").addEventListener("click", () => showCarouselImage(dialog, carouselIndex + 1));
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    document.body.append(dialog);
  }

  const image = dialog.querySelector(".animal-dialog-image");
  image.src = safeImageUrl(animal.folder ? `./media/animales/${encodeURIComponent(animal.folder)}/00.jpg` : fallbackImage);
  image.alt = animal.name;
  image.onerror = () => {
    image.onerror = null;
    image.src = fallbackImage;
  };
  dialog.querySelector("#animal-dialog-title").textContent = animal.name;
  dialog.querySelector(".animal-dialog-meta").textContent = [animal.age, animal.gender, animal.breed].filter(Boolean).join(" · ");
  dialog.querySelector(".animal-dialog-description").textContent = animal.description;
  const phone = getWhatsAppPhone(animal.phone);
  dialog.querySelector(".animal-dialog-content .btn").href = `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, estoy interesado/a en adoptar a ${animal.name}`)}`;
  dialog.showModal();
  loadFirstAnimalImage(image, animal.folder);
  loadAnimalCarousel(animal, dialog);
}

async function loadAnimalCarousel(animal, dialog) {
  const requestId = ++carouselRequestId;
  const carousel = dialog.querySelector(".animal-carousel");
  carousel.hidden = true;
  carouselImages = [];
  if (!animal.folder) return;

  try {
    const folderUrl = `./media/animales/${encodeURIComponent(animal.folder)}/`;
    const response = await fetch(`${folderUrl}imagenes.txt`, { cache: "no-store" });
    if (!response.ok) return;
    const filenames = (await response.text()).split(/\r?\n/)
      .map(filename => filename.trim())
      .filter(filename => /^[^/\\]+\.(avif|gif|jpe?g|png|webp)$/i.test(filename));
    if (requestId !== carouselRequestId || !dialog.open || filenames.length < 2) return;
    carouselImages = filenames.map(filename => `${folderUrl}${encodeURIComponent(filename)}`);
    carouselIndex = 0;
    carousel.hidden = false;
    showCarouselImage(dialog, carouselIndex, animal.name);
  } catch (error) {
    console.warn(`No se pudo leer la galería de ${animal.name}:`, error);
  }
}

function showCarouselImage(dialog, index, animalName = dialog.querySelector("#animal-dialog-title").textContent) {
  if (!carouselImages.length) return;
  carouselIndex = (index + carouselImages.length) % carouselImages.length;
  const image = dialog.querySelector(".animal-carousel-image");
  image.src = carouselImages[carouselIndex];
  image.alt = `Imagen ${carouselIndex + 1} de ${carouselImages.length} de ${animalName}`;
  image.onerror = () => {
    carouselImages.splice(carouselIndex, 1);
    if (carouselImages.length) showCarouselImage(dialog, Math.min(carouselIndex, carouselImages.length - 1), animalName);
    else dialog.querySelector(".animal-carousel").hidden = true;
  };
  dialog.querySelector(".animal-carousel-count").textContent = `${carouselIndex + 1} de ${carouselImages.length}`;
  const showControls = carouselImages.length > 1;
  dialog.querySelector(".animal-carousel-prev").hidden = !showControls;
  dialog.querySelector(".animal-carousel-next").hidden = !showControls;
}

async function loadAnimals() {
  if (!grid) return;
  setStatus("Cargando animales…");
  try {
    const [sheetRows, phoneDirectory] = await Promise.all([loadPublicSheet("Sheet1"), loadPhoneDirectory()]);
    const [headers, ...rows] = sheetRows;
    if (!headers) throw new Error("La hoja Sheet1 está vacía o no se ha publicado.");
    const nameIndex = getColumn(headers, "nombre", "name");
    const ageIndex = getColumn(headers, "edad", "age");
    const genderIndex = getColumn(headers, "genero", "sexo", "gender");
    const breedIndex = getColumn(headers, "raza", "raza del perro", "breed");
    const phoneIndex = getColumn(headers, "telefono", "teléfono", "numero de telefono", "whatsapp", "phone");
    const folderIndex = getColumn(headers, "carpeta", "folder");
    const descriptionIndex = getColumn(headers, "descripcion", "description");
    const stateIndex = getColumn(headers, "estado web", "estado", "visibilidad");
    if (nameIndex < 0 || ageIndex < 0 || descriptionIndex < 0) {
      throw new Error("La primera fila necesita las columnas Nombre, Edad y Descripción.");
    }

    const hiddenStates = new Set(["editando", "borrador", "oculto", "inactivo", "archivado", "no publicar"]);
    const unavailableStates = new Set(["adoptado", "adoptada", "adoptados", "adoptadas", "reservado", "reservada", "no disponible"]);
    const animals = rows.map(row => {
      const state = stateIndex < 0 ? "" : normalize(row[stateIndex]);
      const name = String(row[nameIndex] ?? "").trim();
      const age = String(row[ageIndex] ?? "").trim();
      const gender = genderIndex < 0 ? "" : String(row[genderIndex] ?? "").trim();
      const breed = breedIndex < 0 ? "" : String(row[breedIndex] ?? "").trim();
      const phoneContact = phoneIndex < 0 ? "" : String(row[phoneIndex] ?? "").trim();
      const normalizedPhoneContact = normalize(phoneContact);
      const phone = phoneDirectory.get(normalizedPhoneContact) ?? contactPhoneFallbacks.get(normalizedPhoneContact) ?? "";
      const folder = folderIndex < 0 ? "" : String(row[folderIndex] ?? "").trim().replace(/[\\/]/g, "");
      const description = String(row[descriptionIndex] ?? "").trim();
      return { name, age, gender, breed, phoneContact, phone, folder, description, state };
    }).filter(animal => animal.name && animal.age && animal.description && !hiddenStates.has(animal.state) && !unavailableStates.has(animal.state));

    renderAnimals(showAllAnimals ? animals : animals.slice(0, maxAnimals));
  } catch (error) {
    console.error("No se pudieron leer los animales de Google Sheets:", error);
    grid.innerHTML = "";
    setStatus("No se pudieron cargar los animales. Comprueba que Sheet1 esté publicada en Google Sheets y tenga las columnas necesarias.");
  }
}

loadAnimals();
