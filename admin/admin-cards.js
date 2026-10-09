import { googleOAuthClientId, spreadsheetId, animalSheetName, allowedAdminEmails } from "./config.js";

const $ = (id) => document.getElementById(id);
const loginPanel = $("login-panel");
const loginButton = $("google-login");
const dashboard = $("dashboard");
const status = $("status");
const cardsStatus = $("cards-status");
const cardsContainer = $("dog-cards");
let tokenClient;
let accessToken = "";

$("year").textContent = new Date().getFullYear();

const normalize = (value) => String(value ?? "").trim().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const getIndex = (headers, ...names) => {
  const candidates = names.map(normalize);
  return headers.findIndex((header) => candidates.includes(normalize(header)));
};

function setStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}

function setCardsStatus(message, error = false) {
  cardsStatus.textContent = message;
  cardsStatus.classList.toggle("is-error", error);
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

async function sheetsRequest(path) {
  const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403) throw new Error("Esta cuenta no tiene acceso de lectura a la hoja o Google Sheets API no está habilitada.");
    if (response.status === 401) throw new Error("La autorización caducó. Vuelve a iniciar sesión.");
    throw new Error(body.error?.message || `Google Sheets respondió ${response.status}.`);
  }
  return body;
}

function makeCard(animal) {
  const card = document.createElement("article");
  card.className = "dog-card";
  const imageFrame = document.createElement("div");
  imageFrame.className = "dog-card-image-frame";
  const image = document.createElement("img");
  image.className = "dog-card-image";
  image.alt = animal.name ? `Foto de ${animal.name}` : "Foto del perro";
  image.loading = "lazy";
  image.src = animal.folder
    ? `../media/animales/${encodeURIComponent(animal.folder)}/00.jpg`
    : "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=700&q=80";
  image.addEventListener("error", () => {
    image.src = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=700&q=80";
  }, { once: true });
  imageFrame.append(image);

  const body = document.createElement("div");
  body.className = "dog-card-body";
  const title = document.createElement("h3");
  title.textContent = animal.name;
  body.append(title);
  const meta = [animal.age, animal.gender, animal.breed].filter(Boolean).join(" · ");
  if (meta) {
    const line = document.createElement("p");
    line.className = "dog-card-meta";
    line.textContent = meta;
    body.append(line);
  }
  if (animal.state) {
    const state = document.createElement("span");
    state.className = "dog-card-state";
    state.textContent = animal.state;
    body.append(state);
  }
  if (animal.description) {
    const description = document.createElement("p");
    description.className = "dog-card-description";
    description.textContent = animal.description;
    body.append(description);
  }
  if (animal.folder) {
    const folder = document.createElement("small");
    folder.className = "dog-card-folder";
    folder.textContent = `Carpeta de fotos: ${animal.folder}`;
    body.append(folder);
  }
  card.append(imageFrame, body);
  return card;
}

async function loadDogs() {
  cardsContainer.replaceChildren();
  setCardsStatus("Cargando filas de Sheet1…");
  try {
    const range = encodeURIComponent(`'${animalSheetName}'!A:ZZ`);
    const result = await sheetsRequest(`spreadsheets/${spreadsheetId}/values/${range}?majorDimension=ROWS`);
    const [rawHeaders = [], ...rows] = result.values || [];
    const headers = rawHeaders.map((value) => String(value ?? ""));
    const nameIndex = getIndex(headers, "Nombre", "Name");
    if (nameIndex < 0) throw new Error("Sheet1 necesita una columna Nombre en la primera fila.");
    const indexes = {
      age: getIndex(headers, "Edad", "Age"),
      gender: getIndex(headers, "Género", "Sexo", "Gender"),
      breed: getIndex(headers, "Raza", "Raza del perro", "Breed"),
      folder: getIndex(headers, "Carpeta", "Folder"),
      description: getIndex(headers, "Descripción", "Description"),
      state: getIndex(headers, "Estado web", "Estado", "Visibilidad")
    };
    const animals = rows.map((row) => ({
      name: String(row[nameIndex] ?? "").trim(),
      age: indexes.age < 0 ? "" : String(row[indexes.age] ?? "").trim(),
      gender: indexes.gender < 0 ? "" : String(row[indexes.gender] ?? "").trim(),
      breed: indexes.breed < 0 ? "" : String(row[indexes.breed] ?? "").trim(),
      folder: indexes.folder < 0 ? "" : String(row[indexes.folder] ?? "").trim().replace(/[\\/]/g, ""),
      description: indexes.description < 0 ? "" : String(row[indexes.description] ?? "").trim(),
      state: indexes.state < 0 ? "" : String(row[indexes.state] ?? "").trim()
    })).filter((animal) => animal.name);

    const fragment = document.createDocumentFragment();
    animals.forEach((animal) => fragment.append(makeCard(animal)));
    cardsContainer.append(fragment);
    $("dog-count").textContent = `${animals.length} ${animals.length === 1 ? "perro" : "perros"}`;
    setCardsStatus(animals.length ? "" : "No hay filas con nombre en Sheet1.");
  } catch (error) {
    setCardsStatus(error.message, true);
  }
}

function handleToken(response) {
  (async () => {
    if (response.error || !response.access_token) {
      setStatus("Google no concedió acceso a Sheet1. Vuelve a intentarlo.");
      loginButton.disabled = false;
      return;
    }
    accessToken = response.access_token;
    try {
      const responseUser = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!responseUser.ok) throw new Error("No se pudo verificar la cuenta de Google.");
      const user = await responseUser.json();
      const email = String(user.email || "").toLowerCase();
      if (!user.email_verified || (allowedAdminEmails.length && !allowedAdminEmails.map((item) => item.toLowerCase()).includes(email))) {
        throw new Error("Esta cuenta no está autorizada para ver la página.");
      }
      $("user-name").textContent = user.name || "Cuenta de Google";
      $("user-email").textContent = user.email || "";
      if (user.picture) {
        $("user-photo").src = user.picture;
        $("user-photo").hidden = false;
      }
      loginPanel.hidden = true;
      dashboard.hidden = false;
      await loadDogs();
    } catch (error) {
      accessToken = "";
      setStatus(error.message);
      loginPanel.hidden = false;
      dashboard.hidden = true;
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

$("refresh-cards").addEventListener("click", loadDogs);
$("logout").addEventListener("click", () => {
  accessToken = "";
  cardsContainer.replaceChildren();
  dashboard.hidden = true;
  loginPanel.hidden = false;
  setStatus("");
});

try {
  if (!googleOAuthClientId || googleOAuthClientId.startsWith("REEMPLAZAR_")) throw new Error("Falta el ID de cliente OAuth.");
  await loadIdentityLibrary();
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: googleOAuthClientId,
    scope: "openid email profile https://www.googleapis.com/auth/spreadsheets",
    callback: handleToken
  });
  loginButton.disabled = false;
} catch (error) {
  $("config-notice").hidden = false;
  setStatus(error.message);
}
