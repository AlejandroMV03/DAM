export function fechaISO(fecha = new Date()) {
  const copia = new Date(fecha);
  copia.setMinutes(copia.getMinutes() - copia.getTimezoneOffset());
  return copia.toISOString().slice(0, 10);
}

export function rangoPorPeriodo(periodo) {
  const hoy = new Date();
  const inicio = new Date(hoy);
  const fin = new Date(hoy);

  if (periodo === 'ayer') {
    inicio.setDate(hoy.getDate() - 1);
    fin.setDate(hoy.getDate() - 1);
  }

  if (periodo === 'semana') {
    const dia = hoy.getDay() || 7;
    inicio.setDate(hoy.getDate() - dia + 1);
  }

  if (periodo === 'mes') {
    inicio.setDate(1);
  }

  return { fechaInicio: fechaISO(inicio), fechaFin: fechaISO(fin) };
}

export function fechaFutura(valor) {
  return Boolean(valor && valor > fechaISO(new Date()));
}

export function formatearFecha(valor) {
  if (!valor) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(valor));
}

export function formatearDia(valor) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${valor}T12:00:00`));
}

