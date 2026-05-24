export const DAM_TIME_ZONE = 'America/Merida';

function partesFecha(fecha = new Date(), timeZone = DAM_TIME_ZONE) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);

  return Object.fromEntries(partes.filter((parte) => parte.type !== 'literal').map((parte) => [parte.type, parte.value]));
}

function fechaUTCDesdeISO(valor) {
  const [year, month, day] = valor.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function fechaISODesdeUTC(fecha) {
  return fecha.toISOString().slice(0, 10);
}

export function fechaISO(fecha = new Date()) {
  const partes = partesFecha(fecha);
  return `${partes.year}-${partes.month}-${partes.day}`;
}

export function rangoPorPeriodo(periodo) {
  const hoy = fechaUTCDesdeISO(fechaISO(new Date()));
  const inicio = new Date(hoy);
  const fin = new Date(hoy);

  if (periodo === 'ayer') {
    inicio.setUTCDate(hoy.getUTCDate() - 1);
    fin.setUTCDate(hoy.getUTCDate() - 1);
  }

  if (periodo === 'semana') {
    const dia = hoy.getUTCDay() || 7;
    inicio.setUTCDate(hoy.getUTCDate() - dia + 1);
  }

  if (periodo === 'mes') {
    inicio.setUTCDate(1);
  }

  return { fechaInicio: fechaISODesdeUTC(inicio), fechaFin: fechaISODesdeUTC(fin) };
}

export function fechaFutura(valor) {
  return Boolean(valor && valor > fechaISO(new Date()));
}

export function claveDiaLocal(valor) {
  if (!valor) return 'sin-fecha';
  return fechaISO(new Date(valor));
}

export function formatearFecha(valor) {
  if (!valor) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: DAM_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(valor));
}

export function formatearDia(valor) {
  if (!valor) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fechaUTCDesdeISO(valor));
}
