# Contexto Proyecto DAM

Sistema administrativo para estética y barbería DAM.

## Frontend
- React + Vite
- api.js centraliza peticiones
- diseño minimalista
- responsive
- colores:
  - blanco
  - rosita suave
  - morado suave

## Backend
- FastAPI
- models.py
- schemas.py
- main.py

## Base de datos

### categorias
- id
- nombre
- descripcion
- activa

### servicios
- categoria_id
- nombre
- precio
- activo

### tickets
- cliente
- cajero
- total
- fecha

### ticket_detalles
- tipo
- categoria_id
- servicio_id
- nombre
- precio_cobrado
- cantidad
- subtotal

## Funcionalidades implementadas
- Tickets PDF
- Compartir WhatsApp
- Categorías dinámicas
- Servicios dinámicos
- Cobros adicionales
- Estadísticas
- Historial tickets

## Pendientes
- Login seguro JWT
- Mejorar gráficas
- Mejorar filtros tickets
- Optimizar WhatsApp + PDF

## api.js
Usa:
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';