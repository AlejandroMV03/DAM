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

    @field_validator("categoria_nombre")
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

