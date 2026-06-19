import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Profil from './pages/Profil'
import Analyse from './pages/Analyse'
import Dashboard from './pages/Dashboard'
import Historique from './pages/Historique'
import Barcode from './pages/Barcode'

function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout><Dashboard /></Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Layout><Dashboard /></Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/profil"
          element={
            <RequireAuth>
              <Layout><Profil /></Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/analyse"
          element={
            <RequireAuth>
              <Layout><Analyse /></Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/historique"
          element={
            <RequireAuth>
              <Layout><Historique /></Layout>
            </RequireAuth>
          }
        />
                <Route
          path="/barcode"
          element={
            <RequireAuth>
              <Layout><Barcode /></Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
