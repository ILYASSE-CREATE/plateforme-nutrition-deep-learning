import React, { useState, useEffect } from 'react'
import client from '../api/client'

function RecetteCard({ recette }) {
  return (
    <div className={`card hover:shadow-md transition-shadow ${!recette.compatible ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{recette.image}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{recette.nom}</h3>
            <p className="text-xs text-gray-400">⏱ {recette.temps}</p>
          </div>
        </div>
        {recette.compatible ? (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ Compatible</span>
        ) : (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">✗ Déconseillé</span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-3">{recette.description}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {recette.ingredients.map((ing, i) => (
          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ing}</span>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center border-t border-gray-100 pt-3">
        <div>
          <div className="text-sm font-bold text-orange-500">{recette.calories}</div>
          <div className="text-xs text-gray-400">kcal</div>
        </div>
        <div>
          <div className="text-sm font-bold text-blue-500">{recette.proteines_g}g</div>
          <div className="text-xs text-gray-400">Protéines</div>
        </div>
        <div>
          <div className="text-sm font-bold text-yellow-500">{recette.glucides_g}g</div>
          <div className="text-xs text-gray-400">Glucides</div>
        </div>
        <div>
          <div className="text-sm font-bold text-red-500">{recette.lipides_g}g</div>
          <div className="text-xs text-gray-400">Lipides</div>
        </div>
      </div>
    </div>
  )
}

export default function Recettes() {
  const [recettes, setRecettes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    client.get('/recettes')
      .then((res) => setRecettes(res.data.recettes || []))
      .catch(() => setError('Impossible de charger les recettes'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Chargement...</div>

  const compatibles = recettes.filter((r) => r.compatible)
  const incompatibles = recettes.filter((r) => !r.compatible)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Recettes recommandées</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {compatibles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-green-700 mb-3">✓ Recettes compatibles avec votre profil ({compatibles.length})</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {compatibles.map((r) => <RecetteCard key={r.id} recette={r} />)}
          </div>
        </div>
      )}

      {incompatibles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-red-700 mb-3">✗ Recettes déconseillées ({incompatibles.length})</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {incompatibles.map((r) => <RecetteCard key={r.id} recette={r} />)}
          </div>
        </div>
      )}
    </div>
  )
}
