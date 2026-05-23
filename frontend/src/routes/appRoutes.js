import Dashboard from '../pages/Dashboard.jsx';
import Estadisticas from '../pages/Estadisticas.jsx';
import Ingresos from '../pages/Ingresos.jsx';
import RegistroServicio from '../pages/RegistroServicios.jsx';
import Tickets from '../pages/Tickets.jsx';

export const APP_ROUTES = [
  {
    id: 'dashboard',
    nombre: 'Inicio',
    icono: 'I',
    component: Dashboard,
  },
  {
    id: 'ingresos',
    nombre: 'Caja / Cobro',
    icono: '$',
    component: Ingresos,
  },
  {
    id: 'tickets',
    nombre: 'Tickets',
    icono: '#',
    component: Tickets,
  },
  {
    id: 'servicios',
    nombre: 'Catalogo',
    icono: '+',
    component: RegistroServicio,
  },
  {
    id: 'estadisticas',
    nombre: 'Estadisticas',
    icono: '%',
    component: Estadisticas,
  },
];

export function obtenerRutaPorId(id) {
  return APP_ROUTES.find((ruta) => ruta.id === id) || APP_ROUTES[0];
}

