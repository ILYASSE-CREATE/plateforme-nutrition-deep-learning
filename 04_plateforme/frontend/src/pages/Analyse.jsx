import React, { useState, useRef, useCallback } from 'react'
import client from '../api/client'

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100)
  const color = pct > 80 ? 'bg-green-500' : pct > 60 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8">{pct}%</span>
    </div>
  )
}

function NutrientRow({ label, value, unit }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-medium text-sm">{value} <span className="text-gray-400 font-normal">{unit}</span></span>
    </div>
  )
}

export default function Analyse() {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [recoLoading, setRecoLoading] = useState(false)
  const [reco, setReco] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setReco(null)
    setError('')
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const handleAnalyse = async () => {
    if (!image) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('image', image)
      const res = await client.post('/analyse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'analyse")
    } finally {
      setLoading(false)
    }
  }

  const handleRecommandation = async () => {
    if (!result) return
    setRecoLoading(true)
    try {
      const res = await client.post('/recommandation', { aliments: result.aliments })
      setReco(res.data)
      await client.post('/historique', {
        image_path: result.image_path,
        aliments_detectes: result.aliments,
        nutriments_total: res.data.nutriments_repas,
        recommandation: res.data,
      }).catch(() => {})
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la recommandation')
    } finally {
      setRecoLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analyser un repas</h1>

      <div
        className={`card border-2 border-dashed cursor-pointer transition-colors ${
          dragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleFile(e.target.files[0])} />
        {preview ? (
          <div className="text-center">
            <img src={preview} alt="Aperçu" className="max-h-64 mx-auto rounded-lg object-contain" />
            <p className="text-sm text-gray-500 mt-2">{image?.name}</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📷</div>
            <p className="font-medium text-gray-700">Glissez une image ici</p>
            <p className="text-sm text-gray-400 mt-1">ou cliquez pour sélectionner</p>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG, WEBP — max 16 MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <div className="flex gap-3">
        <button onClick={handleAnalyse} disabled={!image || loading} className="btn-primary flex-1">
          {loading ? 'Analyse en cours...' : 'Analyser le repas'}
        </button>
        {result && (
          <button onClick={handleRecommandation} disabled={recoLoading} className="btn-secondary flex-1">
            {recoLoading ? 'Calcul...' : 'Obtenir des recommandations'}
          </button>
        )}
      </div>

      {result && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Aliments détectés</h2>
            {result.source === 'mock' && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Mode démonstration</span>
            )}
          </div>
          {result.aliments.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun aliment détecté</p>
          ) : (
            <div className="space-y-4">
              {result.aliments.map((a, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{a.classe}</span>
                    <ConfidenceBar value={a.confiance} />
                  </div>
                  {a.nutriments_100g && (
                    <div className="text-xs text-gray-500 grid grid-cols-3 gap-1 mt-2">
                      <span>{a.nutriments_100g.calories} kcal/100g</span>
                      <span>{a.nutriments_100g.proteines_g}g protéines</span>
                      <span>{a.nutriments_100g.glucides_g}g glucides</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {reco && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">Apports nutritionnels de ce repas</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <NutrientRow label="Calories" value={reco.nutriments_repas.calories} unit="kcal" />
                <NutrientRow label="Protéines" value={reco.nutriments_repas.proteines_g} unit="g" />
                <NutrientRow label="Glucides" value={reco.nutriments_repas.glucides_g} unit="g" />
                <NutrientRow label="Lipides" value={reco.nutriments_repas.lipides_g} unit="g" />
              </div>
              <div>
                <NutrientRow label="Sucres" value={reco.nutriments_repas.sucre_g} unit="g" />
                <NutrientRow label="Sel" value={reco.nutriments_repas.sel_g} unit="g" />
                <NutrientRow label="Fibres" value={reco.nutriments_repas.fibres_g} unit="g" />
              </div>
            </div>
          </div>

          {reco.couverture_pct && Object.keys(reco.couverture_pct).length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4">Couverture des besoins journaliers</h2>
              <div className="space-y-3">
                {Object.entries(reco.couverture_pct).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-600">{key}</span>
                      <span className="font-medium">{val}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${val > 100 ? 'bg-red-500' : val > 60 ? 'bg-yellow-500' : 'bg-primary-500'}`}
                        style={{ width: `${Math.min(val, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reco.conseils && reco.conseils.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-3">Recommandations personnalisées</h2>
              <ul className="space-y-2">
                {reco.conseils.map((conseil, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-primary-500 mt-0.5 flex-shrink-0">✓</span>
                    {conseil}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reco.evaluation_aliments && reco.evaluation_aliments.some((a) => !a.ok) && (
            <div className="card bg-red-50 border-red-200">
              <h2 className="font-semibold text-red-800 mb-3">Alertes médicales</h2>
              <ul className="space-y-2">
                {reco.evaluation_aliments.filter((a) => !a.ok).map((a, i) => (
                  <li key={i} className="text-sm text-red-700">
                    <span className="font-medium capitalize">{a.aliment}</span>: {a.alertes.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
