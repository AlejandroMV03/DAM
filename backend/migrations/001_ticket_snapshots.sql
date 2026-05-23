-- Ejecuta este archivo en Supabase SQL Editor o con psql antes de usar los nuevos tickets.
-- Mantiene datos historicos del ticket aunque despues edites cliente, cajero o servicio.

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS nombre_cliente TEXT,
ADD COLUMN IF NOT EXISTS cajero_nombre TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pagado';

ALTER TABLE ticket_detalles
ADD COLUMN IF NOT EXISTS nombre_servicio TEXT,
ADD COLUMN IF NOT EXISTS categoria_servicio TEXT;

UPDATE tickets
SET estado = 'pagado'
WHERE estado IS NULL;
