export function createCatalogoApi({ request }) {
  const catalogoApi = {
    obtenerServicios: ({ categoriaId, incluirInactivos = false } = {}) => {
      const params = new URLSearchParams();
      if (categoriaId) params.set('categoriaId', categoriaId);
      if (incluirInactivos) params.set('incluir_inactivos', 'true');
      const query = params.toString();
      return request(`/api/servicios${query ? `?${query}` : ''}`);
    },

    obtenerCategorias: (incluirInactivas = false) =>
      request(`/api/categorias${incluirInactivas ? '?incluir_inactivas=true' : ''}`),

    crearCategoria: (categoria) =>
      request('/api/categorias', {
        method: 'POST',
        body: JSON.stringify(categoria),
      }),

    actualizarCategoria: (id, categoria) =>
      request(`/api/categorias/${id}`, {
        method: 'PUT',
        body: JSON.stringify(categoria),
      }),

    eliminarCategoria: (id) =>
      request(`/api/categorias/${id}`, {
        method: 'DELETE',
      }),

    crearServicio: (servicio) =>
      request('/api/servicios', {
        method: 'POST',
        body: JSON.stringify(servicio),
      }),

    actualizarServicio: (id, servicio) =>
      request(`/api/servicios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(servicio),
      }),

    eliminarServicio: (id) =>
      request(`/api/servicios/${id}`, {
        method: 'DELETE',
      }),
  };

  return {
    ...catalogoApi,
    obtenerServiciosPorCategoria: (categoriaId) => catalogoApi.obtenerServicios({ categoriaId }),
  };
}

