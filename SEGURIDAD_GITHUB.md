# Seguridad para subir DAM a GitHub

## Que se protegio

- Se actualizo `.gitignore` para excluir secretos, entornos locales, dependencias, builds, caches, logs, backups, dumps, bases locales, certificados y llaves privadas.
- Se reforzo `frontend/.gitignore` por si el frontend se maneja como repositorio independiente.
- Se creo `backend/.env.example` sin credenciales reales.
- Se creo `frontend/.env.example` sin credenciales reales.
- Se revisaron patrones sensibles en frontend y backend:
  - `DATABASE_URL`
  - `JWT_SECRET_KEY`
  - tokens
  - claves Supabase
  - URLs PostgreSQL
  - llaves privadas
  - certificados
- No se encontraron secretos hardcodeados en `api.js`, `main.py`, `auth.py`, `database.py` ni configuraciones del frontend.
- `CORS_ORIGINS` ahora se puede configurar por variable de entorno.
- En produccion, si `ENVIRONMENT=production` y falta `JWT_SECRET_KEY`, el backend falla al iniciar para evitar despliegues inseguros.

## Que NO debes subir nunca

No subas a GitHub:

- `backend/.env`
- `frontend/.env`
- `frontend/.env.local`
- cualquier archivo `.env.*` real
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- claves de Supabase
- tokens de acceso
- credenciales de usuarios
- `node_modules/`
- `backend/venv/`
- `frontend/dist/`
- `build/`
- caches
- logs
- archivos `.sqlite`, `.db`, dumps o backups
- archivos `.pem`, `.key`, `.crt`, `.p12`, `.pfx`
- llaves SSH privadas

## Variables backend

Archivo local sugerido: `backend/.env`

```bash
ENVIRONMENT=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET_KEY=use-a-long-random-secret
JWT_EXPIRE_MINUTES=480
BCRYPT_ROUNDS=12
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

En produccion:

```bash
ENVIRONMENT=production
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=<valor-largo-seguro>
JWT_EXPIRE_MINUTES=480
BCRYPT_ROUNDS=12
CORS_ORIGINS=https://tu-frontend.vercel.app
```

`JWT_SECRET_KEY` debe ser largo, aleatorio y estable. Si cambia, las sesiones activas dejan de ser validas.

## Variables frontend

Archivo local sugerido: `frontend/.env.local`

```bash
VITE_API_URL=http://localhost:8000
```

En produccion:

```bash
VITE_API_URL=https://tu-backend.onrender.com
```

Importante: toda variable `VITE_*` queda expuesta en el bundle del navegador. No pongas secretos en variables `VITE_*`.

## Configuracion en Vercel

Para frontend en Vercel:

1. Entra al proyecto en Vercel.
2. Ve a `Settings` -> `Environment Variables`.
3. Agrega:
   - `VITE_API_URL=https://tu-backend.onrender.com`
4. Redeploy del frontend.

No agregues `DATABASE_URL`, `JWT_SECRET_KEY` ni claves privadas al proyecto frontend.

## Configuracion en Render

Para backend en Render:

1. Entra al servicio backend.
2. Ve a `Environment`.
3. Agrega:
   - `ENVIRONMENT=production`
   - `DATABASE_URL=...`
   - `JWT_SECRET_KEY=...`
   - `JWT_EXPIRE_MINUTES=480`
   - `BCRYPT_ROUNDS=12`
   - `CORS_ORIGINS=https://tu-frontend.vercel.app`
4. Guarda y redeploy.

No escribas secretos dentro del codigo ni dentro de archivos versionados.

## Supabase

Usa la URL de conexion de Supabase solo en el backend:

- Correcto: `backend/.env` o variables de entorno de Render.
- Incorrecto: `frontend/.env`, codigo React, `api.js`, documentos publicos o commits.

Si usas claves Supabase en el futuro:

- `service_role`: solo backend y nunca frontend.
- `anon`: puede usarse en frontend solo si las politicas RLS estan correctamente configuradas.

## Checklist antes de subir

Ejecuta una revision local:

```bash
find . -path './frontend/node_modules' -prune -o -path './backend/venv' -prune -o -path './frontend/dist' -prune -o -name '.env*' -print
```

Solo deberian aparecer:

- `backend/.env` local, ignorado por Git.
- `backend/.env.example`
- `frontend/.env.example`

Tambien revisa:

```bash
rg "DATABASE_URL|JWT_SECRET|SUPABASE|service_role|PRIVATE KEY|postgresql://" .
```

Si aparece un valor real, no hagas commit hasta moverlo a variables de entorno.

## Recomendaciones

- Antes del primer push, confirma que `backend/.env` no este trackeado.
- Si algun secreto ya fue subido alguna vez, no basta con borrarlo: rota la clave en Supabase/Render/Vercel.
- Usa un `JWT_SECRET_KEY` distinto para desarrollo y produccion.
- Mantén CORS restringido a dominios reales de frontend en produccion.
- No compartas capturas o logs que muestren `DATABASE_URL`.
- Haz respaldos de base de datos fuera del repositorio.

