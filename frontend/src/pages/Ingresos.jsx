import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Field, Modal, PageHeader, Spinner } from '../components/ui';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { api } from '../services/api';
import { formatearDinero } from '../utils/ticket';
import { toast } from '../utils/toast';

function soloEnteros(valor) {
  return valor.replace(/\D/g, '');
}

function cantidadValida(valor) {
  const cantidad = Number(valor);
  return Number.isInteger(cantidad) && cantidad > 0 ? cantidad : 1;
}

const adicionalInicial = {
  tipo: 'servicio',
  categoria_id: '',
  servicio_id: '',
  nombre: '',
  precio: '',
  cantidad: '1',
};

function crearConceptoServicio(servicio, cantidad = 1) {
  const qty = cantidadValida(cantidad);
  const precio = Math.trunc(Number(servicio.precio));

  return {
    tipo: 'servicio',
    categoria_id: servicio.categoria_id,
    categoria_nombre: servicio.categoria_nombre || servicio.categoria,
    servicio_id: servicio.id,
    nombre: servicio.nombre,
    precio,
    cantidad: qty,
    subtotal: precio * qty,
  };
}

export default function Ingresos({ usuario }) {
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [sugerenciasClientes, setSugerenciasClientes] = useState([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [categoriaPrincipal, setCategoriaPrincipal] = useState('');
  const [servicioPrincipal, setServicioPrincipal] = useState('');
  const [adicional, setAdicional] = useState(adicionalInicial);
  const [modalAdicionalAbierto, setModalAdicionalAbierto] = useState(false);
  const [conceptosAdicionales, setConceptosAdicionales] = useState([]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [loading, setLoading] = useState(false);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const nombreClienteDebounced = useDebouncedValue(nombreCliente.trim(), 280);

  useEffect(() => {
    let activo = true;

    Promise.all([api.obtenerCategorias(), api.obtenerServicios()])
      .then(([categoriasData, serviciosData]) => {
        if (!activo) return;
        setCategorias(categoriasData || []);
        setServicios(serviciosData || []);
      })
      .catch((err) => {
        if (activo) {
          const mensajeError = err.message || 'No se pudo cargar categorias y servicios.';
          setError(mensajeError);
          toast.error(mensajeError);
        }
      })
      .finally(() => {
        if (activo) setCargandoCatalogo(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (nombreClienteDebounced.length < 2) return;
    if (clienteSeleccionado?.nombre === nombreClienteDebounced) return;

    let activo = true;
    const timer = window.setTimeout(() => {
      setBuscandoClientes(true);
      api.buscarClientes(nombreClienteDebounced)
        .then((data) => {
          if (activo) setSugerenciasClientes(data || []);
        })
        .catch(() => {
          if (activo) setSugerenciasClientes([]);
        })
        .finally(() => {
          if (activo) setBuscandoClientes(false);
        });
    }, 0);

    return () => {
      activo = false;
      window.clearTimeout(timer);
    };
  }, [clienteSeleccionado, nombreClienteDebounced]);

  const serviciosPrincipales = useMemo(
    () => servicios.filter((servicio) => String(servicio.categoria_id) === String(categoriaPrincipal)),
    [categoriaPrincipal, servicios],
  );

  const serviciosAdicionales = useMemo(
    () => servicios.filter((servicio) => String(servicio.categoria_id) === String(adicional.categoria_id)),
    [adicional.categoria_id, servicios],
  );

  const servicioPrincipalActual = useMemo(
    () => servicios.find((servicio) => String(servicio.id) === String(servicioPrincipal)),
    [servicioPrincipal, servicios],
  );

  const conceptoPrincipal = useMemo(
    () => (servicioPrincipalActual ? crearConceptoServicio(servicioPrincipalActual) : null),
    [servicioPrincipalActual],
  );

  const conceptos = useMemo(
    () => (conceptoPrincipal ? [conceptoPrincipal, ...conceptosAdicionales] : conceptosAdicionales),
    [conceptoPrincipal, conceptosAdicionales],
  );

  const total = useMemo(
    () => conceptos.reduce((suma, concepto) => suma + Number(concepto.subtotal || 0), 0),
    [conceptos],
  );

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setNombreCliente(cliente.nombre);
    setTelefonoCliente(cliente.telefono || '');
    setSugerenciasClientes([]);
  };

  const cambiarNombreCliente = (valor) => {
    setNombreCliente(valor);
    if (valor.trim().length < 2) {
      setSugerenciasClientes([]);
      setBuscandoClientes(false);
    }
    if (clienteSeleccionado && clienteSeleccionado.nombre !== valor.trim()) {
      setClienteSeleccionado(null);
    }
  };

  const cambiarCategoriaPrincipal = (valor) => {
    setCategoriaPrincipal(valor);
    setServicioPrincipal('');
  };

  const cambiarServicioAdicional = (servicioId) => {
    const servicio = servicios.find((item) => String(item.id) === String(servicioId));
    setAdicional((actual) => ({
      ...actual,
      servicio_id: servicioId,
      nombre: servicio?.nombre || '',
      precio: servicio ? String(Math.trunc(Number(servicio.precio))) : '',
    }));
  };

  const agregarAdicional = () => {
    setError('');
    const cantidad = cantidadValida(adicional.cantidad);
    const precio = Number(adicional.precio);

    if (!Number.isInteger(precio) || precio <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
      setError('El concepto adicional requiere precio y cantidad enteros mayores a cero.');
      return;
    }

    if (adicional.tipo === 'servicio') {
      const servicio = servicios.find((item) => String(item.id) === String(adicional.servicio_id));
      if (!servicio) {
        setError('Selecciona un servicio adicional valido.');
        return;
      }
      setConceptosAdicionales((actuales) => [...actuales, crearConceptoServicio(servicio, cantidad)]);
    } else {
      if (!adicional.nombre.trim()) {
        setError('Escribe el nombre del producto.');
        return;
      }
      setConceptosAdicionales((actuales) => [
        ...actuales,
        {
          tipo: 'producto',
          categoria_id: null,
          categoria_nombre: 'Producto',
          servicio_id: null,
          nombre: adicional.nombre.trim(),
          precio,
          cantidad,
          subtotal: precio * cantidad,
        },
      ]);
    }

    setAdicional(adicionalInicial);
    setModalAdicionalAbierto(false);
  };

  const eliminarConceptoAdicional = (index) => {
    setConceptosAdicionales((actuales) => actuales.filter((_, itemIndex) => itemIndex !== index));
  };

  const manejarCobro = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!nombreCliente.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }

    if (!conceptos.length || total <= 0) {
      setError('Agrega al menos un servicio o producto al ticket.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        usuario_id: usuario.id,
        conceptos,
        total,
        metodo_pago: metodoPago,
      };

      if (clienteSeleccionado?.id) {
        payload.cliente_id = clienteSeleccionado.id;
      } else {
        payload.cliente = {
          nombre: nombreCliente.trim(),
          telefono: telefonoCliente.trim() || null,
        };
      }

      const respuesta = await api.crearTicket(payload);

      setMensaje(`Ticket #${respuesta.ticket_id} registrado correctamente.`);
      toast.success(`Ticket #${respuesta.ticket_id} generado correctamente.`);
      setNombreCliente('');
      setTelefonoCliente('');
      setClienteSeleccionado(null);
      setSugerenciasClientes([]);
      setCategoriaPrincipal('');
      setServicioPrincipal('');
      setAdicional(adicionalInicial);
      setModalAdicionalAbierto(false);
      setConceptosAdicionales([]);
      setMetodoPago('efectivo');
    } catch (err) {
      const mensajeError = err.message || 'No se pudo procesar el cobro.';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Caja / Cobro"
        title="Generar ticket"
        description="Selecciona categoria y servicio, agrega cobros adicionales y genera un ticket con detalle completo."
      />

      <Card className="ticket-form">
        <div className="cashier-strip">
          <span>Cajero</span>
          <strong>{usuario.nombre}</strong>
        </div>

        {cargandoCatalogo && <Spinner label="Cargando categorias y servicios..." />}

        <Alert type="error">{error}</Alert>
        <Alert type="success">{mensaje}</Alert>

        <form onSubmit={manejarCobro} className="form-grid">
          <section className="form-section">
            <h2>Cliente</h2>
            <div className="form-grid form-grid--two">
              <div className="autocomplete">
                <Field label="Nombre del cliente">
                  <input
                    type="text"
                    required
                    placeholder="Escribe para buscar..."
                    value={nombreCliente}
                    onChange={(e) => cambiarNombreCliente(e.target.value)}
                    autoComplete="off"
                  />
                </Field>

                {(buscandoClientes || sugerenciasClientes.length > 0) && (
                  <div className="autocomplete__panel">
                    {buscandoClientes && <span className="autocomplete__hint">Buscando clientes...</span>}
                    {sugerenciasClientes.map((cliente) => (
                      <button key={cliente.id} type="button" onClick={() => seleccionarCliente(cliente)}>
                        <strong>{cliente.nombre}</strong>
                        <span>{cliente.telefono || 'Sin telefono registrado'}</span>
                      </button>
                    ))}
                  </div>
                )}

                {clienteSeleccionado && (
                  <div className="selection-pill">
                    Cliente existente seleccionado
                    <button type="button" onClick={() => setClienteSeleccionado(null)}>
                      Cambiar
                    </button>
                  </div>
                )}
              </div>

              <Field label="Telefono" hint="Opcional">
                <input
                  type="tel"
                  placeholder="981 115 3639"
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="form-section">
            <h2>Servicio principal</h2>
            <div className="form-grid form-grid--two">
              <Field label="Categoria">
                <select
                  value={categoriaPrincipal}
                  onChange={(e) => cambiarCategoriaPrincipal(e.target.value)}
                  disabled={cargandoCatalogo}
                >
                  <option value="">{cargandoCatalogo ? 'Cargando categorias...' : 'Selecciona una categoria'}</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Servicio">
                <select
                  value={servicioPrincipal}
                  onChange={(e) => setServicioPrincipal(e.target.value)}
                  disabled={cargandoCatalogo || !categoriaPrincipal}
                >
                  <option value="">Selecciona un servicio</option>
                  {serviciosPrincipales.map((servicio) => (
                    <option key={servicio.id} value={servicio.id}>
                      {servicio.nombre} - {formatearDinero(servicio.precio)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Precio del servicio">
              <input
                type="text"
                value={servicioPrincipalActual ? formatearDinero(servicioPrincipalActual.precio) : ''}
                placeholder="$0"
                readOnly
              />
            </Field>
          </section>

          <section className="form-section compact-add-section">
            <div>
              <h2>Cobros adicionales</h2>
              <p className="muted-text">Agrega otro servicio o producto solo cuando el ticket lo necesite.</p>
            </div>
            <button type="button" className="button button--ghost" onClick={() => setModalAdicionalAbierto(true)}>
              + Agregar cobro adicional
            </button>
          </section>

          <section className="form-section">
            <h2>Detalle del ticket</h2>
            {conceptos.length === 0 ? (
              <p className="muted-text">Selecciona un servicio principal o agrega un cobro adicional.</p>
            ) : (
              <div className="concept-list">
                {conceptos.map((concepto, index) => {
                  const esPrincipal = Boolean(conceptoPrincipal && index === 0);
                  const indiceAdicional = conceptoPrincipal ? index - 1 : index;

                  return (
                    <div key={`${concepto.tipo}-${concepto.servicio_id || concepto.nombre}-${index}`}>
                      <span>
                        <strong>
                          {index + 1}. {concepto.categoria_nombre || 'Producto'} - {concepto.nombre}
                        </strong>
                        <small>
                          {concepto.cantidad} x {formatearDinero(concepto.precio)}
                        </small>
                      </span>
                      <b>{formatearDinero(concepto.subtotal)}</b>
                      {!esPrincipal && (
                        <button type="button" className="button button--ghost button--small" onClick={() => eliminarConceptoAdicional(indiceAdicional)}>
                          Quitar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="ticket-total-row">
              <span>Total</span>
              <strong>{formatearDinero(total)}</strong>
            </div>

            <Field label="Metodo de pago">
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </Field>
          </section>

          <button type="submit" className="button" disabled={loading || conceptos.length === 0}>
            {loading ? 'Generando ticket...' : 'Cobrar y generar ticket'}
          </button>
        </form>
      </Card>

      <Modal
        open={modalAdicionalAbierto}
        eyebrow="Cobro adicional"
        title="Agregar concepto"
        compact
        onClose={() => {
          setModalAdicionalAbierto(false);
          setAdicional(adicionalInicial);
        }}
      >
        <div className="form-grid">
              <div className="form-grid form-grid--two">
                <Field label="Tipo">
                  <select
                    value={adicional.tipo}
                    onChange={(e) => setAdicional({ ...adicionalInicial, tipo: e.target.value })}
                  >
                    <option value="servicio">Otro servicio</option>
                    <option value="producto">Producto</option>
                  </select>
                </Field>

                <Field label="Cantidad">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={adicional.cantidad}
                    onChange={(e) =>
                      setAdicional((actual) => ({ ...actual, cantidad: soloEnteros(e.target.value) }))
                    }
                  />
                </Field>
              </div>

              {adicional.tipo === 'servicio' ? (
                <div className="form-grid form-grid--two">
                  <Field label="Categoria">
                    <select
                      value={adicional.categoria_id}
                      onChange={(e) =>
                        setAdicional((actual) => ({
                          ...actual,
                          categoria_id: e.target.value,
                          servicio_id: '',
                          nombre: '',
                          precio: '',
                        }))
                      }
                    >
                      <option value="">Selecciona una categoria</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Servicio">
                    <select
                      value={adicional.servicio_id}
                      onChange={(e) => cambiarServicioAdicional(e.target.value)}
                      disabled={!adicional.categoria_id}
                    >
                      <option value="">Selecciona un servicio</option>
                      {serviciosAdicionales.map((servicio) => (
                        <option key={servicio.id} value={servicio.id}>
                          {servicio.nombre} - {formatearDinero(servicio.precio)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              ) : (
                <Field label="Nombre del producto">
                  <input
                    type="text"
                    placeholder="Ej. Gel para cabello"
                    value={adicional.nombre}
                    onChange={(e) => setAdicional((actual) => ({ ...actual, nombre: e.target.value }))}
                  />
                </Field>
              )}

              <Field label="Precio entero">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="80"
                  value={adicional.precio}
                  onChange={(e) => setAdicional((actual) => ({ ...actual, precio: soloEnteros(e.target.value) }))}
                  readOnly={adicional.tipo === 'servicio'}
                />
              </Field>

              <div className="modal-card__actions">
                <button type="button" className="button" onClick={agregarAdicional}>
                  Agregar al ticket
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => {
                    setModalAdicionalAbierto(false);
                    setAdicional(adicionalInicial);
                  }}
                >
                  Cancelar
                </button>
              </div>
        </div>
      </Modal>
    </>
  );
}
