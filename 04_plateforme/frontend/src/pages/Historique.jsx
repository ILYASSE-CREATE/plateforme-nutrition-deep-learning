import React, { useState, useEffect } from 'react'
import client from '../api/client'

function RepasCard({ repas }) {
  const date = new Date(repas.timestamp)
  const n = repas.nutriments_total || {}
  const aliments = repas.aliments_detectes || []

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-medium text-gray-900">
            {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="text-sm text-gray-400">
            {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {n.calories > 0 && (
          <div className="text-right">
            <div className="font-bold text-orange-500">{Math.round(n.calories)} kcal</div>
          </div>
        )}
      </div>

      {aliments.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {aliments.map((a, i) => (
            <span key={i} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full capitalize">
              {a.classe || a}
            </span>
          ))}
        </div>
      )}

      {(n.proteines_g || n.glucides_g || n.lipides_g) && (
        <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-100 pt-3">
          <div>
            <div className="text-sm font-medium text-blue-600">{Math.round(n.proteines_g || 0)}g</div>
            <div className="text-xs text-gray-400">Protéines</div>
          </div>
          <div>
            <div className="text-sm font-medium text-yellow-600">{Math.round(n.glucides_g || 0)}g</div>
            <div className="text-xs text-gray-400">Glucides</div>
          </div>
          <div>
            <div className="text-sm font-medium text-red-500">{Math.round(n.lipides_g || 0)}g</div>
            <div className="text-xs text-gray-400">Lipides</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Historique() {
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    client.get('/historique?limit=50')
      .then((res) => setHistorique(res.data.historique || []))
      .catch(() => setError('Impossible de charger l\'historique'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Chargement...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Historique des repas</h1>
        <span className="text-sm text-gray-400">{historique.length} repas</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {historique.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="font-medium">Aucun repas enregistré</p>
          <p className="text-sm mt-2">
            <a href="/analyse" className="text-primary-600 hover:underline">Analysez votre premier repas</a>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {historique.map((repas) => (
            <RepasCard key={repas.id} repas={repas} />
          ))}
        </div>
      )}
    </div>
  )
}
