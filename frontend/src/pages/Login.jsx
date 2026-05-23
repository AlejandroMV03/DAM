import { useState } from 'react';
import DamLogo from '../components/DamLogo';
import { Alert, Card, Field } from '../components/ui';
import { api } from '../services/api';
import { toast } from '../utils/toast';

export default function Login({ onLoginExitoso, avisoSesion = '' }) {
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim() || !pin.trim()) {
      setError('Ingresa tu nombre y PIN para continuar.');
      return;
    }

    try {
      setLoading(true);
      const datosUsuario = await api.login({
        nombre: nombre.trim(),
        pin_acceso: pin.trim(),
      });
      onLoginExitoso(datosUsuario);
    } catch (err) {
      const mensajeError = err.message || 'Nombre o PIN incorrectos. Intenta de nuevo.';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <Card className="login-card">
        <DamLogo />

        <h1>Acceso DAM</h1>
        <p>Administra caja, servicios y tickets desde un solo panel.</p>

        <Alert type="error">{error || avisoSesion}</Alert>

        <form onSubmit={manejarSubmit} className="form-grid">
          <Field label="Nombre">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              autoComplete="username"
              required
            />
          </Field>

          <Field label="PIN de acceso">
            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="pin-input"
              placeholder="----"
              autoComplete="current-password"
              required
            />
          </Field>

          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </Card>
    </main>
  );
}
