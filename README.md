# Mi lista de Películas & Series — GitHub Pages + TMDB + Supabase

Esta versión usa:

- **GitHub Pages** para alojar la página.
- **TMDB API** para buscar películas/series, posters, año y descripción.
- **Supabase** para guardar la lista online y sincronizarla entre PC y celular.
- **Supabase Auth** para que la lista sea personal.

> Importante: GitHub Pages por sí solo no funciona como base de datos. No conviene poner un token privado de GitHub dentro de JavaScript del navegador. Por eso GitHub aloja la web y Supabase almacena los datos.

## 1. TMDB

Creá una cuenta en TMDB y solicitá una API key desde la configuración de tu cuenta.

Después copiá `config.example.js` como `config.js` y completá:

```js
TMDB_API_KEY: "TU_API_KEY"
```

La documentación oficial de TMDB explica la autenticación y el uso de imágenes.

## 2. Supabase

Creá un proyecto en Supabase.

En **SQL Editor**, ejecutá todo el contenido de `supabase.sql`.

Después buscá las credenciales de la API del proyecto y completá en `config.js`:

```js
SUPABASE_URL: "https://tu-proyecto.supabase.co",
SUPABASE_ANON_KEY: "tu-clave-publica"
```

La clave `anon`/publishable puede estar en una aplicación frontend, pero la seguridad depende de las políticas RLS incluidas en `supabase.sql`.

## 3. Configurar el login

La página utiliza un enlace enviado por correo (magic link).

En Supabase configurá la URL de tu sitio de GitHub Pages como URL permitida para autenticación.

Por ejemplo:

`https://TU-USUARIO.github.io/TU-REPOSITORIO/`

## 4. Subir a GitHub

Subí:

- `index.html`
- `style.css`
- `app.js`
- `config.js`
- `config.example.js`
- `supabase.sql`
- `README.md`

Después:

**GitHub → Settings → Pages → Deploy from a branch → main → /(root)**

## 5. Qué queda guardado

La información de cada título queda en Supabase:

- título
- tipo
- año
- poster
- descripción
- visto/pendiente
- me gustó/no me gustó
- usuario propietario

Así podés abrir la misma página desde la PC, celular u otro navegador, iniciar sesión con el mismo correo y ver la misma lista.

## 6. Sobre GitHub

Los archivos de la página sí quedan en tu repositorio GitHub, pero la lista de películas no se guarda dentro del repositorio.

Hacer que el navegador escriba directamente en un repositorio GitHub requeriría manejar autenticación y permisos de GitHub, y poner un token con permisos de escritura en una página pública sería una mala práctica de seguridad.

## TMDB

This product uses the TMDB API but is not endorsed or certified by TMDB.
