import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Card, EmptyState, Field, Modal, PageHeader, SkeletonCards } from '../components/ui';
import { api } from '../services/api';
import { toast } from '../utils/toast';
import { claveDiaLocal, fechaFutura, fechaISO, formatearDia, formatearFecha, rangoPorPeriodo } from '../utils/date';
import {
  DAM_BUSINESS,
  descargarTicketPDF,
  enviarTicketWhatsApp,
  formatearDinero,
  obtenerFechaHora,
} from '../utils/ticket';

const filtrosIniciales = {
  periodo: 'hoy',
  fechaInicio: '',
  fechaFin: '',
  cliente: '',
  folio: '',
};

const opcionesPeriodo = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'rango', label: 'Rango' },
];

function obtenerConceptos(ticket) {
  return ticket.conceptos?.length
    ? ticket.conceptos
    : [
        {
          categoria_nombre: ticket.categoria_servicio || 'Servicio',
          nombre: ticket.servicio_nombre || 'Servicio DAM',
          precio: ticket.precio_servicio || ticket.total,
          cantidad: 1,
          subtotal: ticket.total,
        },
      ];
}

function TicketPreview({ ticket }) {
  const datosFecha = obtenerFechaHora(ticket?.fecha_hora);
  const conceptos = obtenerConceptos(ticket);

  return (
    <article className="ticket-preview">
      <header>
        <strong>{DAM_BUSINESS.nombre}</strong>
        <span>Tel. {DAM_BUSINESS.telefono}</span>
        <span>{DAM_BUSINESS.direccion}</span>
      </header>

      <div className="ticket-preview__line" />

      <dl>
        <div>
          <dt>Folio</dt>
          <dd>#{String(ticket.id).padStart(4, '0')}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{datosFecha.fecha}</dd>
        </div>
        <div>
          <dt>Hora</dt>
          <dd>{datosFecha.hora}</dd>
        </div>
        <div>
          <dt>Atendio</dt>
          <dd>{ticket.usuario_nombre || 'DAM'}</dd>
        </div>
        <div>
          <dt>Cliente</dt>
          <dd>{ticket.cliente_nombre || 'Cliente general'}</dd>
        </div>
      </dl>

      <div className="ticket-preview__line" />

      <div className="ticket-preview__service">
        {conceptos.map((concepto, index) => (
          <div key={`${concepto.nombre}-${index}`} className="ticket-preview__concept">
            <span>
              {index + 1}. {concepto.categoria_nombre || 'Producto'}
            </span>
            <strong>{concepto.nombre}</strong>
            <div>
              <span>
                {concepto.cantidad || 1} x {formatearDinero(concepto.precio)}
              </span>
              <b>{formatearDinero(concepto.subtotal)}</b>
            </div>
          </div>
        ))}
      </div>

      <div className="ticket-preview__total">
        <span>Total</span>
        <strong>{formatearDinero(ticket.total)}</strong>
      </div>

      <footer>{DAM_BUSINESS.mensaje}</footer>
    </article>
  );
}

function TicketCard({ ticket, onVer, onPDF, onWhatsApp }) {
  const conceptos = obtenerConceptos(ticket);
  const principal = conceptos.length > 1 ? `${conceptos.length} conceptos` : conceptos[0]?.nombre || 'Servicio DAM';

  return (
    <article className="ticket-card">
      <div className="ticket-card__main">
        <span className="ticket-folio">#{String(ticket.id).padStart(4, '0')}</span>
        <div>
          <h3>{ticket.cliente_nombre || 'Cliente general'}</h3>
          <p>{principal}</p>
        </div>
      </div>

      <div className="ticket-card__meta">
        <span>{formatearFecha(ticket.fecha_hora)}</span>
        <strong>{formatearDinero(ticket.total)}</strong>
      </div>

      <div className="row-actions">
        <button type="button" className="button button--small" onClick={() => onVer(ticket)}>
          Ver
        </button>
        <button type="button" className="button button--ghost button--small" onClick={() => onPDF(ticket)}>
          PDF
        </button>
        <button type="button" className="button button--ghost button--small" onClick={() => onWhatsApp(ticket)}>
          WhatsApp
        </button>
      </div>
    </article>
  );
}

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [ticketActivo, setTicketActivo] = useState(null);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const parametrosBusqueda = useMemo(() => {
    const fechas = filtros.periodo === 'rango' ? filtros : rangoPorPeriodo(filtros.periodo);
    return {
      fechaInicio: fechas.fechaInicio,
      fechaFin: fechas.fechaFin,
      cliente: filtros.cliente.trim(),
      folio: filtros.folio.trim(),
    };
  }, [filtros]);

  const validarFiltros = useCallback((parametros) => {
    if (fechaFutura(parametros.fechaInicio) || fechaFutura(parametros.fechaFin)) {
      return 'No se pueden consultar ventas de fechas futuras.';
    }
    if (parametros.fechaInicio && parametros.fechaFin && parametros.fechaInicio > parametros.fechaFin) {
      return 'La fecha inicial no puede ser mayor que la fecha final.';
    }
    return '';
  }, []);

  const cargarTickets = useCallback(async (parametros = parametrosBusqueda) => {
    const validacion = validarFiltros(parametros);
    if (validacion) {
      setError(validacion);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMensaje('');
      const data = await api.obtenerTickets(parametros);
      setTickets(data || []);
    } catch (err) {
      const mensajeError = err.message || 'No se pudo cargar el historial.';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  }, [parametrosBusqueda, validarFiltros]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      cargarTickets(parametrosBusqueda);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [cargarTickets, parametrosBusqueda]);

  const totalHistorial = useMemo(
    () => tickets.reduce((suma, ticket) => suma + Number(ticket.total || 0), 0),
    [tickets],
  );

  const grupos = useMemo(() => {
    return tickets.reduce((acumulado, ticket) => {
      const clave = claveDiaLocal(ticket.fecha_hora);
      if (!acumulado[clave]) acumulado[clave] = [];
      acumulado[clave].push(ticket);
      return acumulado;
    }, {});
  }, [tickets]);

  const verTicket = async (ticket) => {
    try {
      setError('');
      const detalle = await api.obtenerTicket(ticket.id);
      setTicketActivo(detalle);
    } catch (err) {
      setError(err.message || 'No se pudo abrir el ticket.');
    }
  };

  const manejarWhatsApp = async (ticket) => {
    try {
      setError('');
      const resultado = await enviarTicketWhatsApp(ticket);
      setMensaje(resultado.mensaje);
      toast.success(resultado.mensaje);
    } catch (err) {
      if (err.name !== 'AbortError') {
        const mensajeError = err.message || 'No se pudo preparar el envio por WhatsApp.';
        setError(mensajeError);
        toast.error(mensajeError);
      }
    }
  };

  const actualizarFiltro = (clave, valor) => {
    setFiltros((actuales) => ({ ...actuales, [clave]: valor }));
  };

  return (
    <>
      <PageHeader
        eyebrow="Historial"
        title="Tickets"
        description="Consulta ventas por fecha, cliente o folio. Por defecto se muestran solo los tickets de hoy."
        actions={<button type="button" className="button button--ghost" onClick={cargarTickets}>Actualizar</button>}
      />

      <div className="metrics-grid">
        <Card className="metric">
          <span>Tickets filtrados</span>
          <strong>{tickets.length}</strong>
        </Card>
        <Card className="metric">
          <span>Total filtrado</span>
          <strong>{formatearDinero(totalHistorial)}</strong>
        </Card>
        <Card className="metric">
          <span>Estado</span>
          <strong>{loading ? 'Cargando' : 'Listo'}</strong>
        </Card>
      </div>

      <Card className="filters-card">
        <div className="segmented segmented--wrap">
          {opcionesPeriodo.map((opcion) => (
            <button
              type="button"
              key={opcion.id}
              className={filtros.periodo === opcion.id ? 'segmented__active' : ''}
              onClick={() => actualizarFiltro('periodo', opcion.id)}
            >
              {opcion.label}
            </button>
          ))}
        </div>

        <div className="filters-grid">
          {filtros.periodo === 'rango' && (
            <>
              <Field label="Fecha inicial">
                <input
                  type="date"
                  max={fechaISO(new Date())}
                  value={filtros.fechaInicio}
                  onChange={(e) => actualizarFiltro('fechaInicio', e.target.value)}
                />
              </Field>
              <Field label="Fecha final">
                <input
                  type="date"
                  max={fechaISO(new Date())}
                  value={filtros.fechaFin}
                  onChange={(e) => actualizarFiltro('fechaFin', e.target.value)}
                />
              </Field>
            </>
          )}

          <Field label="Buscar cliente">
            <input
              type="search"
              placeholder="Nombre del cliente"
              value={filtros.cliente}
              onChange={(e) => actualizarFiltro('cliente', e.target.value)}
            />
          </Field>

          <Field label="Buscar folio">
            <input
              type="search"
              placeholder="0006"
              value={filtros.folio}
              onChange={(e) => actualizarFiltro('folio', e.target.value.replace(/[^\d#]/g, ''))}
            />
          </Field>
        </div>
      </Card>

      <Alert type="error">{error}</Alert>
      <Alert type="success">{mensaje}</Alert>

      <Card className="tickets-history">
        {loading ? (
          <SkeletonCards count={3} />
        ) : tickets.length === 0 ? (
          <EmptyState title="Sin tickets en este filtro" description="Ajusta las fechas, cliente o folio para consultar otros tickets." />
        ) : (
          Object.entries(grupos).map(([dia, ticketsDia]) => (
            <section className="ticket-day-group" key={dia}>
              <div className="ticket-day-group__header">
                <h2>{dia === 'sin-fecha' ? 'Sin fecha' : formatearDia(dia)}</h2>
                <span>{ticketsDia.length} tickets</span>
              </div>
              <div className="ticket-card-list">
                {ticketsDia.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onVer={verTicket}
                    onPDF={descargarTicketPDF}
                    onWhatsApp={manejarWhatsApp}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </Card>

      <Modal
        open={Boolean(ticketActivo)}
        eyebrow="Ticket DAM"
        title="Vista del ticket"
        onClose={() => setTicketActivo(null)}
        actions={
          ticketActivo && (
            <>
              <button type="button" className="button" onClick={() => descargarTicketPDF(ticketActivo)}>
                Descargar PDF
              </button>
              <button type="button" className="button button--ghost" onClick={() => manejarWhatsApp(ticketActivo)}>
                Enviar por WhatsApp
              </button>
            </>
          )
        }
      >
        {ticketActivo && <TicketPreview ticket={ticketActivo} />}
      </Modal>
    </>
  );
}
