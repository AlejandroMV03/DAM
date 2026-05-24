# Inventario y Productos DAM

Este modulo agrega productos de venta, categorias de producto, movimientos de inventario y venta de productos desde Caja/Cobro.

## Tablas nuevas

### categorias_productos
- `id`
- `nombre`
- `descripcion`
- `activa`
- `created_at`
- `updated_at`

### productos
- `id`
- `categoria_producto_id`
- `nombre`
- `descripcion`
- `precio`
- `stock`
- `stock_minimo`
- `activo`
- `created_at`
- `updated_at`

### movimientos_inventario
- `id`
- `producto_id`
- `tipo_movimiento`
- `cantidad`
- `stock_anterior`
- `stock_nuevo`
- `motivo`
- `ticket_id`
- `created_at`

## Cambios en ticket_detalles

La migracion agrega:
- `producto_id`
- `categoria_producto_id`
- `categoria_producto_nombre`

Los tickets antiguos siguen funcionando aunque no tengan esos campos llenos.

## Migracion

Ejecutar:

```sql
backend/migrations/005_productos_inventario.sql
```

El backend tambien ejecuta migraciones idempotentes al iniciar, pero en Supabase puedes correr este archivo manualmente desde SQL Editor.

## Endpoints nuevos

Categorias de productos:
- `GET /api/categorias-productos`
- `POST /api/categorias-productos`
- `PUT /api/categorias-productos/{id}`
- `DELETE /api/categorias-productos/{id}`

Productos:
- `GET /api/productos`
- `GET /api/productos?categoriaId=`
- `GET /api/productos/buscar?nombre=`
- `POST /api/productos`
- `PUT /api/productos/{id}`
- `DELETE /api/productos/{id}`

Inventario:
- `GET /api/inventario/movimientos`
- `POST /api/inventario/entrada`
- `POST /api/inventario/ajuste`

## Relacion con tickets

`POST /api/tickets` acepta conceptos `servicio` y `producto`.

Cuando un concepto es producto:
- Valida que `producto_id` exista y este activo.
- Valida stock suficiente.
- Usa el precio actual del producto desde backend.
- Descuenta stock en la misma transaccion del ticket.
- Crea un movimiento `venta` con `ticket_id`.
- Guarda el detalle en `ticket_detalles`.

Si algo falla, la transaccion se revierte y no queda stock descontado sin ticket.

## Caja/Cobro

La pantalla Caja/Cobro ahora permite agregar conceptos:
- Servicio: categoria, servicio, precio y cantidad.
- Producto: categoria de producto, busqueda por nombre, producto disponible, precio, stock y cantidad.

No permite agregar mas cantidad que el stock disponible. El backend vuelve a validar stock para evitar inconsistencias.

## Movimientos de inventario

Tipos usados:
- `entrada`: suma stock.
- `ajuste`: cambia el stock al valor indicado.
- `venta`: resta stock cuando se genera un ticket.

Cada movimiento registra stock anterior, stock nuevo, cantidad, motivo y ticket relacionado si aplica.

## Estadisticas

Las estadisticas ahora incluyen:
- Venta total combinada.
- Venta total por servicios.
- Venta total por productos.
- Productos mas vendidos.
- Categorias de productos mas vendidas.
- Productos con stock bajo.

## Archivos creados

- `backend/app/routes/inventory.py`
- `backend/app/services/inventory_service.py`
- `backend/migrations/005_productos_inventario.sql`
- `frontend/src/pages/ProductosInventario.jsx`
- `frontend/src/services/modules/inventario.js`
- `INVENTARIO_PRODUCTOS_DAM.md`

## Archivos modificados

- `backend/app/main.py`
- `backend/app/models/__init__.py`
- `backend/app/schemas/__init__.py`
- `backend/app/services/ticket_service.py`
- `backend/app/services/stats_service.py`
- `backend/models.py`
- `backend/schemas.py`
- `frontend/src/services/api.js`
- `frontend/src/routes/appRoutes.js`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Ingresos.jsx`
- `frontend/src/pages/Tickets.jsx`
- `frontend/src/pages/Estadisticas.jsx`
- `frontend/src/utils/ticket.js`
- `frontend/src/index.css`

## Pruebas manuales recomendadas

1. Ejecutar la migracion `005_productos_inventario.sql`.
2. Crear una categoria de producto.
3. Crear un producto con precio entero, stock y stock minimo.
4. Registrar una entrada de inventario y revisar que el stock suba.
5. Registrar un ajuste manual y revisar el movimiento.
6. En Caja/Cobro, agregar un servicio y un producto al mismo ticket.
7. Intentar vender mas productos que el stock disponible y confirmar que se rechaza.
8. Generar ticket con producto y confirmar que el stock baja.
9. Abrir historial de tickets y descargar PDF para revisar servicios, productos, cantidades y subtotales.
10. Revisar Estadisticas: total productos, productos mas vendidos, categorias de productos y stock bajo.
