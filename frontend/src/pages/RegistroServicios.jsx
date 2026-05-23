import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, EmptyState, Field, Modal, PageHeader, SkeletonCards } from '../components/ui';
import { api } from '../services/api';
import { toast } from '../utils/toast';

function normalizarEntero(valor) {
  return valor.replace(/\D/g, '');
}

const categoriaInicial = { nombre: '', descripcion: '', activa: true };
const servicioInicial = { nombre: '', categoria_id: '', precio: '', activo: true };

export default function RegistroServicio() {
  const [categorias, setCategorias] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [categoriaForm, setCategoriaForm] = useState(categoriaInicial);
  const [servicioForm, setServicioForm] = useState(servicioInicial);
  const [editandoCategoriaId, setEditandoCategoriaId] = useState(null);
  const [editandoServicioId, setEditandoServicioId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [confirmacion, setConfirmacion] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;

    Promise.all([api.obtenerCategorias(true), api.obtenerServicios({ incluirInactivos: true })])
      .then(([categoriasData, serviciosData]) => {
        if (!activo) return;
        setCategorias(categoriasData || []);
        setServicios(serviciosData || []);
      })
      .catch((err) => {
        if (activo) {
          const mensajeError = err.message || 'No se pudo cargar el catalogo.';
          setError(mensajeError);
          toast.error(mensajeError);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const categoriasActivas = useMemo(
    () => categorias.filter((categoria) => categoria.activa),
    [categorias],
  );

  const resetMensajes = () => {
    setError('');
    setMensaje('');
  };

  const guardarCategoria = async (e) => {
    e.preventDefault();
    resetMensajes();

    if (!categoriaForm.nombre.trim()) {
      setError('El nombre de la categoria es obligatorio.');
      return;
    }

    const duplicada = categorias.find(
      (categoria) =>
        categoria.nombre.trim().toLowerCase() === categoriaForm.nombre.trim().toLowerCase()
        && categoria.id !== editandoCategoriaId,
    );
    if (duplicada) {
      setError('Ya existe una categoria con ese nombre.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        nombre: categoriaForm.nombre.trim(),
        descripcion: categoriaForm.descripcion.trim() || null,
        activa: categoriaForm.activa,
      };

      if (editandoCategoriaId) {
        const actualizada = await api.actualizarCategoria(editandoCategoriaId, payload);
        setCategorias((actuales) =>
          actuales.map((categoria) => (categoria.id === editandoCategoriaId ? actualizada : categoria)),
        );
        setMensaje('Categoria actualizada correctamente.');
        toast.success('Categoria actualizada correctamente.');
      } else {
        const nueva = await api.crearCategoria(payload);
        setCategorias((actuales) => [...actuales, nueva]);
        setMensaje('Categoria creada correctamente.');
        toast.success('Categoria creada correctamente.');
      }

      setCategoriaForm(categoriaInicial);
      setEditandoCategoriaId(null);
    } catch (err) {
      const mensajeError = err.message || 'No se pudo guardar la categoria.';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  const editarCategoria = (categoria) => {
    resetMensajes();
    setEditandoCategoriaId(categoria.id);
    setCategoriaForm({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || '',
      activa: categoria.activa,
    });
  };

  const eliminarCategoria = async (categoria) => {
    resetMensajes();
    setConfirmacion({
      tipo: 'categoria',
      titulo: 'Desactivar categoria',
      descripcion: `Se desactivara "${categoria.nombre}" sin borrar datos historicos.`,
      item: categoria,
    });
  };

  const confirmarEliminacion = async () => {
    if (!confirmacion) return;
    try {
      setLoading(true);
      if (confirmacion.tipo === 'categoria') {
        await api.eliminarCategoria(confirmacion.item.id);
        setCategorias((actuales) =>
          actuales.map((item) => (item.id === confirmacion.item.id ? { ...item, activa: false } : item)),
        );
        setMensaje('Categoria eliminada o desactivada correctamente.');
        toast.success('Categoria desactivada correctamente.');
      } else {
        await api.eliminarServicio(confirmacion.item.id);
        setServicios((actuales) =>
          actuales.map((item) => (item.id === confirmacion.item.id ? { ...item, activo: false } : item)),
        );
        setMensaje('Servicio desactivado correctamente.');
        toast.success('Servicio desactivado correctamente.');
      }
      setConfirmacion(null);
    } catch (err) {
      const mensajeError = err.message || 'No se pudo eliminar el registro.';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  const guardarServicio = async (e) => {
    e.preventDefault();
    resetMensajes();

    const precioEntero = Number(servicioForm.precio);
    if (!servicioForm.nombre.trim() || !servicioForm.categoria_id || !Number.isInteger(precioEntero) || precioEntero <= 0) {
      setError('Completa nombre, categoria y precio entero mayor a cero.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        nombre: servicioForm.nombre.trim(),
        categoria_id: Number(servicioForm.categoria_id),
        precio: precioEntero,
        activo: servicioForm.activo,
      };

      if (editandoServicioId) {
        const actualizado = await api.actualizarServicio(editandoServicioId, payload);
        setServicios((actuales) =>
          actuales.map((servicio) => (servicio.id === editandoServicioId ? actualizado : servicio)),
        );
        setMensaje('Servicio actualizado correctamente.');
        toast.success('Servicio actualizado correctamente.');
      } else {
        const nuevo = await api.crearServicio(payload);
        setServicios((actuales) => [nuevo, ...actuales]);
        setMensaje('Servicio creado correctamente.');
        toast.success('Servicio creado correctamente.');
      }

      setServicioForm(servicioInicial);
      setEditandoServicioId(null);
    } catch (err) {
      const mensajeError = err.message || 'No se pudo guardar el servicio.';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  const editarServicio = (servicio) => {
    resetMensajes();
    setEditandoServicioId(servicio.id);
    setServicioForm({
      nombre: servicio.nombre,
      categoria_id: String(servicio.categoria_id || ''),
      precio: String(Math.trunc(Number(servicio.precio))),
      activo: servicio.activo,
    });
  };

  const eliminarServicio = async (servicio) => {
    resetMensajes();
    setConfirmacion({
      tipo: 'servicio',
      titulo: 'Desactivar servicio',
      descripcion: `Se desactivara "${servicio.nombre}" y seguira disponible en tickets historicos.`,
      item: servicio,
    });
  };

  const cancelarCategoria = () => {
    setCategoriaForm(categoriaInicial);
    setEditandoCategoriaId(null);
  };

  const cancelarServicio = () => {
    setServicioForm(servicioInicial);
    setEditandoServicioId(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Catalogo DAM"
        title="Categorias y servicios"
        description="Administra categorias independientes y servicios asociados para que caja filtre correctamente cada cobro."
      />

      <Alert type="error">{error}</Alert>
      <Alert type="success">{mensaje}</Alert>

      <div className="catalog-layout">
        <Card className="service-form">
          <form onSubmit={guardarCategoria} className="form-grid">
            <div className="form-title-row">
              <h2>{editandoCategoriaId ? 'Editar categoria' : 'Nueva categoria'}</h2>
              {editandoCategoriaId && (
                <button type="button" className="button button--ghost button--small" onClick={cancelarCategoria}>
                  Cancelar
                </button>
              )}
            </div>

            <Field label="Nombre de categoria">
              <input
                type="text"
                placeholder="Ej. Barberia"
                value={categoriaForm.nombre}
                onChange={(e) => setCategoriaForm((actual) => ({ ...actual, nombre: e.target.value }))}
                required
              />
            </Field>

            <Field label="Descripcion" hint="Opcional">
              <input
                type="text"
                placeholder="Servicios de corte, barba y ceja"
                value={categoriaForm.descripcion}
                onChange={(e) => setCategoriaForm((actual) => ({ ...actual, descripcion: e.target.value }))}
              />
            </Field>

            <label className="check-row">
              <input
                type="checkbox"
                checked={categoriaForm.activa}
                onChange={(e) => setCategoriaForm((actual) => ({ ...actual, activa: e.target.checked }))}
              />
              Categoria activa
            </label>

            <button type="submit" className="button" disabled={loading}>
              {loading ? 'Guardando...' : editandoCategoriaId ? 'Guardar categoria' : 'Crear categoria'}
            </button>
          </form>
        </Card>

        <Card>
          <div className="table-wrap">
            {cargando ? (
              <SkeletonCards count={3} />
            ) : categorias.length === 0 ? (
              <EmptyState title="Sin categorias" description="Crea Barberia, Estetica u otra categoria." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Descripcion</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((categoria) => (
                    <tr key={categoria.id}>
                      <td data-label="Categoria">{categoria.nombre}</td>
                      <td data-label="Descripcion">{categoria.descripcion || 'Sin descripcion'}</td>
                      <td data-label="Estado">{categoria.activa ? 'Activa' : 'Inactiva'}</td>
                      <td data-label="Acciones">
                        <div className="row-actions">
                          <button type="button" className="button button--ghost button--small" onClick={() => editarCategoria(categoria)}>
                            Editar
                          </button>
                          <button type="button" className="button button--danger button--small" onClick={() => eliminarCategoria(categoria)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <div className="catalog-layout catalog-layout--services">
        <Card className="service-form">
          <form onSubmit={guardarServicio} className="form-grid">
            <div className="form-title-row">
              <h2>{editandoServicioId ? 'Editar servicio' : 'Nuevo servicio'}</h2>
              {editandoServicioId && (
                <button type="button" className="button button--ghost button--small" onClick={cancelarServicio}>
                  Cancelar
                </button>
              )}
            </div>

            <Field label="Nombre del servicio">
              <input
                type="text"
                placeholder="Ej. Corte de cabello"
                value={servicioForm.nombre}
                onChange={(e) => setServicioForm((actual) => ({ ...actual, nombre: e.target.value }))}
                required
              />
            </Field>

            <Field label="Categoria">
              <select
                value={servicioForm.categoria_id}
                onChange={(e) => setServicioForm((actual) => ({ ...actual, categoria_id: e.target.value }))}
                required
              >
                <option value="">Selecciona una categoria</option>
                {categoriasActivas.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Precio" hint="Solo numeros enteros. Ejemplo: 150">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="150"
                value={servicioForm.precio}
                onChange={(e) =>
                  setServicioForm((actual) => ({ ...actual, precio: normalizarEntero(e.target.value) }))
                }
                required
              />
            </Field>

            <label className="check-row">
              <input
                type="checkbox"
                checked={servicioForm.activo}
                onChange={(e) => setServicioForm((actual) => ({ ...actual, activo: e.target.checked }))}
              />
              Servicio activo
            </label>

            <button type="submit" className="button" disabled={loading || categoriasActivas.length === 0}>
              {loading ? 'Guardando...' : editandoServicioId ? 'Guardar servicio' : 'Crear servicio'}
            </button>
          </form>
        </Card>

        <Card>
          <div className="table-wrap">
            {cargando ? (
              <SkeletonCards count={3} />
            ) : servicios.length === 0 ? (
              <EmptyState title="Sin servicios registrados" description="Agrega el primer servicio para empezar a cobrar." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Categoria</th>
                    <th>Precio</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {servicios.map((servicio) => (
                    <tr key={servicio.id} className={!servicio.activo ? 'row-muted' : ''}>
                      <td data-label="Servicio">{servicio.nombre}</td>
                      <td data-label="Categoria">{servicio.categoria_nombre || servicio.categoria || 'Sin categoria'}</td>
                      <td data-label="Precio" className="price">${Number(servicio.precio).toLocaleString('es-MX')}</td>
                      <td data-label="Estado">{servicio.activo ? 'Activo' : 'Inactivo'}</td>
                      <td data-label="Acciones">
                        <div className="row-actions">
                          <button type="button" className="button button--ghost button--small" onClick={() => editarServicio(servicio)}>
                            Editar
                          </button>
                          <button type="button" className="button button--danger button--small" onClick={() => eliminarServicio(servicio)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(confirmacion)}
        eyebrow="Confirmar"
        title={confirmacion?.titulo}
        compact
        onClose={() => setConfirmacion(null)}
        actions={
          <>
            <button type="button" className="button button--danger" onClick={confirmarEliminacion} disabled={loading}>
              {loading ? 'Procesando...' : 'Desactivar'}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setConfirmacion(null)}>
              Cancelar
            </button>
          </>
        }
      >
        <p className="modal-copy">{confirmacion?.descripcion}</p>
      </Modal>
    </>
  );
}
