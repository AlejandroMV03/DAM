export function createEstadisticasApi({ buildQuery, request }) {
  return {
    obtenerEstadisticas: (filtros = {}) => request(`/api/estadisticas${buildQuery(filtros)}`),
  };
}

