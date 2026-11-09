# DÚO · Convive con tu equipo

DÚO es una aplicación web para que un equipo se reúna en una sala temporal y juegue dinámicas breves para conocerse mejor. El anfitrión controla qué dinámica se juega y cuándo; al iniciar, todos los participantes conectados entran automáticamente a la misma actividad.

## Cómo se usa

1. Una persona crea una sala y comparte el código.
2. Cada compañero abre la app desde su propio dispositivo y entra con el código y su nombre.
3. En **Equipo**, el anfitrión puede iniciar una dinámica de inmediato o programarla para una hora.
4. La sala se actualiza entre dispositivos. Cuando la dinámica empieza, los participantes son enviados a ella automáticamente.
5. Al terminar, el anfitrión puede lanzar otra ronda o volver a la sala.

La vista **Equipo** muestra quién está en la sala, quién es el anfitrión y el avance de la ronda activa. Las actividades requieren la participación de todo el equipo para revelar los resultados.

## Dinámicas

- **Coincidencias:** todos responden una misma pregunta; después el equipo lee las respuestas y descubre puntos en común.
- **Radar del equipo:** todos eligen a un compañero para una consigna positiva y luego ven el resultado compartido.

El cuestionario individual de perfiles permanece disponible como una actividad complementaria desde los resultados del equipo.

## Tecnologías

- React, TypeScript y Vite
- React Router para navegación
- Framer Motion para transiciones
- Lucide React para iconografía
- Tailwind CSS 4 y estilos propios en CSS
- Supabase para salas compartidas y persistencia entre dispositivos

## Requisitos y ejecución local

Se requiere Node.js 20.19 o posterior y npm.

```bash
npm install
npm run dev
```

Para que las salas funcionen, configura las variables de Supabase en `.env.local` (consulta `.env.example`):

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICABLE
```

Vite mostrará la dirección local, normalmente `http://localhost:5173`. Para generar y previsualizar la versión de producción:

```bash
npm run build
npm run preview
```

## Configuración de Supabase

Ejecuta el archivo completo `supabase-setup.sql` en **Supabase → SQL Editor**. El script configura la tabla y las funciones de base de datos que usa la app. Es idempotente y puede volver a ejecutarse para actualizar la configuración.

El navegador usa solo la URL del proyecto y la clave publicable/anon. No pongas claves `secret` o `service_role` en el frontend ni en variables `VITE_`.

La app consulta la sala periódicamente para reflejar cambios en otros dispositivos. La sesión del participante se conserva en el almacenamiento de sesión del navegador y se elimina al cerrar esa sesión del navegador. La sala se elimina automáticamente si el anfitrión deja de enviar señales durante cinco minutos. El acceso se basa en el código de sala y el nombre, sin cuentas de usuario; comparte el código solo con tu equipo y no incluyas información sensible.

## Despliegue en Vercel

1. Importa el repositorio en Vercel y usa la configuración de Vite: comando de build `npm run build` y directorio de salida `dist`.
2. En **Settings → Environment Variables**, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para Production y Preview según necesites.
3. Ejecuta `supabase-setup.sql` en el proyecto de Supabase conectado a esas variables.
4. Despliega o vuelve a desplegar la rama correspondiente después de guardar las variables.

`vercel.json` configura las rutas SPA para que las páginas internas también funcionen al abrirlas o recargarlas directamente.

## Estructura principal

```text
src/
  App.tsx       Vistas, navegación y dinámicas de la aplicación
  data.ts       Preguntas y datos de las actividades
  services.ts   Salas, sesión local y comunicación con Supabase
  styles.css    Estilos responsive y animaciones
  main.tsx      Punto de entrada
supabase-setup.sql  Tabla, permisos y funciones RPC de Supabase
```

## Comandos disponibles

```bash
npm run dev       # servidor local de desarrollo
npm run build     # comprobación TypeScript y build de producción
npm run preview   # vista previa del build
npm test          # pruebas unitarias
```
