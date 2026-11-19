# Lenz: cómo actualizar tu proyecto en GitHub y Vercel

Ya tienes el repositorio y la cuenta de Vercel. Solo hay que reemplazar y agregar archivos.

## 1. En GitHub (repositorio "testeo")
1. En la página principal del repositorio: Add file → Upload files.
   Sube `index.html` y `vercel.json` (index.html reemplaza al anterior).
2. Entra a la carpeta `api` (clic en "api"). Add file → Upload files.
   Sube `chat.js` y `_curso.js` (chat.js reemplaza al anterior).
3. Pulsa "Commit changes" en cada subida.

`package.json` no cambia.

## 2. En Vercel
1. Abre tu proyecto → Settings → Environment Variables.
2. Agrega `ANTHROPIC_API_KEY` con tu clave (la que creaste en la consola).
3. Opcionales:
   - `ACCESS_CODE`: un código; sin él, la página pide la clave y no responde. Úsalo para que solo tus compañeros puedan usarlo.
   - `RATE_LIMIT`: preguntas por hora por persona (por defecto 40).
   - `MODEL`: modelo a usar (por defecto claude-sonnet-5-5).
4. Vercel vuelve a desplegar solo al subir archivos. Si cambias variables, ve a Deployments → Redeploy.

## 3. Cuidado con el gasto
En console.anthropic.com revisa "Gasto" y deja un límite mensual bajo.
