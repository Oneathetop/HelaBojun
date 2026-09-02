import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

function ProtectedDashboard() {
  const token = localStorage.getItem('hadaAdminToken')

  return token ? <Dashboard /> : <Navigate to="/login" replace />
}

function PublicLogin() {
  const token = localStorage.getItem('hadaAdminToken')

  return token ? <Navigate to="/dashboard" replace /> : <Login />
}

function RootRoute() {
  const token = localStorage.getItem('hadaAdminToken')

  return <Navigate to={token ? '/dashboard' : '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<PublicLogin />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
