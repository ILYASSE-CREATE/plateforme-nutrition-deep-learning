import React, { useState } from 'react'
import client from '../api/client'

function NutrientRow({ label, value, unit }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-medium text-sm">{value} <span className="text-gray-400 font-normal">{unit}</span></span>
    </div>
  )
}

export default function Barcode() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await client.get(`/barcode/${code.trim()}`)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Produit non trouvé')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Scanner un code-barres</h1>

      <div className="card">
        <p className="text-sm text-gray-500 mb-4">
          Entrez le code-barres d'un produit emballé pour obtenir ses informations nutritionnelles.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            className="input-field"
            placeholder="Ex: 3017620422003 (Nutella)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !code.trim()}
            className="btn-primary whitespace-nowrap"
          >
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {result && (
        <div className="card">
          <div className="flex gap-4 mb-4">
            {result.image && (
              <img src={result.image} alt={result.nom} className="w-24 h-24 object-contain rounded-lg border border-gray-100" />
            )}
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{result.nom}</h2>
              {result.marque && <p className="text-sm text-gray-500">{result.marque}</p>}
              {result.quantite && <p className="text-sm text-gray-400">{result.quantite}</p>}
              <p className="text-xs text-gray-400 mt-1">Code : {result.code}</p>
            </div>
          </div>

          <h3 className="font-semibold text-gray-800 mb-3">Valeurs nutritionnelles pour 100g</h3>
          <NutrientRow label="Calories" value={result.nutriments_100g.calories} unit="kcal" />
          <NutrientRow label="Protéines" value={result.nutriments_100g.proteines_g} unit="g" />
          <NutrientRow label="Glucides" value={result.nutriments_100g.glucides_g} unit="g" />
          <NutrientRow label="Lipides" value={result.nutriments_100g.lipides_g} unit="g" />
          <NutrientRow label="Sucres" value={result.nutriments_100g.sucre_g} unit="g" />
          <NutrientRow label="Sel" value={result.nutriments_100g.sel_g} unit="g" />
          <NutrientRow label="Fibres" value={result.nutriments_100g.fibres_g} unit="g" />
        </div>
      )}
    </div>
  )
}
