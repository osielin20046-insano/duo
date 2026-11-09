# DÚO — Conoce a tu equipo

DÚO es una aplicación web en español para integrar equipos mediante dos dinámicas sociales: **Completa la frase** y **¿Qué personaje eres?**. Es un MVP con salas compartidas en Supabase, listo para desplegarse como SPA en Vercel.

## Tecnologías

- React, TypeScript y Vite
- React Router para navegación
- Framer Motion para transiciones
- Lucide React para iconografía
- Tailwind CSS 4 (plugin de Vite) y estilos de producto en CSS
- Persistencia en Supabase (API REST) desde `src/services.ts`, con copia en `localStorage`

## Instalación y ejecución

Requisitos: Node.js 20.19+ o 22.12+ y npm.

```bash
cp .env.example .env.local   # completa tu URL y tu clave anon de Supabase (este archivo no se versiona)
npm install
npm run dev
```

Vite mostrará la dirección local, normalmente `http://localhost:5173`. Para crear y previsualizar el build:

```bash
npm run build
npm run preview
```

## Funcionalidades

- Crear una sala o unirse desde otro dispositivo con el código compartido; los participantes entran individualmente.
- Dinámica compartida Coincidencias: todos responden la misma pregunta y el anfitrión revela el mural cuando participa el equipo completo.
- Dinámica Radar del equipo: todos votan por una persona para una consigna positiva y descubren juntos el resultado.
- Cuestionario individual de perfiles disponible desde los resultados del equipo.
- Vista del equipo con integrantes, actividad en vivo y guía para compartir la sala.
- Diseño responsive, navegación SPA, estados vacíos y confirmaciones/mensajes de estado.

## Estructura

```text
src/
  App.tsx       Pantallas y flujos de la aplicación
  data.ts       42 frases, 8 preguntas y 6 personajes
  services.ts   Salas (Supabase), caché local y comparación de respuestas
  styles.css    Sistema visual responsive y animaciones
  main.tsx      Punto de entrada
```

## Persistencia y límites conocidos

Las salas, integrantes, resultados, historial y puntuaciones se guardan en Supabase. La sesión activa se conserva en `localStorage` para recordar quién eres en ese navegador. La app vuelve a consultar la sala cada tres segundos para reflejar cambios entre dispositivos. Todas las lecturas y escrituras pasan por funciones de Postgres (`duo_get_room`, `duo_join_room`, `duo_add_round`…) que bloquean la sala mientras la modifican, así que varios jugadores guardando a la vez no se pisan. El acceso es por código y nombre; esta configuración sirve para un MVP y no implementa autenticación de usuarios. El navegador ya no puede leer ni escribir la tabla directamente: solo llama a esas funciones, que exigen conocer el código de sala (nadie puede listar o sobrescribir salas ajenas). Aun así, quien tenga el código puede entrar a la sala, así que no guardes información sensible.

La coincidencia aproximada compara palabras normalizadas en español y no usa IA. El empate del cuestionario elige aleatoriamente entre los perfiles con más respuestas. Los resultados son lúdicos, no son evaluaciones psicológicas.

La app guarda las salas en Supabase para compartirlas entre dispositivos. Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` localmente y como variables de entorno en Vercel. Ejecuta `supabase-setup.sql` en el SQL Editor de Supabase. Usa únicamente la clave publishable/anon en el navegador; nunca uses una clave `secret` o `service_role`.

## Despliegue en Vercel

1. Sube este proyecto a un repositorio Git.
2. Impórtalo en Vercel. El preset de Vite detecta `npm run build` y `dist` como salida.
3. Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Settings → Environment Variables.
4. `vercel.json` reescribe las rutas SPA a `index.html`, permitiendo recargar rutas internas.

> Ejecuta `supabase-setup.sql` en el SQL Editor **antes** de desplegar esta versión (es idempotente y conserva las salas existentes): el cliente ya no funciona con las políticas abiertas de la versión anterior.

## Pruebas

```bash
npm test                      # cliente: comparación de respuestas y flujo de salas (servidor simulado)
./scripts/test-sql.sh         # SQL: permisos y concurrencia reales; requiere un Postgres local (ver el encabezado del script)
```
