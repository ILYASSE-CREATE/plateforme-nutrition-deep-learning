import React, { useState, useEffect } from 'react'
import client from '../api/client'

const CONDITIONS = [
  { value: 'diabete', label: 'Diabète' },
  { value: 'hypertension', label: 'Hypertension' },
  { value: 'obesite', label: 'Obésité' },
  { value: 'insuffisance_renale', label: 'Insuffisance rénale' },
]

const ACTIVITES = [
  { value: 'sedentaire', label: 'Sédentaire (bureau, peu de mouvement)' },
  { value: 'leger', label: 'Légèrement actif (1-3 jours/semaine)' },
  { value: 'modere', label: 'Modérément actif (3-5 jours/semaine)' },
  { value: 'actif', label: 'Actif (6-7 jours/semaine)' },
  { value: 'tres_actif', label: 'Très actif (sport intensif quotidien)' },
]

export default function Profil() {
  const [form, setForm] = useState({
    age: '', sexe: 'M', poids_kg: '', taille_cm: '', activite: 'modere', conditions: [],
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    client.get('/profil')
      .then((res) => {
        if (res.data.profil) {
          const p = res.data.profil
          setForm({ age: p.age, sexe: p.sexe, poids_kg: p.poids_kg, taille_cm: p.taille_cm, activite: p.activite, conditions: p.conditions || [] })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleCondition = (val) => {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(val)
        ? f.conditions.filter((c) => c !== val)
        : [...f.conditions, val],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)
    try {
      await client.put('/profil', {
        ...form,
        age: Number(form.age),
        poids_kg: Number(form.poids_kg),
        taille_cm: Number(form.taille_cm),
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="text-gray-400">Chargement...</div></div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profil médical</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">
          Profil sauvegardé avec succès !
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Informations générales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Âge</label>
              <input type="number" min="10" max="120" required className="input-field"
                value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="Ex: 35" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
              <select className="input-field" value={form.sexe} onChange={(e) => setForm({ ...form, sexe: e.target.value })}>
                <option value="M">Homme</option>
                <option value="F">Femme</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poids (kg)</label>
              <input type="number" min="20" max="300" step="0.1" required className="input-field"
                value={form.poids_kg} onChange={(e) => setForm({ ...form, poids_kg: e.target.value })} placeholder="Ex: 72.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taille (cm)</label>
              <input type="number" min="100" max="250" required className="input-field"
                value={form.taille_cm} onChange={(e) => setForm({ ...form, taille_cm: e.target.value })} placeholder="Ex: 175" />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Niveau d'activité physique</h2>
          <div className="space-y-2">
            {ACTIVITES.map((a) => (
              <label key={a.value} className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="activite" value={a.value}
                  checked={form.activite === a.value} onChange={() => setForm({ ...form, activite: a.value })}
                  className="text-primary-600" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{a.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-2">Conditions médicales</h2>
          <p className="text-xs text-gray-500 mb-4">Cochez les conditions qui s'appliquent à vous.</p>
          <div className="space-y-2">
            {CONDITIONS.map((c) => (
              <label key={c.value} className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={form.conditions.includes(c.value)}
                  onChange={() => toggleCondition(c.value)} className="rounded text-primary-600" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Sauvegarde...' : 'Sauvegarder le profil'}
        </button>
      </form>
    </div>
  )
}
