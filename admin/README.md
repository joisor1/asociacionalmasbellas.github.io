# Administración de animales

La página `/admin/admin.html` solicita acceso de Google y muestra una tarjeta por cada fila con nombre de `Sheet1`, incluyendo estados no publicados. El formulario de `/admin/login.html` lee, crea, actualiza y elimina filas de `Sheet1` (en adopción) y `Sheet2` (adoptados) en la hoja configurada en `config.js`. Las páginas públicas leen el archivo `assets/database/Animales.xlsx`; para pasar los cambios de la hoja a la web, exporta el libro actualizado como Excel y reemplaza ese archivo.

## Configuración de Google

1. En Google Cloud Console, habilita **Google Sheets API** en el proyecto asociado al cliente OAuth de `config.js`.
2. Configura la pantalla de consentimiento OAuth y conserva el ID de cliente OAuth de tipo **Aplicación web**. Añade estos orígenes autorizados de JavaScript:
   - `https://lauraisidro.com`
   - `http://localhost:8000` para desarrollo local
3. En la pantalla de consentimiento, añade como usuarios de prueba las cuentas que van a usar el formulario mientras la aplicación esté en modo de prueba.
4. Comparte el Google Sheet con las cuentas administradoras como **Editor**. Una cuenta con permiso de solo lectura podrá ver el panel, pero Google rechazará sus cambios. No hace falta publicar un `client_secret` ni guardarlo en el repositorio.
5. No hace falta publicar la hoja para la web. La página admin accede con OAuth; las páginas públicas usan el archivo XLSX incluido en el sitio.
6. Comprueba que la primera fila de `Sheet1` tenga `Nombre`, `Edad` y `Descripción`; `Sheet2` debe tener `Nombre`. Se reconocen los encabezados existentes `Edad`, `Género`, `Raza`, `Carpeta`, `Teléfono`, `Descripción` y `Estado web`.

La página pide permiso OAuth de Google Sheets para editar el archivo seleccionado en `config.js`. Es un alcance sensible de Google; para uso público puede ser necesario verificar la pantalla de consentimiento. Mientras el consentimiento esté en modo de prueba, solo podrán autorizarse los usuarios de prueba.

## Acceso a las fotos

La carpeta de Drive se abre desde el panel de administración. Comparte esa carpeta con las cuentas que necesiten subir fotos. En la columna `Carpeta`, escribe el nombre de la carpeta de cada animal dentro de `media/animales`; la web pública buscará allí `00.jpg` y las imágenes de la galería.

## Sincronización del sitio público

El libro de Google Sheets y el archivo XLSX publicado son fuentes separadas. Los cambios guardados con el formulario no se reflejan automáticamente en las páginas públicas: después de editar, descarga/exporta la hoja como `.xlsx` y sustituye `assets/database/Animales.xlsx` en el repositorio. Los datos del sitio solo se actualizan cuando se publica esa nueva versión.

La lista opcional `allowedAdminEmails` en `config.js` puede limitar qué cuentas ven el formulario; los permisos de Editor de Google Sheets autorizan las escrituras.
