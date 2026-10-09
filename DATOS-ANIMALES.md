# Datos de animales y rifa

## Animales

Todas las páginas públicas leen `assets/database/Animales.xlsx`: `Sheet1` contiene los animales en adopción y `Sheet2` los adoptados. El navegador descarga el archivo al abrir la página. La zona de administración es independiente: `/admin/admin.html` y `/admin/login.html` leen o editan el Google Sheet configurado en `admin/config.js`.

Para que los cambios hechos en Google Sheets aparezcan en la web pública, exporta el libro actualizado como Excel y reemplaza `assets/database/Animales.xlsx` en el sitio. La edición de Google Sheets no actualiza automáticamente este archivo estático.

La primera fila de `Sheet1` debe incluir `Nombre`, `Edad` y `Descripción`. También se reconocen `Género` (o `Sexo`/`Gender`), `Raza`, `Teléfono` (contacto), `Carpeta` y `Estado web`. La primera fila de `Sheet2` debe incluir `Nombre` y puede incluir `Carpeta`. Las filas sin los datos obligatorios se omiten. En `Sheet1`, los estados `editando`, `borrador`, `oculto`, `inactivo`, `archivado`, `no publicar`, `adoptado`, `reservado` y `no disponible` no aparecen en adopción.

La imagen principal se busca en `media/animales/<carpeta>/00.jpg`; las fotos adicionales de esa carpeta forman la galería. La hoja contiene el nombre de la carpeta, no las imágenes.

La página de diagnóstico `/test-excel.html` comprueba la lectura, las columnas y las filas publicables de `Sheet1`.

## Rifa

La página `rifa.html` sigue leyendo `assets/database/Rifa.xlsx`, hoja `Sheet1`: `C1` define el número máximo, `C2` el precio, `C3` la fecha del sorteo y `C4` la descripción del premio. Los números comprados se leen de la columna A a partir de A2. Para la galería en GitHub Pages, lista cada nombre de imagen de `media/rifa` en `media/rifa/imagenes.txt`, uno por línea.
