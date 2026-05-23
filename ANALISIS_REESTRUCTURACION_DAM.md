# Analisis de Reestructuracion DAM

## 1. Resumen general

Se reorganizo el proyecto DAM con una estructura mas profesional y mantenible, conservando los endpoints, payloads y flujos existentes. El backend quedo modularizado en `backend/app/` con rutas, servicios, modelos, schemas, autenticacion, base de datos y utilidades separadas. El frontend quedo mas ordenado con layout principal, rutas centralizadas, modulos API por dominio, utilidades de fecha reutilizables, hooks y contexto de sesion.

No se ejecutaron servidores, previews, `npm run dev`, `npm start` ni `uvicorn`.

## 2. Nueva estructura de carpetas

```text
backend/
  app/
    main.py
    database.py
    dependencies.py
    auth/
    models/
    schemas/
    routes/
    services/
    utils/
  migrations/
  main.py
  database.py
  models.py
  schemas.py
  auth.py
  schema_utils.py

frontend/src/
  components/
  context/
  hooks/
  layouts/
  pages/
  routes/
  services/
    modules/
  styles/
  utils/
```

Los archivos raiz del backend (`main.py`, `models.py`, `schemas.py`, `database.py`, `auth.py`, `schema_utils.py`) quedaron como wrappers de compatibilidad para no romper comandos o imports anteriores.

## 3. Cambios en frontend

- `frontend/src/layouts/AppShell.jsx`: nuevo layout principal con sidebar, header movil, bottom nav y render de pantalla activa.
- `frontend/src/routes/appRoutes.js`: centraliza pantallas, nombres e iconos de navegacion.
- `frontend/src/utils/date.js`: centraliza `fechaISO`, rangos de periodo y formateo de fechas.
- `frontend/src/hooks/useDebouncedValue.js`: reutilizable para busquedas con debounce.
- `frontend/src/context/SessionContext.jsx`: contexto base de sesion para futuras pantallas/componentes.
- `frontend/src/services/api.js`: conserva el objeto `api`, pero ahora compone modulos separados.
- `frontend/src/styles/polish.css`: capa visual para transiciones, foco accesible, cards, tablas moviles y refinamiento responsive.
- `frontend/src/components/DamLogo.jsx`: usa el asset publico correctamente con `/DAM.png`.

## 4. Cambios en backend

- `backend/app/main.py`: crea la app FastAPI, CORS, lifespan y registra routers.
- `backend/app/routes/`: separa auth, catalogo, clientes, tickets, estadisticas y health.
- `backend/app/services/`: contiene logica de negocio y serializacion.
- `backend/app/models/`: contiene modelos SQLAlchemy.
- `backend/app/schemas/`: contiene schemas Pydantic.
- `backend/app/auth/security.py`: contiene hash de passwords, JWT y validacion de credenciales.
- `backend/app/utils/schema.py`: crea tablas y aplica migraciones.
- `backend/app/utils/dates.py`: validacion y rangos de fechas compartidos.

## 5. Cambios en base de datos

No se borra ni modifica destructivamente informacion existente. Se agrego una migracion segura:

- `backend/migrations/004_indices_integridad_operativa.sql`

Esta migracion solo crea indices `IF NOT EXISTS` para mejorar consultas frecuentes en categorias, servicios, tickets y detalles.

## 6. Pantallas creadas o movidas

Las pantallas funcionales se mantienen en:

- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Ingresos.jsx`
- `frontend/src/pages/Tickets.jsx`
- `frontend/src/pages/RegistroServicios.jsx`
- `frontend/src/pages/Estadisticas.jsx`

`frontend/src/pages/Menu.jsx` queda como wrapper de compatibilidad hacia `frontend/src/layouts/AppShell.jsx`.

## 7. Componentes creados

- `AppShell`: layout general.
- `SessionContext`: contexto preparado para sesion.
- `useDebouncedValue`: hook para busqueda diferida.

Se conservaron y reutilizaron los componentes existentes en `frontend/src/components/ui.jsx`: `PageHeader`, `Card`, `Button`, `StatCard`, `Field`, `Alert`, `EmptyState`, `Spinner`, `Skeleton`, `Modal` y `ToastHost`.

## 8. Conexion frontend/backend

La URL base sigue siendo:

```js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

Todas las peticiones pasan por `frontend/src/services/api.js`, que agrega `Authorization: Bearer <token>` cuando existe token en `sessionStorage`.

## 9. API JS y modulos

`api.js` ahora exporta:

- `authApi`: login y sesion.
- `catalogoApi`: categorias y servicios.
- `clientesApi`: busqueda de clientes.
- `ticketsApi`: crear y consultar tickets.
- `estadisticasApi`: consulta de estadisticas.
- `api`: objeto compatible que agrupa todo lo anterior.

Esto mantiene compatibilidad con las pantallas actuales y permite crecimiento ordenado.

## 10. Rutas/endpoints

Se mantienen los endpoints existentes:

- `GET /`
- `POST /api/login`
- `GET /api/me`
- `GET /api/categorias`
- `POST /api/categorias`
- `PUT /api/categorias/{categoria_id}`
- `DELETE /api/categorias/{categoria_id}`
- `GET /api/servicios`
- `POST /api/servicios`
- `PUT /api/servicios/{servicio_id}`
- `DELETE /api/servicios/{servicio_id}`
- `GET /api/clientes/buscar`
- `POST /api/clientes`
- `POST /api/tickets`
- `GET /api/tickets`
- `GET /api/tickets/{ticket_id}`
- `GET /api/estadisticas`

## 11. Modelos y schemas

Modelos principales:

- `Usuario`
- `Cliente`
- `Categoria`
- `Servicio`
- `Ticket`
- `TicketDetalle`

Schemas principales:

- `CategoriaCrear`, `CategoriaActualizar`, `CategoriaRespuesta`
- `ServicioCrear`, `ServicioActualizar`, `ServicioRespuesta`
- `ClienteCrear`, `ClienteRespuesta`
- `ConceptoTicketCrear`, `ConceptoTicketRespuesta`
- `TicketCrear`, `TicketRespuesta`

## 12. Flujo de tickets

La pantalla de caja crea conceptos de servicio o producto. El backend valida sesion, cajero, conceptos y total. Luego crea:

1. Cliente existente o nuevo.
2. Ticket con snapshot de cliente/cajero.
3. Detalles con snapshot de nombre, categoria, precio, cantidad y subtotal.

Esto conserva tickets historicos aunque cambien servicios o categorias despues.

## 13. Flujo de caja/cobro

`Ingresos.jsx` carga categorias y servicios, busca clientes con debounce, permite servicio principal, cobros adicionales y metodo de pago. El payload llega a `POST /api/tickets` y se registra como ticket pagado.

## 14. Flujo de estadisticas

`Estadisticas.jsx` consulta `GET /api/estadisticas` con periodo y fechas. El backend construye series por dia, semana, mes, anio o rango, calcula ingresos, tickets, promedio, conceptos mas vendidos y mejor dia.

## 15. Login/autenticacion

El login usa `POST /api/login`. El backend soporta migracion progresiva desde `pin_acceso` plano hacia `password_hash` con bcrypt + SHA-256 previo. El token JWT se devuelve al frontend y se guarda en `sessionStorage`. Las rutas protegidas usan `HTTPBearer` y `obtener_usuario_actual`.

Recomendacion: configurar `JWT_SECRET_KEY` fija en `backend/.env` para que los tokens no cambien al reiniciar el backend.

## 16. Migraciones necesarias

Ejecutar migraciones existentes si la base aun no las tiene:

- `001_ticket_snapshots.sql`
- `002_categorias_conceptos.sql`
- `003_auth_jwt_password_hash.sql`
- `004_indices_integridad_operativa.sql`

El backend aplica migraciones en el lifespan de FastAPI y `create_tablas.py` tambien usa el mismo flujo.

## 17. Comandos manuales

Frontend:

```bash
cd frontend
npm install
npm run lint
npm run build
```

Backend:

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python create_tablas.py
```

Para iniciar manualmente cuando tu decidas:

```bash
cd backend
uvicorn app.main:app --reload
```

Alternativa compatible:

```bash
cd backend
uvicorn main:app --reload
```

## 18. Pendientes y recomendaciones

- Agregar `JWT_SECRET_KEY` fija y segura en `backend/.env`.
- Considerar Alembic si el proyecto seguira creciendo con migraciones mas complejas.
- Crear tests automatizados para tickets, catalogo, login y estadisticas.
- Revisar si conviene una tabla formal `productos` si se venderan productos recurrentes con inventario.
- Mantener `.env`, `venv`, `node_modules` y `dist` fuera de versionado.
- Mejorar graficas futuras con una libreria si se necesitan tooltips avanzados.

