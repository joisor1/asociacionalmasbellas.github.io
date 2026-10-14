import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

const collaboratorsContainer = document.querySelector("#raffle-collaborators");
const collaboratorsSection = document.querySelector(".collaborators");
const workbookPath = "./assets/database/info.xlsx";

function externalUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

async function loadCollaborators() {
  try {
    const response = await fetch(workbookPath, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo descargar info.xlsx (${response.status}).`);

    const workbook = XLSX.read(await response.arrayBuffer());
    const sheetName = workbook.SheetNames.find(name => name.trim().toLocaleLowerCase("es") === "colaboradores");
    if (!sheetName) throw new Error("info.xlsx no contiene la hoja Colaboradores.");

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "" });
    const collaborators = rows.slice(1)
      .map(row => ({ name: String(row[0] ?? "").trim(), link: externalUrl(row[1]) }))
      .filter(item => item.name);

    const buttons = document.createDocumentFragment();
    collaborators.forEach(({ name, link }) => {
      const button = document.createElement(link ? "a" : "button");
      button.className = "link";
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
      buttons.append(button);
    });
    if (!collaborators.length) return;
    collaboratorsContainer.replaceChildren(buttons);
    collaboratorsSection.hidden = false;
  } catch (error) {
    console.error("No se pudieron cargar los colaboradores de la rifa:", error);
  }
}

loadCollaborators();
