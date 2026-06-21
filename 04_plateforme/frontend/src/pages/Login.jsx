import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import client from '../api/client'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await client.post('/auth/login', form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify({ email: res.data.email }))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo + titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg mb-5">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Nutri<span className="text-green-600">Vision</span>
          </h1>
          <p className="text-gray-400 mt-1 text-xs font-medium uppercase tracking-widest">
            Suivi nutritionnel intelligent par IA
          </p>
        </div>

        {/* Carte */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Connexion</h2>
            <p className="text-sm text-gray-400 mt-0.5">Accédez à votre espace personnalisé</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                Adresse email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl focus:outline-none focus:border-green-400 focus:bg-white text-sm text-gray-800 placeholder-gray-300 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password" required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl focus:outline-none focus:border-green-400 focus:bg-white text-sm text-gray-800 placeholder-gray-300 transition-all"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 text-sm mt-2">
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-green-600 font-semibold hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          NutriVision — Suivi nutritionnel intelligent par IA pour patients chroniques
        </p>
      </div>
    </div>
  )
}