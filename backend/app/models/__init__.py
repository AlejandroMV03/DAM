from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    pin_acceso = Column(String(4), nullable=True)
    password_hash = Column(String, nullable=True)


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    telefono = Column(String, nullable=True)
    correo = Column(String, nullable=True)


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False, unique=True)
    descripcion = Column(String, nullable=True)
    activa = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Servicio(Base):
    __tablename__ = "servicios"

    id = Column(Integer, primary_key=True, index=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    nombre = Column(String, nullable=False)
    categoria = Column(String, nullable=True)
    precio = Column(Integer, nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    nombre_cliente = Column(String, nullable=True)
    cajero_nombre = Column(String, nullable=True)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now())
    total = Column(Integer, nullable=False)
    metodo_pago = Column(String, nullable=False)
    estado = Column(String, nullable=False, default="pagado")


class TicketDetalle(Base):
    __tablename__ = "ticket_detalles"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    tipo = Column(String, nullable=False, default="servicio")
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=True)
    nombre = Column(String, nullable=True)
    nombre_servicio = Column(String, nullable=True)
    categoria_servicio = Column(String, nullable=True)
    precio_cobrado = Column(Integer, nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    subtotal = Column(Integer, nullable=False, default=0)

