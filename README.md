# HelpMap Venezuela

**HelpMap Venezuela** es una plataforma humanitaria creada en respuesta a la emergencia generada por los terremotos en Venezuela. Su objetivo es ofrecer a la población una **fuente de información confiable y centralizada** en medio del caos y la desinformación que suele propagarse durante una crisis.

La plataforma permite:

- **Ubicar en un mapa** centros de ayuda, refugios y puntos de acopio activos, con su estado y necesidades actualizadas.
- **Reportar y contribuir** información desde el terreno (fotos, listas de necesidades, nuevos puntos) para mantener los datos al día.
- **Coordinar voluntarios**, centralizando el registro y la comunicación con quienes quieren colaborar.
- **Sincronizar datos** con aliados externos (n8n, Acopiove) para ampliar el alcance y evitar duplicar esfuerzos entre organizaciones.

En un contexto donde la información oficial puede ser escasa, lenta o contradictoria, este proyecto busca reducir la incertidumbre para las personas afectadas y facilitar que la ayuda llegue a donde más se necesita.

Construido con [Next.js](https://nextjs.org) (App Router) y [Supabase](https://supabase.com) como backend.

## Requisitos

- Node.js 20+
- Una cuenta/proyecto de [Supabase](https://supabase.com)

## Puesta en marcha

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Configurar variables de entorno**

   Copia `.env.example` a `.env.local` y completa al menos las variables de Supabase:

   ```bash
   cp .env.example .env.local
   ```

   Ver la tabla de [Variables de entorno](#variables-de-entorno) más abajo para el detalle de cada una.

3. **Preparar la base de datos**

   En el SQL Editor de tu proyecto de Supabase, ejecuta en orden:

   - [`db.sql`](./db.sql) — esquema principal (centros, refugios, contribuciones, reportes)
   - [`db/volunteers.sql`](./db/volunteers.sql) — tabla de voluntarios

   Luego crea los buckets de Storage usados para fotos:

   - `intake-photos` (o el valor de `NEXT_PUBLIC_SUPABASE_INTAKE_BUCKET`)
   - `contrib-photos` (o el valor de `NEXT_PUBLIC_SUPABASE_CONTRIB_BUCKET`)

4. **Levantar el servidor de desarrollo**

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000).

   > `npm run dev` corre con `--max-old-space-size=6144` porque el build de desarrollo puede agotar memoria con el heap por defecto. Si prefieres el comando estándar de Next, usa `npm run dev:default`.

## Scripts disponibles

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (con heap ampliado) |
| `npm run dev:default` | Servidor de desarrollo, `next dev` estándar |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | Corre ESLint |

## Variables de entorno

Todas están documentadas con más contexto en [`.env.example`](./.env.example).

| Variable | Requerida | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (anon) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave de servicio, solo servidor (rutas `/api/admin`) |
| `NEXT_PUBLIC_SUPABASE_INTAKE_BUCKET` | No | Bucket para fotos de intake (default `intake-photos`) |
| `NEXT_PUBLIC_SUPABASE_CONTRIB_BUCKET` | No | Bucket para fotos de contribuciones (default `contrib-photos`) |
| `NEXT_PUBLIC_SITE_URL` | No | URL pública del sitio, usada en sitemap/robots/emails |
| `NEXT_PUBLIC_GA_ID` | No | ID de Google Analytics |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | No | Credenciales SMTP para envío de correos (contacto, notificaciones) |
| `CONTACT_TO` | No | Destinatario del formulario de contacto |
| `N8N_CENTERS_WEBHOOK_URL`, `N8N_UPLOAD_WEBHOOK_URL`, `N8N_LISTS_WEBHOOK_URL` | No | Webhooks de n8n para sincronización de datos |
| `ACOPIOVE_API_URL`, `ACOPIOVE_PUSH_ENABLED` | No | Integración con la API de Acopiove |
| `CRON_SECRET` | No | Secreto esperado por el cron de Vercel en `/api/refugios/sync` |
| `TRUST_CF_IP`, `TRUSTED_PROXY_HOPS` | No | Config de rate limiting cuando la app corre detrás de un proxy/CDN |

## Estructura del proyecto

```
app/                    Rutas Next.js (App Router)
  api/                  Route handlers (backend)
    admin/              Panel de administración (voluntarios)
    centers/            Centros de ayuda
    contact/            Formulario de contacto
    contributions/      Contribuciones de usuarios (con fotos)
    intake/             Intake de nuevos centros/reportes
    lists/              Listas de necesidades
    refugios/           Refugios (sync, push a Acopiove)
    reports/            Reportes
    v1/                 API pública versionada
    volunteers/         Registro de voluntarios
  auth/                 Login y reset de contraseña
  docs/                 Documentación embebida en la app (incluye roadmap)
  p/[id]/               Vista pública de un punto/centro
components/             Componentes React compartidos
lib/                    Utilidades de servidor (email, rate limiting, sanitización, integración Acopiove)
utils/supabase/         Clientes de Supabase (browser, server, admin)
db.sql                  Esquema principal de la base de datos
db/volunteers.sql       Esquema de la tabla de voluntarios
```

## Despliegue

El proyecto está pensado para desplegarse en [Vercel](https://vercel.com). `vercel.json` define un cron diario (`/api/refugios/sync` a las 06:00 UTC) que requiere `CRON_SECRET` configurado en las variables de entorno del proyecto en Vercel.

Recuerda configurar en Vercel las mismas variables de entorno que en `.env.local`.

## Aprender más sobre Next.js

- [Documentación de Next.js](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Repositorio de Next.js en GitHub](https://github.com/vercel/next.js)
