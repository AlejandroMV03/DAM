export function createAuthApi({ request, setToken }) {
  return {
    login: async (credenciales) => {
      const payload = {
        nombre: typeof credenciales?.nombre === 'string' ? credenciales.nombre : '',
        pin_acceso: typeof credenciales?.pin_acceso === 'string' ? credenciales.pin_acceso : '',
      };

      const data = await request('/api/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setToken(data.access_token);
      return data;
    },

    obtenerSesion: () => request('/api/me'),
  };
}

