-- Modulo de productos e inventario. Migracion idempotente y segura.

CREATE TABLE IF NOT EXISTS categorias_productos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    categoria_producto_id INTEGER NOT NULL REFERENCES categorias_productos(id),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio INTEGER NOT NULL CHECK (precio > 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    tipo_movimiento TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL CHECK (stock_nuevo >= 0),
    motivo TEXT,
    ticket_id INTEGER REFERENCES tickets(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ticket_detalles
ADD COLUMN IF NOT EXISTS producto_id INTEGER REFERENCES productos(id),
ADD COLUMN IF NOT EXISTS categoria_producto_id INTEGER REFERENCES categorias_productos(id),
ADD COLUMN IF NOT EXISTS categoria_producto_nombre TEXT;

CREATE INDEX IF NOT EXISTS idx_categorias_productos_activa ON categorias_productos (activa);
CREATE INDEX IF NOT EXISTS idx_productos_categoria_producto_id ON productos (categoria_producto_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos (activo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria_activo ON productos (categoria_producto_id, activo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre_lower ON productos (LOWER(nombre));
CREATE INDEX IF NOT EXISTS idx_productos_stock_bajo ON productos (stock, stock_minimo);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_producto_id ON movimientos_inventario (producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_ticket_id ON movimientos_inventario (ticket_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_created_at ON movimientos_inventario (created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_detalles_producto_id ON ticket_detalles (producto_id);
CREATE INDEX IF NOT EXISTS idx_ticket_detalles_categoria_producto_id ON ticket_detalles (categoria_producto_id);
