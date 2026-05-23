import { useEffect, useState } from 'react'
import Login from "./pages/Login"
import AppShell from './layouts/AppShell.jsx'
import { api } from './services/api'
import { Spinner, ToastHost } from './components/ui'
import { toast } from './utils/toast'

export default function App() {
  const [usuarioActivo, setUsuarioActivo] = useState(null)
  const [validandoSesion, setValidandoSesion] = useState(Boolean(api.obtenerToken()))
  const [sesionError, setSesionError] = useState('')

  useEffect(() => {
    api.setUnauthorizedHandler((mensaje) => {
      setUsuarioActivo(null)
      setSesionError(mensaje || 'Sesion expirada')
      toast.error(mensaje || 'Sesion expirada')
    })

    if (!api.obtenerToken()) {
      return
    }

    let activo = true
    api.obtenerSesion()
      .then((usuario) => {
        if (activo) setUsuarioActivo(usuario)
      })
      .catch((err) => {
        api.limpiarToken()
        if (activo) setSesionError(err.message || 'Sesion expirada')
      })
      .finally(() => {
        if (activo) setValidandoSesion(false)
      })

    return () => {
      activo = false
    }
  }, [])

  const iniciarSesion = (respuestaLogin) => {
    setSesionError('')
    setUsuarioActivo(respuestaLogin.usuario || respuestaLogin)
    toast.success('Login correcto.')
  }

  const cerrarSesion = () => {
    api.limpiarToken()
    setUsuarioActivo(null)
    setSesionError('')
    toast.info('Sesion cerrada.')
  }

  if (validandoSesion) {
    return (
      <>
        <main className="login-page">
          <section className="surface-card login-card">
            <h1>Acceso DAM</h1>
            <Spinner label="Validando sesion..." />
          </section>
        </main>
        <ToastHost />
      </>
    )
  }

  if (!usuarioActivo) {
    return (
      <>
        <Login onLoginExitoso={iniciarSesion} avisoSesion={sesionError} />
        <ToastHost />
      </>
    )
  }

  return (
    <>
      <AppShell usuario={usuarioActivo} onCerrarSesion={cerrarSesion} />
      <ToastHost />
    </>
  )
}
