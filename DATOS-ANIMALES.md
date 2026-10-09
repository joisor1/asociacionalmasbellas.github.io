# Datos de animales y rifa

## Animales

La fuente de datos de la web es ahora el Google Sheet de la asociación, no el archivo estático `assets/database/Animales.xlsx`. La página `/admin/admin.html` muestra una tarjeta por cada fila con nombre de `Sheet1`; el formulario de `/admin/login.html` edita las pestañas `Sheet1` y `Sheet2` con Google Sheets API. `Sheet1` contiene los animales en adopción; `Sheet2`, los adoptados. La web pública vuelve a leer los datos en cada carga.

La primera fila de `Sheet1` debe incluir `Nombre`, `Edad` y `Descripción`. También se reconocen `Género` (o `Sexo`/`Gender`), `Raza`, `Teléfono` (contacto), `Carpeta` y `Estado web`. La primera fila de `Sheet2` debe incluir `Nombre` y puede incluir `Carpeta`. Las filas sin los datos obligatorios se omiten. En `Sheet1`, los estados `editando`, `borrador`, `oculto`, `inactivo`, `archivado`, `no publicar`, `adoptado`, `reservado` y `no disponible` no aparecen en adopción.

La imagen principal se busca en `media/animales/<carpeta>/00.jpg`; las fotos adicionales de esa carpeta forman la galería. La hoja contiene el nombre de la carpeta, no las imágenes. Las pestañas `Sheet1` y `Sheet2` deben publicarse para que el sitio estático pueda leerlas; no publiques otras pestañas que contengan datos privados.

La página de diagnóstico `/test-excel.html` comprueba lectura, columnas y filas publicables de `Sheet1`.

## Rifa

La página `rifa.html` sigue leyendo `assets/database/Rifa.xlsx`, hoja `Sheet1`: `C1` define el número máximo, `C2` el precio, `C3` la fecha del sorteo y `C4` la descripción del premio. Los números comprados se leen de la columna A a partir de A2. Para la galería en GitHub Pages, lista cada nombre de imagen de `media/rifa` en `media/rifa/imagenes.txt`, uno por línea.
