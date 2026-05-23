export function createTicketsApi({ buildQuery, request }) {
  return {
    crearTicket: (ticket) =>
      request('/api/tickets', {
        method: 'POST',
        body: JSON.stringify(ticket),
      }),

    obtenerTickets: (filtros = {}) => request(`/api/tickets${buildQuery(filtros)}`),

    obtenerTicket: (id) => request(`/api/tickets/${id}`),
  };
}

