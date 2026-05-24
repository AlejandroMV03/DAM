export function createInventarioApi({ buildQuery, request }) {
  return {
    obtenerCategoriasProductos: (incluirInactivas = false) =>
      request(`/api/categorias-productos${incluirInactivas ? '?incluir_inactivas=true' : ''}`),

    crearCategoriaProducto: (categoria) =>
      request('/api/categorias-productos', {
        method: 'POST',
        body: JSON.stringify(categoria),
      }),

    actualizarCategoriaProducto: (id, categoria) =>
      request(`/api/categorias-productos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(categoria),
      }),

    eliminarCategoriaProducto: (id) =>
      request(`/api/categorias-productos/${id}`, {
        method: 'DELETE',
      }),

    obtenerProductos: (filtros = {}) => request(`/api/productos${buildQuery(filtros)}`),

    buscarProductos: (filtros = {}) => request(`/api/productos/buscar${buildQuery(filtros)}`),

    crearProducto: (producto) =>
      request('/api/productos', {
        method: 'POST',
        body: JSON.stringify(producto),
      }),

    actualizarProducto: (id, producto) =>
      request(`/api/productos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(producto),
      }),

    eliminarProducto: (id) =>
      request(`/api/productos/${id}`, {
        method: 'DELETE',
      }),

    obtenerMovimientosInventario: (filtros = {}) => request(`/api/inventario/movimientos${buildQuery(filtros)}`),

    registrarEntradaInventario: (entrada) =>
      request('/api/inventario/entrada', {
        method: 'POST',
        body: JSON.stringify(entrada),
      }),

    registrarAjusteInventario: (ajuste) =>
      request('/api/inventario/ajuste', {
        method: 'POST',
        body: JSON.stringify(ajuste),
      }),
  };
}
