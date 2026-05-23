CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE servicios
ADD COLUMN IF NOT EXISTS categoria_id INTEGER REFERENCES categorias(id),
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

INSERT INTO categorias (nombre, activa)
SELECT DISTINCT COALESCE(NULLIF(TRIM(categoria), ''), 'General'), TRUE
FROM servicios
WHERE COALESCE(NULLIF(TRIM(categoria), ''), 'General') NOT IN (SELECT nombre FROM categorias);

UPDATE servicios
SET categoria_id = categorias.id
FROM categorias
WHERE servicios.categoria_id IS NULL
AND categorias.nombre = COALESCE(NULLIF(TRIM(servicios.categoria), ''), 'General');

ALTER TABLE ticket_detalles
ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'servicio',
ADD COLUMN IF NOT EXISTS categoria_id INTEGER REFERENCES categorias(id),
ADD COLUMN IF NOT EXISTS nombre TEXT,
ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS subtotal INTEGER NOT NULL DEFAULT 0;

UPDATE ticket_detalles
SET nombre = COALESCE(nombre, nombre_servicio, 'Servicio'),
    subtotal = CASE WHEN subtotal IS NULL OR subtotal = 0 THEN precio_cobrado ELSE subtotal END
WHERE nombre IS NULL OR subtotal IS NULL OR subtotal = 0;

ALTER TABLE ticket_detalles
ALTER COLUMN servicio_id DROP NOT NULL;
