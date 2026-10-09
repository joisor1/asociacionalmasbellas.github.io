import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";
const workbookUrl = "./assets/database/Animales.xlsx";
const fallbackImage = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=700&q=80";
const grid = document.querySelector(".adopted-grid");
const status = document.querySelector("#adopted-status");
const navToggle = document.querySelector(".mobile-nav-toggle");
const navMenu = document.querySelector("#main-nav-menu");
let muralResizeTimer;
let muralLayoutWidth = 0;
const imageListCache = new Map();
let galleryImages = [];
let galleryIndex = 0;
let galleryRequestId = 0;

navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navMenu?.classList.toggle("is-open", !isOpen);
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
  navToggle.textContent = isOpen ? "☰" : "×";
});
navMenu?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  navMenu.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
  navToggle?.setAttribute("aria-label", "Abrir menú");
  if (navToggle) navToggle.textContent = "☰";
}));
window.addEventListener("resize", () => {
  clearTimeout(muralResizeTimer);
  muralResizeTimer = setTimeout(() => {
    if (!grid || grid.clientWidth === muralLayoutWidth) return;
    layoutMural();
  }, 120);
});

function setStatus(message, visible = true) {
  status.textContent = message;
  status.hidden = !visible;
}

function getColumn(headers, ...names) {
  const normalize = value => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const candidates = names.map(normalize);
  return headers.findIndex(header => candidates.includes(normalize(header)));
}

function renderAdopted(animals) {
  grid.innerHTML = animals.map(animal => {
    const folder = String(animal.folder ?? "").trim().replace(/[\\/]/g, "");
    const folderPath = `./media/animales/${encodeURIComponent(folder)}/`;
    const name = String(animal.name).trim();
    const safeFolder = folder.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    const imageSource = folder ? folderPath + "00.jpg" : fallbackImage;
    const safeName = name.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    return `<article class="adopted-card" tabindex="0" role="button" aria-haspopup="dialog" aria-label="Ver fotos de ${safeName}" data-animal-name="${safeName}" data-animal-folder="${safeFolder}"><div class="adopted-image-frame"><img class="adopted-image" src="${imageSource}" alt="${safeName}" loading="lazy" data-folder="${safeFolder}" data-fallback="${fallbackImage}"></div></article>`;
  }).join("");

  grid.querySelectorAll(".adopted-card").forEach(card => {
    const open = () => openAdoptedGallery(card.dataset.animalName, card.dataset.animalFolder);
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      open();
    });
  });

  grid.querySelectorAll(".adopted-image").forEach(image => {
    image.addEventListener("load", () => {
      const ratio = Math.max(9 / 16, Math.min(16 / 9, image.naturalWidth / image.naturalHeight));
      image.closest(".adopted-card")?.style.setProperty("--adopted-image-ratio", String(ratio));
      layoutMural();
    });
    image.addEventListener("error", () => {
      image.src = image.dataset.fallback;
      image.dataset.fallback = "";
    }, { once: true });
    loadFirstImage(image, image.dataset.folder);
  });
  layoutMural();
}

function layoutMural() {
  if (!grid?.children.length) return;
  const width = grid.clientWidth;
  const height = grid.clientHeight;
  if (!width || !height) return;
  muralLayoutWidth = width;
  const itemCount = grid.children.length;
  const densityScale = Math.max(0.68, Math.min(1.12, 1.3 / Math.sqrt(itemCount)));
  [...grid.children].forEach(card => {
    if (!card.dataset.muralScale) {
      card.dataset.muralScale = String(0.82 + Math.random() * 0.36);
      card.dataset.muralRotation = String((Math.random() - 0.5) * 3);
      card.dataset.muralLayer = String(1 + Math.floor(Math.random() * itemCount));
    }
    if (card.dataset.muralX === undefined) card.dataset.muralX = String(Math.random());
    if (card.dataset.muralY === undefined) card.dataset.muralY = String(Math.random());
    const imageRatio = Number(card.style.getPropertyValue("--adopted-image-ratio")) || 1;
    const baseSize = Math.sqrt(width * height / itemCount) * 0.62;
    const maxWidth = Math.min(330, width * 0.92, height * 0.76 * imageRatio, baseSize * Number(card.dataset.muralScale));
    const size = Math.max(Math.min(64, width * 0.92), maxWidth * densityScale);
    const cardHeight = size / imageRatio;
    const left = Math.max(0, Number(card.dataset.muralX) * Math.max(0, width - size));
    const top = Math.max(0, Number(card.dataset.muralY) * Math.max(0, height - cardHeight));

    card.style.width = `${size}px`;
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.zIndex = card.dataset.muralLayer;
    card.style.transform = `rotate(${card.dataset.muralRotation}deg)`;
  });
}

async function loadFirstImage(image, folder) {
  const images = await getAnimalImages(folder);
  if (images.length) image.src = images[0];
}

function getAnimalImages(folder) {
  const key = String(folder ?? "").trim();
  if (!key) return Promise.resolve([fallbackImage]);
  if (imageListCache.has(key)) return imageListCache.get(key);
  const folderPath = `./media/animales/${encodeURIComponent(key)}/`;
  const imagesPromise = fetch(`${folderPath}imagenes.txt`, { cache: "no-store" })
    .then(async response => {
      if (!response.ok) return [`${folderPath}00.jpg`];
      const filenames = (await response.text()).split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => /^[^/\\]+\.(avif|gif|jpe?g|png|webp)$/i.test(line));
      return filenames.length ? filenames.map(filename => `${folderPath}${encodeURIComponent(filename)}`) : [`${folderPath}00.jpg`];
    })
    .catch(error => {
      console.warn(`No se pudo leer la lista de imágenes de ${key}:`, error);
      return [`${folderPath}00.jpg`];
    });
  imageListCache.set(key, imagesPromise);
  return imagesPromise;
}

async function openAdoptedGallery(name, folder) {
  const requestId = ++galleryRequestId;
  let dialog = document.querySelector("#adopted-gallery-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "adopted-gallery-dialog";
    dialog.className = "adopted-gallery-dialog";
    dialog.setAttribute("aria-labelledby", "adopted-gallery-title");
    dialog.innerHTML = `<div class="adopted-gallery-card"><button class="adopted-gallery-close" type="button" aria-label="Cerrar">×</button><h2 id="adopted-gallery-title"></h2><div class="adopted-gallery-view"><button class="adopted-gallery-control adopted-gallery-prev" type="button" aria-label="Imagen anterior">‹</button><img class="adopted-gallery-image" alt=""><button class="adopted-gallery-control adopted-gallery-next" type="button" aria-label="Imagen siguiente">›</button></div><p class="adopted-gallery-count" aria-live="polite"></p></div>`;
    dialog.querySelector(".adopted-gallery-close").addEventListener("click", () => dialog.close());
    dialog.querySelector(".adopted-gallery-prev").addEventListener("click", () => showAdoptedGalleryImage(galleryIndex - 1));
    dialog.querySelector(".adopted-gallery-next").addEventListener("click", () => showAdoptedGalleryImage(galleryIndex + 1));
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    document.body.append(dialog);
  }

  galleryImages = [];
  dialog.classList.remove("single-image");
  dialog.querySelector("#adopted-gallery-title").textContent = name;
  dialog.querySelector(".adopted-gallery-image").src = fallbackImage;
  if (!dialog.open) dialog.showModal();
  const images = await getAnimalImages(folder);
  if (requestId !== galleryRequestId || !dialog.open) return;
  galleryImages = images;
  galleryIndex = 0;
  showAdoptedGalleryImage(0, name);
}

function showAdoptedGalleryImage(index, name = document.querySelector("#adopted-gallery-title")?.textContent ?? "") {
  const dialog = document.querySelector("#adopted-gallery-dialog");
  if (!dialog || !galleryImages.length) return;
  galleryIndex = (index + galleryImages.length) % galleryImages.length;
  dialog.classList.toggle("single-image", galleryImages.length === 1);
  const image = dialog.querySelector(".adopted-gallery-image");
  image.src = galleryImages[galleryIndex];
  image.alt = `${name}, imagen ${galleryIndex + 1} de ${galleryImages.length}`;
  image.onerror = () => {
    image.onerror = null;
    galleryImages.splice(galleryIndex, 1);
    if (galleryImages.length) showAdoptedGalleryImage(Math.min(galleryIndex, galleryImages.length - 1), name);
    else {
      galleryImages = [fallbackImage];
      galleryIndex = 0;
      showAdoptedGalleryImage(0, name);
    }
  };
  const hasCarousel = galleryImages.length > 1;
  dialog.querySelector(".adopted-gallery-prev").hidden = !hasCarousel;
  dialog.querySelector(".adopted-gallery-next").hidden = !hasCarousel;
  dialog.querySelector(".adopted-gallery-count").hidden = !hasCarousel;
  dialog.querySelector(".adopted-gallery-count").textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
}

async function loadAdopted() {
  try {
    const response = await fetch(workbookUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo descargar Animales.xlsx (${response.status}).`);
    const workbook = XLSX.read(await response.arrayBuffer());
    const sheet = workbook.Sheets.Sheet2;
    if (!sheet) throw new Error("El archivo no contiene la hoja Sheet2.");
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    const headers = rows.shift() ?? [];
    const nameIndex = getColumn(headers, "nombre", "name");
    const folderIndex = getColumn(headers, "carpeta", "folder");
    if (nameIndex < 0) throw new Error("Sheet2 necesita una columna Nombre.");
    const animals = rows.map(row => ({ name: String(row[nameIndex] ?? "").trim(), folder: folderIndex < 0 ? "" : String(row[folderIndex] ?? "").trim() }))
      .filter(animal => animal.name);
    if (!animals.length) {
      grid.innerHTML = "";
      setStatus("Todavía no hay animales en Sheet2.");
      return;
    }
    renderAdopted(animals);
    setStatus("", false);
  } catch (error) {
    console.error("No se pudieron cargar los animales adoptados:", error);
    grid.innerHTML = "";
    setStatus("No se pudieron cargar los animales adoptados desde Animales.xlsx. Comprueba que exista la hoja Sheet2.");
  }
}

loadAdopted();
