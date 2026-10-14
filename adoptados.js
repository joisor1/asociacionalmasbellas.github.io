import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";
const workbookUrl = "./assets/database/Animales.xlsx";
const adoptedPhotosApiUrl = "https://api.github.com/repos/joisor1/asociacionalmasbellas.github.io/contents/media/animales/adoptados%20varios?ref=main";
const fallbackImage = "./media/web/logo.png";
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
    const open = () => openAdoptedGallery(card.dataset.animalName, card.dataset.animalFolder, card.dataset.photo);
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

async function appendAdoptedPhotoCards() {
  try {
    const folderUrl = "./media/animales/adoptados%20varios/";
    let photos = [];
    const folderResponse = await fetch(folderUrl, { cache: "no-store" });
    if (folderResponse.ok) {
      const listing = new DOMParser().parseFromString(await folderResponse.text(), "text/html");
      const folderPath = new URL(folderUrl, window.location.href).pathname;
      photos = [...listing.querySelectorAll("a[href]")]
        .map(link => {
          const url = new URL(link.getAttribute("href"), folderResponse.url);
          const name = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
          return url.origin === window.location.origin && url.pathname.startsWith(folderPath) && /\.(avif|gif|jpe?g|png|webp)$/i.test(name) ? { name } : null;
        })
        .filter(Boolean);
    }
    if (!photos.length) {
      const response = await fetch(adoptedPhotosApiUrl, { headers: { Accept: "application/vnd.github+json" } });
      if (!response.ok) throw new Error(`No se pudo listar la carpeta ni consultar GitHub (${response.status}).`);
      const files = await response.json();
      photos = files.filter(file => file.type === "file" && /\.(avif|gif|jpe?g|png|webp)$/i.test(file.name));
    }
    photos.sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));

    photos.forEach((file, index) => {
      const source = `./media/animales/adoptados%20varios/${encodeURIComponent(file.name)}`;
      const card = document.createElement("article");
      card.className = "adopted-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-haspopup", "dialog");
      card.setAttribute("aria-label", `Ver foto de animal adoptado ${index + 1}`);
      card.dataset.animalName = `Adoptado ${index + 1}`;
      card.dataset.photo = source;

      const frame = document.createElement("div");
      frame.className = "adopted-image-frame";
      const image = document.createElement("img");
      image.className = "adopted-image";
      image.src = source;
      image.alt = `Animal adoptado ${index + 1}`;
      image.loading = "lazy";
      image.addEventListener("load", () => {
        const ratio = Math.max(9 / 16, Math.min(16 / 9, image.naturalWidth / image.naturalHeight));
        card.style.setProperty("--adopted-image-ratio", String(ratio));
        layoutMural();
      });
      image.addEventListener("error", () => card.remove(), { once: true });
      frame.append(image);
      card.append(frame);

      const open = () => openAdoptedGallery("", "", card.dataset.photo);
      card.addEventListener("click", open);
      card.addEventListener("keydown", event => {
        if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        open();
      });
      grid.append(card);
    });
    layoutMural();
    return photos.length;
  } catch (error) {
    console.warn("No se pudieron detectar automáticamente las fotos de adoptados varios:", error);
    return -1;
  }
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
    const minCardWidth = Math.min(130, Math.max(90, width * 0.24));
    const size = Math.max(minCardWidth, maxWidth * densityScale);
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

async function openAdoptedGallery(name, folder, singlePhoto = "") {
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
  const galleryTitle = dialog.querySelector("#adopted-gallery-title");
  galleryTitle.textContent = singlePhoto ? "" : name;
  galleryTitle.hidden = Boolean(singlePhoto);
  if (singlePhoto) {
    dialog.removeAttribute("aria-labelledby");
    dialog.setAttribute("aria-label", "Foto de animal adoptado");
  } else {
    dialog.setAttribute("aria-labelledby", "adopted-gallery-title");
    dialog.removeAttribute("aria-label");
  }
  dialog.querySelector(".adopted-gallery-image").src = fallbackImage;
  if (!dialog.open) dialog.showModal();
  const images = singlePhoto ? [singlePhoto] : await getAnimalImages(folder);
  if (requestId !== galleryRequestId || !dialog.open) return;
  galleryImages = images;
  galleryIndex = 0;
  showAdoptedGalleryImage(0, singlePhoto ? "" : name);
}

function showAdoptedGalleryImage(index, name = document.querySelector("#adopted-gallery-title")?.textContent ?? "") {
  const dialog = document.querySelector("#adopted-gallery-dialog");
  if (!dialog || !galleryImages.length) return;
  galleryIndex = (index + galleryImages.length) % galleryImages.length;
  dialog.classList.toggle("single-image", galleryImages.length === 1);
  const image = dialog.querySelector(".adopted-gallery-image");
  image.src = galleryImages[galleryIndex];
  image.alt = name ? `${name}, imagen ${galleryIndex + 1} de ${galleryImages.length}` : `Foto ${galleryIndex + 1} de ${galleryImages.length}`;
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
  let animals = [];
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
    if (nameIndex >= 0) {
      animals = rows.map(row => ({ name: String(row[nameIndex] ?? "").trim(), folder: folderIndex < 0 ? "" : String(row[folderIndex] ?? "").trim() }))
        .filter(animal => animal.name);
    } else {
      console.warn("Sheet2 no tiene columna Nombre; se añadirán las fotos detectadas en la carpeta.");
    }
  } catch (error) {
    console.warn("No se pudieron cargar los datos de Animales.xlsx:", error);
  }

  grid.innerHTML = "";
  if (animals.length) renderAdopted(animals);
  const photoCount = await appendAdoptedPhotoCards();
  if (photoCount < 0 && !animals.length) {
    setStatus("No se pudieron cargar tarjetas del XLSX ni detectar las fotos de la carpeta.");
  } else if (photoCount < 0) {
    setStatus("Se muestran las tarjetas del XLSX, pero no se pudieron detectar las fotos de la carpeta.");
  } else if (!animals.length && photoCount === 0) {
    setStatus("No se encontraron animales en el XLSX ni fotos en la carpeta.");
  } else {
    setStatus("", false);
  }
}

loadAdopted();
