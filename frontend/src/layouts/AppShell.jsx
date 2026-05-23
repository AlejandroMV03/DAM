import { useState } from 'react';
import DamLogo from '../components/DamLogo';
import { APP_ROUTES, obtenerRutaPorId } from '../routes/appRoutes';

export default function AppShell({ usuario, onCerrarSesion }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [vistaActual, setVistaActual] = useState('dashboard');

  const rutaActual = obtenerRutaPorId(vistaActual);
  const Vista = rutaActual.component;

  const navegar = (vista) => {
    setVistaActual(vista);
    setMenuAbierto(false);
  };

  return (
    <div className="app-shell">
      {menuAbierto && <button className="overlay" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menu" />}

      <aside className={`sidebar ${menuAbierto ? 'sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <DamLogo />
          <button className="icon-button lg:hidden" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menu">
            x
          </button>
        </div>

        <div className="sidebar__user">
          <span>Atendiendo hoy</span>
          <strong>{usuario.nombre}</strong>
        </div>

        <nav className="sidebar__nav" aria-label="Navegacion principal">
          {APP_ROUTES.map((opcion) => (
            <button
              key={opcion.id}
              onClick={() => navegar(opcion.id)}
              className={`nav-button ${vistaActual === opcion.id ? 'nav-button--active' : ''}`}
            >
              <span className="nav-button__icon">{opcion.icono}</span>
              <span>{opcion.nombre}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button onClick={onCerrarSesion} className="button button--danger">
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setMenuAbierto(true)} aria-label="Abrir menu">
            =
          </button>
          <DamLogo compact />
          <strong>{rutaActual.nombre}</strong>
        </header>

        <div className="content">
          <Vista usuario={usuario} onNavigate={navegar} />
        </div>

        <nav className="bottom-nav" aria-label="Navegacion movil">
          {APP_ROUTES.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              className={vistaActual === opcion.id ? 'bottom-nav__active' : ''}
              onClick={() => navegar(opcion.id)}
            >
              <span>{opcion.icono}</span>
              <small>{opcion.nombre}</small>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
