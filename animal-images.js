const animalImageListCache = new Map();

export async function getAnimalImageUrls(folder) {
  const key = String(folder ?? "").trim();
  if (!key) return [];
  if (animalImageListCache.has(key)) return animalImageListCache.get(key);
  const imagesPromise = (async () => {
    const folderUrl = `./media/animales/${encodeURIComponent(key)}/`;
    try {
      const response = await fetch(folderUrl, { cache: "no-store" });
      if (response.ok) {
        const listing = new DOMParser().parseFromString(await response.text(), "text/html");
        const folderPath = new URL(folderUrl, window.location.href).pathname;
        const images = [...listing.querySelectorAll("a[href]")]
          .map(link => {
            const url = new URL(link.getAttribute("href"), response.url);
            const name = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
            return url.origin === window.location.origin && url.pathname.startsWith(folderPath) && /^[^/\\]+\.(avif|gif|jpe?g|png|webp)$/i.test(name)
              ? `${folderUrl}${encodeURIComponent(name)}`
              : null;
          })
          .filter(Boolean);
        if (images.length) return images;
      }
    } catch (error) {
      console.info(`El servidor no expone el listado local de ${key}; se probará GitHub.`, error);
    }

    try {
      const apiUrl = `https://api.github.com/repos/joisor1/asociacionalmasbellas.github.io/contents/media/animales/${encodeURIComponent(key)}?ref=main`;
      const response = await fetch(apiUrl, { headers: { Accept: "application/vnd.github+json" } });
      if (response.ok) {
        const files = await response.json();
        const images = files
          .filter(file => file.type === "file" && /^[^/\\]+\.(avif|gif|jpe?g|png|webp)$/i.test(file.name))
          .sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }))
          .map(file => `${folderUrl}${encodeURIComponent(file.name)}`);
        if (images.length) return images;
      }
    } catch (error) {
      console.info(`No se pudieron detectar las imágenes en GitHub para ${key}.`, error);
    }

    return [];
  })();
  animalImageListCache.set(key, imagesPromise);
  return imagesPromise;
}
