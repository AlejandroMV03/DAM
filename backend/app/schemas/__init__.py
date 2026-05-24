from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def limpiar_texto(valor: str) -> str:
    texto = valor.strip()
    if not texto:
        raise ValueError("El campo no puede estar vacio")
    return texto


class CategoriaCrear(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=220)
    activa: bool = True

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, valor: str) -> str:
        return limpiar_texto(valor)

    @field_validator("descripcion")
    @classmethod
    def limpiar_descripcion(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return None
        texto = valor.strip()
        return texto or None


class CategoriaActualizar(CategoriaCrear):
    pass


class CategoriaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: Optional[str] = None
    activa: bool = True


class ServicioCrear(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    categoria_id: int = Field(..., gt=0)
    precio: int = Field(..., gt=0)
    activo: bool = True

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, valor: str) -> str:
        return limpiar_texto(valor)


class ServicioRespuesta(BaseModel):
    id: int
    nombre: str
    categoria_id: Optional[int] = None
    categoria: Optional[str] = None
    categoria_nombre: Optional[str] = None
    precio: int
    activo: bool = True


class ServicioActualizar(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    categoria_id: int = Field(..., gt=0)
    precio: int = Field(..., gt=0)
    activo: bool = True

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, valor: str) -> str:
        return limpiar_texto(valor)


class CategoriaProductoCrear(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=220)
    activa: bool = True

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, valor: str) -> str:
        return limpiar_texto(valor)

    @field_validator("descripcion")
    @classmethod
    def limpiar_descripcion(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return None
        texto = valor.strip()
        return texto or None


class CategoriaProductoActualizar(CategoriaProductoCrear):
    pass


class CategoriaProductoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: Optional[str] = None
    activa: bool = True


class ProductoCrear(BaseModel):
    categoria_producto_id: int = Field(..., gt=0)
    nombre: str = Field(..., min_length=1, max_length=140)
    descripcion: Optional[str] = Field(default=None, max_length=260)
    precio: int = Field(..., gt=0)
    stock: int = Field(default=0, ge=0)
    stock_minimo: int = Field(default=0, ge=0)
    activo: bool = True

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, valor: str) -> str:
        return limpiar_texto(valor)

    @field_validator("descripcion")
    @classmethod
    def limpiar_descripcion(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return None
        texto = valor.strip()
        return texto or None


class ProductoActualizar(ProductoCrear):
    pass


class ProductoRespuesta(BaseModel):
    id: int
    categoria_producto_id: int
    categoria_producto_nombre: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    precio: int
    stock: int
    stock_minimo: int
    stock_bajo: bool = False
    activo: bool = True


class MovimientoInventarioRespuesta(BaseModel):
    id: int
    producto_id: int
    producto_nombre: Optional[str] = None
    tipo_movimiento: str
    cantidad: int
    stock_anterior: int
    stock_nuevo: int
    motivo: Optional[str] = None
    ticket_id: Optional[int] = None
    created_at: Optional[str] = None


class EntradaInventarioCrear(BaseModel):
    producto_id: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)
    motivo: Optional[str] = Field(default=None, max_length=220)

    @field_validator("motivo")
    @classmethod
    def limpiar_motivo(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return None
        texto = valor.strip()
        return texto or None


class AjusteInventarioCrear(BaseModel):
    producto_id: int = Field(..., gt=0)
    stock_nuevo: int = Field(..., ge=0)
    motivo: Optional[str] = Field(default=None, max_length=220)

    @field_validator("motivo")
    @classmethod
    def limpiar_motivo(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return None
        texto = valor.strip()
        return texto or None


class ClienteCrear(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=140)
    telefono: Optional[str] = Field(default=None, max_length=40)
    correo: Optional[str] = Field(default=None, max_length=140)

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, valor: str) -> str:
        return limpiar_texto(valor)

    @field_validator("telefono", "correo")
    @classmethod
    def limpiar_opcionales(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return None
        texto = valor.strip()
        return texto or None


class ClienteRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    telefono: Optional[str] = None
    correo: Optional[str] = None


class ConceptoTicketCrear(BaseModel):
    tipo: str = Field(..., min_length=1, max_length=20)
    categoria_id: Optional[int] = Field(default=None, gt=0)
    categoria_nombre: Optional[str] = Field(default=None, max_length=100)
    servicio_id: Optional[int] = Field(default=None, gt=0)
    producto_id: Optional[int] = Field(default=None, gt=0)
    categoria_producto_id: Optional[int] = Field(default=None, gt=0)
    categoria_producto_nombre: Optional[str] = Field(default=None, max_length=100)
    nombre: str = Field(..., min_length=1, max_length=140)
    precio: int = Field(..., gt=0)
    cantidad: int = Field(default=1, gt=0)
    subtotal: Optional[int] = Field(default=None, gt=0)

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, valor: str) -> str:
        tipo = valor.strip().lower()
        if tipo not in {"servicio", "producto"}:
            raise ValueError("Tipo de concepto no valido")
        return tipo

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, valor: str) -> str:
        return limpiar_texto(valor)

    @field_validator("categoria_nombre", "categoria_producto_nombre")
    @classmethod
    def limpiar_categoria(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return None
        texto = valor.strip()
        return texto or None

    @model_validator(mode="after")
    def validar_concepto(self):
        if self.tipo == "servicio" and not self.servicio_id:
            raise ValueError("El concepto de tipo servicio requiere servicio_id")
        if self.tipo == "producto" and not self.producto_id:
            raise ValueError("El concepto de tipo producto requiere producto_id")
        self.subtotal = self.subtotal or self.precio * self.cantidad
        return self


class TicketCrear(BaseModel):
    usuario_id: int = Field(..., gt=0)
    metodo_pago: str = Field(..., min_length=1, max_length=40)
    cliente_id: Optional[int] = Field(default=None, gt=0)
    cliente: Optional[ClienteCrear] = None
    conceptos: list[ConceptoTicketCrear] = Field(default_factory=list)
    total: Optional[int] = Field(default=None, gt=0)
    servicio_id: Optional[int] = Field(default=None, gt=0)

    @field_validator("metodo_pago")
    @classmethod
    def validar_metodo_pago(cls, valor: str) -> str:
        metodo = valor.strip().lower()
        metodos_validos = {"efectivo", "transferencia", "tarjeta"}
        if metodo not in metodos_validos:
            raise ValueError("Metodo de pago no valido")
        return metodo


class ConceptoTicketRespuesta(BaseModel):
    id: Optional[int] = None
    tipo: str
    categoria_id: Optional[int] = None
    categoria_nombre: Optional[str] = None
    servicio_id: Optional[int] = None
    producto_id: Optional[int] = None
    categoria_producto_id: Optional[int] = None
    categoria_producto_nombre: Optional[str] = None
    nombre: str
    precio: int
    cantidad: int
    subtotal: int


class TicketRespuesta(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    cliente_id: Optional[int] = None
    cliente_nombre: Optional[str] = None
    cliente_telefono: Optional[str] = None
    servicio_id: Optional[int] = None
    servicio_nombre: Optional[str] = None
    categoria_servicio: Optional[str] = None
    precio_servicio: Optional[int] = None
    conceptos: list[ConceptoTicketRespuesta] = Field(default_factory=list)
    subtotal: int = 0
    fecha_hora: Optional[str] = None
    total: int
    metodo_pago: str
    estado: Optional[str] = "pagado"
