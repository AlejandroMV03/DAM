from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def ruta_raiz():
    return {"mensaje": "API DAM funcionando correctamente"}

