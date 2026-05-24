import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Card, EmptyState, Field, PageHeader, SkeletonCards } from '../components/ui';
import { api } from '../services/api';
import { fechaISO } from '../utils/date';
import { formatearDinero } from '../utils/ticket';
import { toast } from '../utils/toast';

const periodos = [
  { id: 'dia', label: 'Dia' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'anio', label: 'Anio' },
  { id: 'rango', label: 'Rango' },
];

function LineChart({ labels, ventas }) {
  const width = 720;
  const height = 300;
  const padding = 34;
  const maximo = Math.max(...ventas.map((valor) => Number(valor || 0)), 1);
  const puntos = ventas.map((valor, index) => {
    const x = ventas.length === 1 ? width / 2 : padding + (index * (width - padding * 2)) / (ventas.length - 1);
    const y = height - padding - (Number(valor || 0) / maximo) * (height - padding * 2);
    return { x, y, valor: Number(valor || 0), label: labels[index] };
  });
  const linea = puntos.map((punto, index) => `${index === 0 ? 'M' : 'L'} ${punto.x} ${punto.y}`).join(' ');
  const area = `${linea} L ${puntos[puntos.length - 1]?.x || padding} ${height - padding} L ${puntos[0]?.x || padding} ${height - padding} Z`;
  const etiquetas = puntos.filter((_, index) => index === 0 || index === puntos.length - 1 || index % Math.ceil(puntos.length / 5) === 0);

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafica de ingresos">
        <defs>
          <linearGradient id="lineAreaDam" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(169, 137, 220, 0.28)" />
            <stop offset="100%" stopColor="rgba(233, 168, 207, 0.03)" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((lineaGuia) => {
          const y = padding + (lineaGuia * (height - padding * 2)) / 3;
          return <line key={lineaGuia} x1={padding} x2={width - padding} y1={y} y2={y} className="line-chart__grid" />;
        })}
        <path d={area} className="line-chart__area" />
        <path d={linea} className="line-chart__line" />
        {puntos.map((punto) => (
          <circle key={`${punto.label}-${punto.x}`} cx={punto.x} cy={punto.y} r="4" className="line-chart__dot">
            <title>{`${punto.label}: ${formatearDinero(punto.valor)}`}</title>
          </circle>
        ))}
        {etiquetas.map((punto, index) => (
          <text key={`${punto.label}-${index}`} x={punto.x} y={height - 8} textAnchor="middle" className="line-chart__label">
            {punto.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Ranking({ titulo, items, tipo }) {
  if (!items?.length) {
    return <EmptyState title={`Sin ${titulo.toLowerCase()}`} description="Los conceptos vendidos apareceran aqui." />;
  }

  return (
    <div className="ranking-list ranking-list--detailed">
      {items.map((item, index) => (
        <div key={`${tipo}-${item.nombre || item.servicio || item.producto}-${index}`}>
          <span className="ranking-index">{index + 1}</span>
          <span>
            <strong>{item.nombre || item.servicio || item.producto}</strong>
            <small>{item.categoria || tipo}</small>
          </span>
          <span className="ranking-total">
            <b>{item.cantidad}</b>
            <small>{formatearDinero(item.total)}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function StockBajo({ items }) {
  if (!items?.length) {
    return <EmptyState title="Sin stock bajo" description="Los productos por debajo del minimo apareceran aqui." />;
  }

  return (
    <div className="ranking-list ranking-list--detailed">
      {items.map((item, index) => (
        <div key={`stock-${item.id || item.nombre}-${index}`}>
          <span className="ranking-index">{index + 1}</span>
          <span>
            <strong>{item.nombre}</strong>
            <small>Minimo {item.stock_minimo}</small>
          </span>
          <span className="ranking-total">
            <b>{item.stock}</b>
            <small>stock</small>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Estadisticas() {
  const hoy = fechaISO(new Date());
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodo, setPeriodo] = useState('dia');
  const [fechaBase, setFechaBase] = useState(hoy);
  const [mesBase, setMesBase] = useState(hoy.slice(0, 7));
  const [anioBase, setAnioBase] = useState(hoy.slice(0, 4));
  const [rango, setRango] = useState({ fechaInicio: hoy, fechaFin: hoy });

  const filtros = useMemo(() => {
    if (periodo === 'dia') return { periodo, fechaInicio: fechaBase };
    if (periodo === 'semana') return { periodo, fechaInicio: fechaBase };
    if (periodo === 'mes') return { periodo, fechaInicio: `${mesBase}-01` };
    if (periodo === 'anio') return { periodo, fechaInicio: `${anioBase}-01-01` };
    return { periodo, fechaInicio: rango.fechaInicio, fechaFin: rango.fechaFin };
  }, [anioBase, fechaBase, mesBase, periodo, rango]);

  const validarFiltros = useCallback((parametros) => {
    const hoyIso = fechaISO(new Date());
    const fechas = [parametros.fechaInicio, parametros.fechaFin].filter(Boolean);
    if (fechas.some((fecha) => fecha > hoyIso)) return 'No se pueden consultar ventas de fechas futuras.';
    if (parametros.fechaInicio && parametros.fechaFin && parametros.fechaInicio > parametros.fechaFin) {
      return 'La fecha inicial no puede ser mayor que la fecha final.';
    }
    return '';
  }, []);

  const cargarEstadisticas = useCallback(async (parametros = filtros) => {
    const validacion = validarFiltros(parametros);
    if (validacion) {
      setError(validacion);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await api.obtenerEstadisticas(parametros);
      setEstadisticas(data);
    } catch (err) {
      const mensajeError = err.message || 'No se pudieron cargar las estadisticas.';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  }, [filtros, validarFiltros]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      cargarEstadisticas(filtros);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [cargarEstadisticas, filtros]);

  return (
    <>
      <PageHeader
        eyebrow="Estadisticas"
        title="Resumen DAM"
        description="Analiza ingresos por periodo, ticket promedio y conceptos mas vendidos."
        actions={<button type="button" className="button button--ghost" onClick={cargarEstadisticas}>Actualizar</button>}
      />

      <Card className="filters-card">
        <div className="segmented segmented--wrap">
          {periodos.map((opcion) => (
            <button
              type="button"
              key={opcion.id}
              className={periodo === opcion.id ? 'segmented__active' : ''}
              onClick={() => setPeriodo(opcion.id)}
            >
              {opcion.label}
            </button>
          ))}
        </div>

        <div className="filters-grid">
          {periodo === 'dia' && (
            <Field label="Fecha">
              <input type="date" max={hoy} value={fechaBase} onChange={(e) => setFechaBase(e.target.value)} />
            </Field>
          )}

          {periodo === 'semana' && (
            <Field label="Inicio de semana">
              <input type="date" max={hoy} value={fechaBase} onChange={(e) => setFechaBase(e.target.value)} />
            </Field>
          )}

          {periodo === 'mes' && (
            <Field label="Mes">
              <input type="month" max={hoy.slice(0, 7)} value={mesBase} onChange={(e) => setMesBase(e.target.value)} />
            </Field>
          )}

          {periodo === 'anio' && (
            <Field label="Anio">
              <input
                type="number"
                min="2020"
                max={hoy.slice(0, 4)}
                value={anioBase}
                onChange={(e) => setAnioBase(e.target.value)}
              />
            </Field>
          )}

          {periodo === 'rango' && (
            <>
              <Field label="Fecha inicial">
                <input
                  type="date"
                  max={hoy}
                  value={rango.fechaInicio}
                  onChange={(e) => setRango((actual) => ({ ...actual, fechaInicio: e.target.value }))}
                />
              </Field>
              <Field label="Fecha final">
                <input
                  type="date"
                  max={hoy}
                  value={rango.fechaFin}
                  onChange={(e) => setRango((actual) => ({ ...actual, fechaFin: e.target.value }))}
                />
              </Field>
            </>
          )}
        </div>
      </Card>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <SkeletonCards count={6} />
      ) : estadisticas ? (
        <>
          <div className="metrics-grid metrics-grid--six">
            <Card className="metric">
              <span>Ingresos totales</span>
              <strong>{formatearDinero(estadisticas.total)}</strong>
            </Card>
            <Card className="metric">
              <span>Venta servicios</span>
              <strong>{formatearDinero(estadisticas.totalServicios || 0)}</strong>
            </Card>
            <Card className="metric">
              <span>Venta productos</span>
              <strong>{formatearDinero(estadisticas.totalProductos || 0)}</strong>
            </Card>
            <Card className="metric">
              <span>Tickets generados</span>
              <strong>{estadisticas.tickets}</strong>
            </Card>
            <Card className="metric">
              <span>Promedio por ticket</span>
              <strong>{formatearDinero(estadisticas.promedio)}</strong>
            </Card>
            <Card className="metric">
              <span>Stock bajo</span>
              <strong>{estadisticas.stockBajo?.length || 0}</strong>
            </Card>
          </div>

          <div className="stats-layout stats-layout--wide">
            <Card className="chart-card chart-card--main">
              <div className="chart-card__header">
                <div>
                  <span className="eyebrow">Ingresos</span>
                  <h2>Comportamiento de ventas</h2>
                </div>
                <strong className="chart-total">{formatearDinero(estadisticas.total)}</strong>
              </div>
              {estadisticas.labels?.length ? (
                <LineChart labels={estadisticas.labels} ventas={estadisticas.ventas || []} />
              ) : (
                <EmptyState title="Sin ventas registradas" description="Cuando generes tickets se dibujara esta grafica." />
              )}
            </Card>

            <Card className="chart-card">
              <div className="chart-card__header">
                <div>
                  <span className="eyebrow">Servicios</span>
                  <h2>Mas vendidos</h2>
                </div>
              </div>
              <Ranking titulo="Servicios vendidos" items={estadisticas.serviciosMasVendidos || []} tipo="Servicio" />
            </Card>

            <Card className="chart-card">
              <div className="chart-card__header">
                <div>
                  <span className="eyebrow">Productos</span>
                  <h2>Mas vendidos</h2>
                </div>
              </div>
              <Ranking titulo="Productos vendidos" items={estadisticas.productosMasVendidos || []} tipo="Producto" />
            </Card>

            <Card className="chart-card">
              <div className="chart-card__header">
                <div>
                  <span className="eyebrow">Categorias</span>
                  <h2>Productos por categoria</h2>
                </div>
              </div>
              <Ranking titulo="Categorias de productos" items={estadisticas.categoriasProductosMasVendidas || []} tipo="Categoria" />
            </Card>

            <Card className="chart-card">
              <div className="chart-card__header">
                <div>
                  <span className="eyebrow">Inventario</span>
                  <h2>Stock bajo</h2>
                </div>
              </div>
              <StockBajo items={estadisticas.stockBajo || []} />
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <EmptyState title="Sin datos" description="No se recibieron estadisticas del backend." />
        </Card>
      )}
    </>
  );
}
