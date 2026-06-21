import React, { useState } from 'react'
import { Search, Package, AlertTriangle } from 'lucide-react'
import client from '../api/client'

function NutrientBar({ label, value, max, color, unit }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>
          {value} <span className="text-gray-400 font-normal text-xs">{unit}</span>
        </span>
      </div>
      <div className="bg-gray-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

const EXEMPLES = [
  { code: '3017620422003', label: 'Nutella' },
  { code: '7622210449283', label: 'Oreo' },
  { code: '5449000000996', label: 'Coca-Cola' },
]

export default function Barcode() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (searchCode) => {
    const c = searchCode || code
    if (!c.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await client.get(`/barcode/${c.trim()}`)
      setResult(res.data)
      setCode(c.trim())
    } catch (err) {
      setError(err.response?.data?.error || 'Produit non trouvé')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Code-barres</h1>
        <p className="text-gray-400 text-sm mt-1">Recherchez les valeurs nutritionnelles d'un produit emballé</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm bg-white placeholder-gray-400"
              placeholder="Entrez un code-barres (ex: 3017620422003)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading || !code.trim()}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm whitespace-nowrap"
          >
            <Search size={15} />
            Rechercher
          </button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400">Exemples :</span>
          {EXEMPLES.map((ex) => (
            <button
              key={ex.code}
              onClick={() => handleSearch(ex.code)}
              className="text-xs bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 text-gray-500 border border-gray-100 px-3 py-1 rounded-full transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Recherche du produit...</p>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex gap-4 mb-6 pb-6 border-b border-gray-50">
            {result.image ? (
              <img
                src={result.image}
                alt={result.nom}
                className="w-20 h-20 object-contain rounded-xl border border-gray-100 bg-gray-50 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package size={28} className="text-gray-200" />
              </div>
            )}
            <div>
              <h2 className="font-bold text-gray-900 text-lg leading-tight">{result.nom}</h2>
              {result.marque && <p className="text-emerald-600 font-medium text-sm mt-1">{result.marque}</p>}
              {result.quantite && <p className="text-gray-400 text-sm mt-0.5">{result.quantite}</p>}
              <p className="text-gray-300 text-xs mt-2 font-mono">{result.code}</p>
            </div>
          </div>

          <h3 className="font-bold text-gray-800 text-sm mb-5">Valeurs nutritionnelles — pour 100g</h3>
          <div className="space-y-4">
            <NutrientBar label="Calories" value={result.nutriments.calories} max={900} color="#f97316" unit="kcal" />
            <NutrientBar label="Protéines" value={result.nutriments.proteines_g} max={50} color="#3b82f6" unit="g" />
            <NutrientBar label="Glucides" value={result.nutriments.glucides_g} max={100} color="#f59e0b" unit="g" />
            <NutrientBar label="dont Sucres" value={result.nutriments.sucre_g} max={100} color="#ec4899" unit="g" />
            <NutrientBar label="Lipides" value={result.nutriments.lipides_g} max={100} color="#ef4444" unit="g" />
            <NutrientBar label="Fibres" value={result.nutriments.fibres_g} max={30} color="#10b981" unit="g" />
            <NutrientBar label="Sel" value={result.nutriments.sel_g} max={6} color="#6b7280" unit="g" />
          </div>
        </div>
      )}
    </div>
  )
}
