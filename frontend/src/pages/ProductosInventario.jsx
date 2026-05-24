import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Card, EmptyState, Field, Modal, PageHeader, SkeletonCards } from '../components/ui';
import { api } from '../services/api';
import { formatearFecha } from '../utils/date';
import { formatearDinero } from '../utils/ticket';
import { toast } from '../utils/toast';

function soloEnteros(valor) {
  return valor.replace(/\D/g, '');
}

const categoriaInicial = { nombre: '', descripcion: '', activa: true };
const productoInicial = {
  categoria_producto_id: '',
  nombre: '',
  descripcion: '',
  precio: '',
  stock: '0',
  stock_minimo: '0',
  activo: true,
};
const movimientoInicial = { producto_id: '', cantidad: '', stock_nuevo: '', motivo: '' };

export default function ProductosInventario() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [categoriaForm, setCategoriaForm] = useState(categoriaInicial);
  const [productoForm, setProductoForm] = useState(productoInicial);
  const [editandoCategoriaId, setEditandoCategoriaId] = useState(null);
  const [editandoProductoId, setEditandoProductoId] = useState(null);
  const [filtros, setFiltros] = useState({ categoriaId: '', nombre: '' });
  const [modalMovimiento, setModalMovimiento] = useState(null);
  const [movimientoForm, setMovimientoForm] = useState(movimientoInicial);
  const [confirmacion, setConfirmacion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const productosFiltrados = useMemo(() => {
    const nombre = filtros.nombre.trim().toLowerCase();
    return productos.filter((producto) => {
      const coincideCategoria = !filtros.categoriaId || String(producto.categoria_producto_id) === String(filtros.categoriaId);
      const coincideNombre = !nombre || producto.nombre.toLowerCase().includes(nombre);
      return coincideCategoria && coincideNombre;
    });
  }, [filtros, productos]);

  const categoriasActivas = useMemo(() => categorias.filter((categoria) => categoria.activa), [categorias]);
  const productosActivos = useMemo(() => productos.filter((producto) => producto.activo), [productos]);
  const productosStockBajo = useMemo(
    () => productos.filter((producto) => producto.activo && Number(producto.stock) <= Number(producto.stock_minimo)),
    [productos],
  );

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError('');
      const [categoriasData, productosData, movimientosData] = await Promise.all([
        api.obtenerCategoriasProductos(true),
        api.obtenerProductos({ incluir_inactivos: true }),
        api.obtenerMovimientosInventario({ limite: 12 }),
      ]);
      setCategorias(categoriasData || []);
      setProductos(productosData || []);
      setMovimientos(movimientosData || []);
    } catch (err) {
      const mensajeError = err.message || 'No se pudo cargar productos e inventario.';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      cargarDatos();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [cargarDatos]);

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

    try {
      setLoading(true);
      const payload = {
        nombre: categoriaForm.nombre.trim(),
        descripcion: categoriaForm.descripcion.trim() || null,
        activa: categoriaForm.activa,
      };

      if (editandoCategoriaId) {
        const actualizada = await api.actualizarCategoriaProducto(editandoCategoriaId, payload);
        setCategorias((actuales) => actuales.map((categoria) => (categoria.id === editandoCategoriaId ? actualizada : categoria)));
        setMensaje('Categoria de producto actualizada correctamente.');
        toast.success('Categoria de producto actualizada.');
      } else {
        const nueva = await api.crearCategoriaProducto(payload);
        setCategorias((actuales) => [...actuales, nueva]);
        setMensaje('Categoria de producto creada correctamente.');
        toast.success('Categoria de producto creada.');
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

  const guardarProducto = async (e) => {
    e.preventDefault();
    resetMensajes();

    const precio = Number(productoForm.precio);
    const stock = Number(productoForm.stock);
    const stockMinimo = Number(productoForm.stock_minimo);

    if (!productoForm.categoria_producto_id || !productoForm.nombre.trim() || !Number.isInteger(precio) || precio <= 0) {
      setError('Completa categoria, nombre y precio entero mayor a cero.');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(stockMinimo) || stockMinimo < 0) {
      setError('Stock y stock minimo deben ser enteros iguales o mayores a cero.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        categoria_producto_id: Number(productoForm.categoria_producto_id),
        nombre: productoForm.nombre.trim(),
        descripcion: productoForm.descripcion.trim() || null,
        precio,
        stock,
        stock_minimo: stockMinimo,
        activo: productoForm.activo,
      };

      if (editandoProductoId) {
        const actualizado = await api.actualizarProducto(editandoProductoId, payload);
        setProductos((actuales) => actuales.map((producto) => (producto.id === editandoProductoId ? actualizado : producto)));
        setMensaje('Producto actualizado correctamente.');
        toast.success('Producto actualizado.');
      } else {
        const nuevo = await api.crearProducto(payload);
        setProductos((actuales) => [nuevo, ...actuales]);
        setMensaje('Producto creado correctamente.');
        toast.success('Producto creado.');
      }

      setProductoForm(productoInicial);
      setEditandoProductoId(null);
      cargarDatos();
    } catch (err) {
      const mensajeError = err.message || 'No se pudo guardar el producto.';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  const editarProducto = (producto) => {
    resetMensajes();
    setEditandoProductoId(producto.id);
    setProductoForm({
      categoria_producto_id: String(producto.categoria_producto_id || ''),
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: String(producto.precio),
      stock: String(producto.stock),
      stock_minimo: String(producto.stock_minimo),
      activo: producto.activo,
    });
  };

  const abrirMovimiento = (tipo, producto = null) => {
    resetMensajes();
    setModalMovimiento(tipo);
    setMovimientoForm({
      producto_id: producto ? String(producto.id) : '',
      cantidad: '',
      stock_nuevo: producto ? String(producto.stock) : '',
      motivo: '',
    });
  };

  const guardarMovimiento = async () => {
    resetMensajes();
    const productoId = Number(movimientoForm.producto_id);
    const cantidad = Number(movimientoForm.cantidad);
    const stockNuevo = Number(movimientoForm.stock_nuevo);

    if (!Number.isInteger(productoId) || productoId <= 0) {
      setError('Selecciona un producto valido.');
      return;
    }

    try {
      setLoading(true);
      if (modalMovimiento === 'entrada') {
        if (!Number.isInteger(cantidad) || cantidad <= 0) {
          setError('La entrada requiere una cantidad entera mayor a cero.');
          return;
        }
        await api.registrarEntradaInventario({
          producto_id: productoId,
          cantidad,
          motivo: movimientoForm.motivo.trim() || null,
        });
        setMensaje('Entrada de inventario registrada.');
        toast.success('Entrada registrada.');
      } else {
        if (!Number.isInteger(stockNuevo) || stockNuevo < 0) {
          setError('El ajuste requiere un stock entero igual o mayor a cero.');
          return;
        }
        await api.registrarAjusteInventario({
          producto_id: productoId,
          stock_nuevo: stockNuevo,
          motivo: movimientoForm.motivo.trim() || null,
        });
        setMensaje('Ajuste de inventario registrado.');
        toast.success('Ajuste registrado.');
      }

      setModalMovimiento(null);
      setMovimientoForm(movimientoInicial);
      await cargarDatos();
    } catch (err) {
      const mensajeError = err.message || 'No se pudo registrar el movimiento.';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  const confirmarDesactivacion = async () => {
    if (!confirmacion) return;

    try {
      setLoading(true);
      if (confirmacion.tipo === 'categoria') {
        await api.eliminarCategoriaProducto(confirmacion.item.id);
        setCategorias((actuales) => actuales.map((item) => (item.id === confirmacion.item.id ? { ...item, activa: false } : item)));
        toast.success('Categoria desactivada.');
      } else {
        await api.eliminarProducto(confirmacion.item.id);
        setProductos((actuales) => actuales.map((item) => (item.id === confirmacion.item.id ? { ...item, activo: false } : item)));
        toast.success('Producto desactivado.');
      }
      setConfirmacion(null);
    } catch (err) {
      const mensajeError = err.message || 'No se pudo desactivar el registro.';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Inventario DAM"
        title="Productos"
        description="Administra productos de venta, stock y movimientos de inventario."
        actions={<button type="button" className="button button--ghost" onClick={cargarDatos}>Actualizar</button>}
      />

      <Alert type="error">{error}</Alert>
      <Alert type="success">{mensaje}</Alert>

      <div className="metrics-grid metrics-grid--six">
        <Card className="metric">
          <span>Productos activos</span>
          <strong>{productosActivos.length}</strong>
        </Card>
        <Card className="metric">
          <span>Stock bajo</span>
          <strong>{productosStockBajo.length}</strong>
        </Card>
        <Card className="metric">
          <span>Categorias activas</span>
          <strong>{categoriasActivas.length}</strong>
        </Card>
      </div>

      <div className="catalog-layout">
        <Card className="service-form">
          <form onSubmit={guardarCategoria} className="form-grid">
            <div className="form-title-row">
              <h2>{editandoCategoriaId ? 'Editar categoria' : 'Nueva categoria'}</h2>
              {editandoCategoriaId && (
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => {
                    setCategoriaForm(categoriaInicial);
                    setEditandoCategoriaId(null);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>

            <Field label="Nombre">
              <input
                type="text"
                placeholder="Ej. Labiales"
                value={categoriaForm.nombre}
                onChange={(e) => setCategoriaForm((actual) => ({ ...actual, nombre: e.target.value }))}
                required
              />
            </Field>

            <Field label="Descripcion" hint="Opcional">
              <input
                type="text"
                placeholder="Productos para venta"
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
              <EmptyState title="Sin categorias" description="Crea una categoria para empezar." />
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
                    <tr key={categoria.id} className={!categoria.activa ? 'row-muted' : ''}>
                      <td data-label="Categoria">{categoria.nombre}</td>
                      <td data-label="Descripcion">{categoria.descripcion || 'Sin descripcion'}</td>
                      <td data-label="Estado">{categoria.activa ? 'Activa' : 'Inactiva'}</td>
                      <td data-label="Acciones">
                        <div className="row-actions">
                          <button type="button" className="button button--ghost button--small" onClick={() => editarCategoria(categoria)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="button button--danger button--small"
                            onClick={() => setConfirmacion({ tipo: 'categoria', item: categoria })}
                          >
                            Desactivar
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
          <form onSubmit={guardarProducto} className="form-grid">
            <div className="form-title-row">
              <h2>{editandoProductoId ? 'Editar producto' : 'Nuevo producto'}</h2>
              {editandoProductoId && (
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => {
                    setProductoForm(productoInicial);
                    setEditandoProductoId(null);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>

            <Field label="Categoria">
              <select
                value={productoForm.categoria_producto_id}
                onChange={(e) => setProductoForm((actual) => ({ ...actual, categoria_producto_id: e.target.value }))}
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

            <Field label="Nombre">
              <input
                type="text"
                placeholder="Ej. Labial rojo mate"
                value={productoForm.nombre}
                onChange={(e) => setProductoForm((actual) => ({ ...actual, nombre: e.target.value }))}
                required
              />
            </Field>

            <Field label="Descripcion" hint="Opcional">
              <input
                type="text"
                placeholder="Marca, tono, presentacion"
                value={productoForm.descripcion}
                onChange={(e) => setProductoForm((actual) => ({ ...actual, descripcion: e.target.value }))}
              />
            </Field>

            <div className="form-grid form-grid--two">
              <Field label="Precio">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={productoForm.precio}
                  onChange={(e) => setProductoForm((actual) => ({ ...actual, precio: soloEnteros(e.target.value) }))}
                  required
                />
              </Field>

              <Field label="Stock minimo">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={productoForm.stock_minimo}
                  onChange={(e) => setProductoForm((actual) => ({ ...actual, stock_minimo: soloEnteros(e.target.value) }))}
                />
              </Field>
            </div>

            <Field label="Stock actual">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={productoForm.stock}
                onChange={(e) => setProductoForm((actual) => ({ ...actual, stock: soloEnteros(e.target.value) }))}
              />
            </Field>

            <label className="check-row">
              <input
                type="checkbox"
                checked={productoForm.activo}
                onChange={(e) => setProductoForm((actual) => ({ ...actual, activo: e.target.checked }))}
              />
              Producto activo
            </label>

            <button type="submit" className="button" disabled={loading || categoriasActivas.length === 0}>
              {loading ? 'Guardando...' : editandoProductoId ? 'Guardar producto' : 'Crear producto'}
            </button>
          </form>
        </Card>

        <Card>
          <div className="filters-card inventory-filters">
            <div className="filters-grid">
              <Field label="Buscar producto">
                <input
                  type="search"
                  placeholder="Nombre del producto"
                  value={filtros.nombre}
                  onChange={(e) => setFiltros((actual) => ({ ...actual, nombre: e.target.value }))}
                />
              </Field>

              <Field label="Categoria">
                <select
                  value={filtros.categoriaId}
                  onChange={(e) => setFiltros((actual) => ({ ...actual, categoriaId: e.target.value }))}
                >
                  <option value="">Todas</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="row-actions">
              <button type="button" className="button button--ghost button--small" onClick={() => abrirMovimiento('entrada')}>
                Registrar entrada
              </button>
              <button type="button" className="button button--ghost button--small" onClick={() => abrirMovimiento('ajuste')}>
                Ajustar stock
              </button>
            </div>
          </div>

          <div className="table-wrap">
            {cargando ? (
              <SkeletonCards count={4} />
            ) : productosFiltrados.length === 0 ? (
              <EmptyState title="Sin productos" description="Crea productos o ajusta los filtros." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoria</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Minimo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((producto) => (
                    <tr key={producto.id} className={!producto.activo ? 'row-muted' : producto.stock_bajo ? 'row-warning' : ''}>
                      <td data-label="Producto">
                        <strong>{producto.nombre}</strong>
                        {producto.descripcion && <small className="table-note">{producto.descripcion}</small>}
                      </td>
                      <td data-label="Categoria">{producto.categoria_producto_nombre || 'Sin categoria'}</td>
                      <td data-label="Precio" className="price">{formatearDinero(producto.precio)}</td>
                      <td data-label="Stock">
                        <span className={`stock-pill ${producto.stock_bajo ? 'stock-pill--low' : ''}`}>{producto.stock}</span>
                      </td>
                      <td data-label="Minimo">{producto.stock_minimo}</td>
                      <td data-label="Estado">{producto.activo ? 'Activo' : 'Inactivo'}</td>
                      <td data-label="Acciones">
                        <div className="row-actions">
                          <button type="button" className="button button--ghost button--small" onClick={() => editarProducto(producto)}>
                            Editar
                          </button>
                          <button type="button" className="button button--ghost button--small" onClick={() => abrirMovimiento('entrada', producto)}>
                            Entrada
                          </button>
                          <button type="button" className="button button--ghost button--small" onClick={() => abrirMovimiento('ajuste', producto)}>
                            Ajuste
                          </button>
                          <button
                            type="button"
                            className="button button--danger button--small"
                            onClick={() => setConfirmacion({ tipo: 'producto', item: producto })}
                          >
                            Desactivar
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

      <Card className="chart-card">
        <div className="chart-card__header">
          <div>
            <span className="eyebrow">Inventario</span>
            <h2>Ultimos movimientos</h2>
          </div>
        </div>
        {movimientos.length === 0 ? (
          <EmptyState title="Sin movimientos" description="Las entradas, ajustes y ventas apareceran aqui." />
        ) : (
          <div className="ranking-list ranking-list--detailed">
            {movimientos.map((movimiento) => (
              <div key={movimiento.id}>
                <span className="ranking-index">{movimiento.tipo_movimiento.slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{movimiento.producto_nombre || `Producto #${movimiento.producto_id}`}</strong>
                  <small>
                    {formatearFecha(movimiento.created_at)} - {movimiento.motivo || 'Sin motivo'}
                  </small>
                </span>
                <span className="ranking-total">
                  <b>{movimiento.stock_nuevo}</b>
                  <small>{movimiento.tipo_movimiento} {movimiento.cantidad}</small>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(modalMovimiento)}
        eyebrow="Inventario"
        title={modalMovimiento === 'entrada' ? 'Registrar entrada' : 'Ajustar stock'}
        compact
        onClose={() => setModalMovimiento(null)}
      >
        <div className="form-grid">
          <Field label="Producto">
            <select
              value={movimientoForm.producto_id}
              onChange={(e) => {
                const producto = productos.find((item) => String(item.id) === e.target.value);
                setMovimientoForm((actual) => ({
                  ...actual,
                  producto_id: e.target.value,
                  stock_nuevo: producto ? String(producto.stock) : actual.stock_nuevo,
                }));
              }}
            >
              <option value="">Selecciona un producto</option>
              {productosActivos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre} - stock {producto.stock}
                </option>
              ))}
            </select>
          </Field>

          {modalMovimiento === 'entrada' ? (
            <Field label="Cantidad de entrada">
              <input
                type="number"
                min="1"
                step="1"
                value={movimientoForm.cantidad}
                onChange={(e) => setMovimientoForm((actual) => ({ ...actual, cantidad: soloEnteros(e.target.value) }))}
              />
            </Field>
          ) : (
            <Field label="Stock nuevo">
              <input
                type="number"
                min="0"
                step="1"
                value={movimientoForm.stock_nuevo}
                onChange={(e) => setMovimientoForm((actual) => ({ ...actual, stock_nuevo: soloEnteros(e.target.value) }))}
              />
            </Field>
          )}

          <Field label="Motivo" hint="Opcional">
            <input
              type="text"
              placeholder={modalMovimiento === 'entrada' ? 'Compra a proveedor' : 'Conteo fisico'}
              value={movimientoForm.motivo}
              onChange={(e) => setMovimientoForm((actual) => ({ ...actual, motivo: e.target.value }))}
            />
          </Field>

          <div className="modal-card__actions">
            <button type="button" className="button" onClick={guardarMovimiento} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar movimiento'}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setModalMovimiento(null)}>
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(confirmacion)}
        eyebrow="Confirmar"
        title={confirmacion?.tipo === 'categoria' ? 'Desactivar categoria' : 'Desactivar producto'}
        compact
        onClose={() => setConfirmacion(null)}
        actions={
          <>
            <button type="button" className="button button--danger" onClick={confirmarDesactivacion} disabled={loading}>
              {loading ? 'Procesando...' : 'Desactivar'}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setConfirmacion(null)}>
              Cancelar
            </button>
          </>
        }
      >
        <p className="modal-copy">
          Se desactivara "{confirmacion?.item?.nombre}" sin borrar datos historicos ni movimientos.
        </p>
      </Modal>
    </>
  );
}
