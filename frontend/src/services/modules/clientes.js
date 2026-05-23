export function createClientesApi({ request }) {
  return {
    buscarClientes: (nombre) => request(`/api/clientes/buscar?nombre=${encodeURIComponent(nombre)}`),
  };
}

