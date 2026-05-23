# Limpieza Final DAM

## 1. Archivos eliminados

- `frontend/src/App.css`: solo contenia un comentario y no estaba importado.
- `frontend/src/pages/Menu.jsx`: wrapper antiguo reemplazado por `frontend/src/layouts/AppShell.jsx`; no tenia referencias activas.
- `frontend/src/context/SessionContext.jsx`: contexto preparado pero sin consumidores reales.
- `frontend/src/assets/hero.png`: asset sin referencias.
- `frontend/src/assets/vite.svg`: asset demo de Vite sin referencias.
- `frontend/src/assets/react.svg`: asset demo de React sin referencias.
- `frontend/src/assets/brand/`: carpeta vacia.
- `frontend/src/assets/`: carpeta vacia despues de eliminar assets sin uso.
- `backend/requirements.tsxt`: archivo vacio con extension mal escrita.
- `.DS_Store`: archivo local de sistema.
- `frontend/dist/`: artefacto generado por build; se valido el build y despues se retiro para no dejar salida compilada dentro de la limpieza.

## 2. Componentes eliminados

- `Menu.jsx`: era una capa vieja de compatibilidad visual y ya no se importaba. La navegacion queda en `AppShell.jsx`.
- `SessionContext`: se retiro porque no habia componentes que consumieran `useSession`; mantenerlo habria dejado estructura muerta.

## 3. Rutas eliminadas

No se eliminaron endpoints del backend.

En frontend se retiro la ruta/archivo antiguo `pages/Menu.jsx`, pero la navegacion activa se mantiene en:

- `frontend/src/layouts/AppShell.jsx`
- `frontend/src/routes/appRoutes.js`

Pantallas conservadas:

- Login
- Dashboard
- Caja/Cobro
- Historial Tickets
- Catalogo Servicios
- Estadisticas

## 4. Codigo duplicado eliminado

- Se elimino el wrapper frontend `Menu.jsx` porque duplicaba la responsabilidad del layout principal.
- Se retiro `SessionContext` porque duplicaba estado de sesion sin uso real.
- Se eliminaron assets de plantilla/demo que no formaban parte de DAM.
- Se corrigio `backend/app/utils/schema.py` para importar modelos antes de `Base.metadata.create_all()`, evitando depender de imports laterales.

## 5. CSS eliminado

Se quitaron estilos sin referencias JSX:

- `.input-like`
- `.total-input`
- `.table-input`
- `.chart-bars`
- `.chart-bars__item`
- `.chart-bars__bar`

La grafica actual usa `LineChart` con SVG y clases `.line-chart*`, por eso los estilos antiguos de barras ya no eran necesarios.

## 6. Imports optimizados

- `AppShell.jsx` ya no importa `useMemo` ni `SessionContext`.
- `main.jsx` conserva solo los estilos activos: `index.css` y `styles/polish.css`.
- `api.js` mantiene la fachada `api`, pero delega por modulos de dominio.
- Backend conserva imports modulares bajo `app.*`.

## 7. Que quedo reorganizado

Frontend fuente final:

```text
frontend/src/
  components/
  hooks/
  layouts/
  pages/
  routes/
  services/
    modules/
  styles/
  utils/
```

Backend fuente final:

```text
backend/
  app/
    auth/
    models/
    routes/
    schemas/
    services/
    utils/
    database.py
    dependencies.py
    main.py
  migrations/
```

## 8. Que se mantuvo por compatibilidad

Se conservaron wrappers raiz del backend:

- `backend/main.py`
- `backend/database.py`
- `backend/models.py`
- `backend/schemas.py`
- `backend/auth.py`
- `backend/schema_utils.py`

Motivo: aunque la arquitectura nueva vive en `backend/app/`, estos archivos evitan romper comandos, scripts o imports anteriores que usen `main:app`, `models`, `schemas`, `database`, `auth` o `schema_utils`.

Tambien se conservaron columnas legacy/snapshot:

- `servicios.categoria`: se usa como fallback historico mientras `categoria_id` es la relacion principal.
- `tickets.nombre_cliente` y `tickets.cajero_nombre`: snapshots necesarios para tickets historicos.
- `ticket_detalles.nombre_servicio` y `ticket_detalles.categoria_servicio`: snapshots historicos.
- `ticket_detalles.nombre`: campo normalizado actual; convive con `nombre_servicio` por compatibilidad.
- `usuarios.pin_acceso`: nullable para migracion progresiva hacia `password_hash`.
- `clientes.correo`: no se usa en UI actual, pero el schema lo soporta y no conviene eliminarlo.

## 9. Base de datos

No se eliminaron tablas ni columnas. No se recomienda borrar datos historicos.

Columnas que parecen redundantes pero conviene mantener por ahora:

- `servicios.categoria`: compatibilidad con servicios antiguos.
- `ticket_detalles.nombre_servicio`: compatibilidad con tickets previos.
- `ticket_detalles.categoria_servicio`: snapshot historico.
- `usuarios.pin_acceso`: soporte temporal para migrar usuarios antiguos al primer login.

Recomendacion futura: cuando todos los usuarios tengan `password_hash`, todos los servicios tengan `categoria_id`, y se confirme que no hay consumidores legacy, se puede planear una migracion controlada para retirar columnas antiguas. No hacerlo sin respaldo.

## 10. Recomendaciones futuras

- Mantener `frontend/dist/`, `node_modules/`, `backend/venv/`, `.env` y `.DS_Store` fuera del proyecto versionado.
- Agregar tests para login, tickets, catalogo y estadisticas antes de eliminar mas compatibilidad.
- Si productos tendran inventario, crear tabla `productos`; si solo son conceptos ocasionales, mantenerlos en `ticket_detalles` con `tipo = 'producto'`.
- En una fase posterior, evaluar mover reglas visuales de `index.css` hacia archivos por dominio si el CSS crece mucho mas.
- Mantener los wrappers raiz del backend hasta confirmar que nadie ejecuta imports antiguos.

## 11. Verificacion realizada

Se ejecuto sin levantar servidores:

- `npm run lint`
- `npm run build`
- `python -m py_compile` con cache fuera del proyecto
- Import de `app.main:app`
- Import de `main:app`

No se ejecuto `npm run dev`, `npm start`, `uvicorn` ni previews.

