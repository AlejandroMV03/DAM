-- Agrega almacenamiento seguro para credenciales sin borrar usuarios existentes.
-- pin_acceso queda temporalmente nullable para permitir migracion progresiva a password_hash.

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE usuarios
ALTER COLUMN pin_acceso DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_nombre ON usuarios (nombre);
CREATE INDEX IF NOT EXISTS idx_tickets_fecha_hora ON tickets (fecha_hora);
CREATE INDEX IF NOT EXISTS idx_tickets_nombre_cliente ON tickets (nombre_cliente);
CREATE INDEX IF NOT EXISTS idx_ticket_detalles_ticket_id ON ticket_detalles (ticket_id);
