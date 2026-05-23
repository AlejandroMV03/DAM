import { createAuthApi } from './modules/auth';
import { createCatalogoApi } from './modules/catalogo';
import { createClientesApi } from './modules/clientes';
import { createEstadisticasApi } from './modules/estadisticas';
import { createTicketsApi } from './modules/tickets';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'dam_auth_token';
let onUnauthorized = null;

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const message = data?.detail || data?.mensaje || 'No se pudo completar la solicitud';
    if (response.status === 401) {
      clearToken();
      if (onUnauthorized) onUnauthorized(message);
    }
    throw new Error(message);
  }

  return data;
}

export const authApi = createAuthApi({ request, setToken });
export const catalogoApi = createCatalogoApi({ request });
export const clientesApi = createClientesApi({ request });
export const ticketsApi = createTicketsApi({ buildQuery, request });
export const estadisticasApi = createEstadisticasApi({ buildQuery, request });

export const api = {
  setUnauthorizedHandler: (handler) => {
    onUnauthorized = handler;
  },

  guardarToken: setToken,
  limpiarToken: clearToken,
  obtenerToken: getToken,

  ...authApi,
  ...catalogoApi,
  ...clientesApi,
  ...ticketsApi,
  ...estadisticasApi,
};
