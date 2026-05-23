-- Indices seguros para consultas frecuentes sin modificar ni borrar datos historicos.

CREATE INDEX IF NOT EXISTS idx_categorias_activa ON categorias (activa);
CREATE INDEX IF NOT EXISTS idx_servicios_categoria_id ON servicios (categoria_id);
CREATE INDEX IF NOT EXISTS idx_servicios_activo ON servicios (activo);
CREATE INDEX IF NOT EXISTS idx_servicios_categoria_activo ON servicios (categoria_id, activo);
CREATE INDEX IF NOT EXISTS idx_tickets_cliente_id ON tickets (cliente_id);
CREATE INDEX IF NOT EXISTS idx_ticket_detalles_servicio_id ON ticket_detalles (servicio_id);
CREATE INDEX IF NOT EXISTS idx_ticket_detalles_categoria_id ON ticket_detalles (categoria_id);

