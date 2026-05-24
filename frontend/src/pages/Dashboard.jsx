import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { formatearDinero } from '../utils/ticket';
import { fechaISO } from '../utils/date';
import { Button, Card, SkeletonCards, StatCard } from '../components/ui';
import { toast } from '../utils/toast';

const accesos = [
  { id: 'ingresos', titulo: 'Caja/Cobro', descripcion: 'Generar nuevo ticket', icono: '$' },
  { id: 'tickets', titulo: 'Historial Tickets', descripcion: 'Consultar ventas', icono: '#' },
  { id: 'servicios', titulo: 'Catalogo Servicios', descripcion: 'Precios y categorias', icono: '+' },
  { id: 'productos', titulo: 'Productos', descripcion: 'Inventario y stock', icono: 'P' },
  { id: 'estadisticas', titulo: 'Estadisticas', descripcion: 'Ver rendimiento', icono: '%' },
];

export default function Dashboard({ usuario, onNavigate }) {
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    const hoy = fechaISO(new Date());

    api.obtenerEstadisticas({ periodo: 'dia', fechaInicio: hoy })
      .then((data) => {
        if (activo) setEstadisticas(data);
      })
      .catch((err) => {
        if (activo) toast.error(err.message || 'No se pudo cargar el dashboard.');
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const servicioTop = useMemo(
    () => estadisticas?.servicioMasVendido?.nombre || estadisticas?.serviciosMasVendidos?.[0]?.nombre || 'Sin ventas',
    [estadisticas],
  );

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">Panel DAM</span>
          <h1>Hola, {usuario.nombre}</h1>
          <p>Resumen de hoy y accesos rápidos para mantener la operación ligera y ordenada.</p>
        </div>
        <Button onClick={() => onNavigate('ingresos')}>Nuevo ticket</Button>
      </section>

      {loading ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="metrics-grid dashboard-metrics">
          <StatCard label="Ingresos de hoy" value={formatearDinero(estadisticas?.total || 0)} />
          <StatCard label="Tickets hoy" value={estadisticas?.tickets || 0} />
          <StatCard label="Servicio mas vendido" value={servicioTop} />
          <StatCard label="Promedio por ticket" value={formatearDinero(estadisticas?.promedio || 0)} />
        </div>
      )}

      <div className="quick-actions-grid">
        {accesos.map((acceso) => (
          <Card className="quick-action-card" key={acceso.id}>
            <span className="quick-action-card__icon">{acceso.icono}</span>
            <div>
              <h2>{acceso.titulo}</h2>
              <p>{acceso.descripcion}</p>
            </div>
            <Button variant="ghost" size="small" onClick={() => onNavigate(acceso.id)}>
              Abrir
            </Button>
          </Card>
        ))}
      </div>
    </>
  );
}
