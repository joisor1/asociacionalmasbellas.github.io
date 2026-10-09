# Administración de animales

La página `/admin/admin.html` solicita acceso de Google y muestra una tarjeta por cada fila con nombre de `Sheet1`, incluyendo estados no publicados. El formulario de `/admin/login.html` lee, crea, actualiza y elimina filas de `Sheet1` (en adopción) y `Sheet2` (adoptados) en la hoja configurada en `config.js`. La web pública lee esas mismas dos pestañas; al recargar, muestra los cambios guardados.

## Configuración de Google

1. En Google Cloud Console, habilita **Google Sheets API** en el proyecto asociado al cliente OAuth de `config.js`.
2. Configura la pantalla de consentimiento OAuth y conserva el ID de cliente OAuth de tipo **Aplicación web**. Añade estos orígenes autorizados de JavaScript:
   - `https://lauraisidro.com`
   - `http://localhost:8000` para desarrollo local
3. En la pantalla de consentimiento, añade como usuarios de prueba las cuentas que van a usar el formulario mientras la aplicación esté en modo de prueba.
4. Comparte el Google Sheet con las cuentas administradoras como **Editor**. Una cuenta con permiso de solo lectura podrá ver el panel, pero Google rechazará sus cambios. No hace falta publicar un `client_secret` ni guardarlo en el repositorio.
5. En Google Sheets, publica solo las pestañas `Sheet1` y `Sheet2` para la web. No publiques el documento completo si contiene otras pestañas privadas. La publicación permite que la web pública lea los datos sin iniciar sesión; el formulario sigue necesitando una cuenta con permiso de Editor.
6. Comprueba que la primera fila de `Sheet1` tenga `Nombre`, `Edad` y `Descripción`; `Sheet2` debe tener `Nombre`. Se reconocen los encabezados existentes `Edad`, `Género`, `Raza`, `Carpeta`, `Teléfono`, `Descripción` y `Estado web`.

La página pide permiso OAuth de Google Sheets para editar el archivo seleccionado en `config.js`. Es un alcance sensible de Google; para uso público puede ser necesario verificar la pantalla de consentimiento. Mientras el consentimiento esté en modo de prueba, solo podrán autorizarse los usuarios de prueba.

## Acceso a las fotos

La carpeta de Drive se abre desde el panel de administración. Comparte esa carpeta con las cuentas que necesiten subir fotos. En la columna `Carpeta`, escribe el nombre de la carpeta de cada animal dentro de `media/animales`; la web pública buscará allí `00.jpg` y las imágenes de la galería.

## Fuente pública

La web pública lee las pestañas publicadas en Google Sheets y conserva el comportamiento de filtrado por `Estado web`. La hoja publicada será visible para cualquier persona; no guardes ahí datos privados. La lista opcional `allowedAdminEmails` en `config.js` puede limitar qué cuentas ven el formulario, pero los permisos de Editor del propio Google Sheet son los que autorizan las escrituras.
