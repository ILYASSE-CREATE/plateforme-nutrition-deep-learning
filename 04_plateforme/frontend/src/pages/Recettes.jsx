import React, { useState, useEffect } from 'react'
import client from '../api/client'

const RECETTE_COVERS = {
  'Tajine de poulet aux olives': '/recettes/tajine-poulet.jpg',
  'Harira': '/recettes/harira.jpg',
  'Couscous aux légumes': '/recettes/couscous-legumes.jpg',
  'Pastilla au poulet': '/recettes/pastilla.jpg',
  'Zaalouk d\'aubergines': '/recettes/zaalouk.jpg',
  'Briouates au fromage': '/recettes/briouates.jpg',
  'Tajine kefta tomates': '/recettes/tajine-kefta.jpg',
  'Mrouzia': '/recettes/mrouzia.jpg',
  'Salade marocaine': '/recettes/salade-marocaine.jpg',
  'Bissara': '/recettes/bissara.jpg',
  'Seffa au poulet': '/recettes/seffa.jpg',
  'Taktouka poivrons tomates': '/recettes/taktouka.jpg',
  'Couscous tfaya': '/recettes/couscous-tfaya.jpg',
  'Saumon aux légumes vapeur': '/recettes/saumon.jpg',
  'Omelette aux champignons': '/recettes/omelette.jpg',
  'Salade de pois chiches': '/recettes/pois-chiches.jpg',
  'Poulet grillé aux herbes': '/recettes/poulet-herbes.jpg',
  'Soupe de lentilles': '/recettes/soupe-lentilles.jpg',
  'Filet de cabillaud citron': '/recettes/cabillaud.jpg',
  'Smoothie bowl açaï': '/recettes/smoothie-bowl.jpg',
}
const DEFAULT_PHOTO = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80'
const NS_COLOR = { A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', E: '#ef4444' }

function TagCompat({ compatible }) {
  return compatible ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      Compatible
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
      Déconseillé
    </span>
  )
}

function RecetteCard({ recette }) {
  const [open, setOpen] = useState(false)
  const photo = RECETTE_COVERS[recette.nom] || DEFAULT_PHOTO
  const ns = recette.nutriscore

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 flex flex-col">

      {/* Photo */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={photo}
          alt={recette.nom}
          className="w-full h-full object-cover"
          onError={e => { e.currentTarget.src = DEFAULT_PHOTO }}
        />
        <div className="absolute inset-0 bg-black/25" />
        {/* Badge Nutri-Score */}
        {ns && ns !== 'N/A' && (
          <div className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black shadow-lg"
            style={{ background: NS_COLOR[ns] || '#9ca3af' }}>
            {ns}
          </div>
        )}
        {/* Badge compatible */}
        <div className="absolute top-3 left-3">
          <TagCompat compatible={recette.compatible} />
        </div>
        {/* Titre sur la photo */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/70 to-transparent">
          <h3 className="font-bold text-white text-sm leading-snug">{recette.nom}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-white/80">{recette.temps}</span>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-gray-500 mb-4 leading-relaxed flex-1">{recette.description}</p>

        {/* Macros */}
        <div className="grid grid-cols-4 gap-1 mb-4 bg-gray-50 rounded-xl p-3">
          {[
            { label: 'kcal', val: recette.calories, color: 'text-orange-500' },
            { label: 'Prot.', val: `${recette.proteines_g}g`, color: 'text-blue-500' },
            { label: 'Gluc.', val: `${recette.glucides_g}g`, color: 'text-yellow-500' },
            { label: 'Lip.', val: `${recette.lipides_g}g`, color: 'text-red-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center">
              <div className={`text-sm font-bold ${color}`}>{val}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Ingrédients toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-green-600 transition-colors border-t border-gray-100 pt-3"
        >
          <span className="font-medium">Voir les ingrédients</span>
          <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recette.ingredients?.map((ing, i) => (
              <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full">
                {ing}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

export default function Recettes() {
  const [recettes, setRecettes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtre, setFiltre] = useState('toutes')
  const [search, setSearch] = useState('')

  useEffect(() => {
    client.get('/recettes')
      .then(res => setRecettes(Array.isArray(res.data) ? res.data : res.data.recettes || []))
      .catch(() => setError('Impossible de charger les recettes'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = recettes.filter(r => {
    const matchFiltre = filtre === 'toutes' || (filtre === 'ok' ? r.compatible : !r.compatible)
    return matchFiltre && r.nom.toLowerCase().includes(search.toLowerCase())
  })

  const nbOk = recettes.filter(r => r.compatible).length

  if (loading) return (
    <div className="flex items-center justify-center py-40 gap-3 text-gray-400">
      <div className="w-7 h-7 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">Chargement…</span>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recettes</h1>
        <p className="text-sm text-gray-400 mt-1">{nbOk} recette{nbOk > 1 ? 's' : ''} adaptée{nbOk > 1 ? 's' : ''} à votre profil</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Rechercher une recette…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'toutes', label: `Toutes (${recettes.length})` },
            { key: 'ok', label: `Compatible (${nbOk})` },
            { key: 'nok', label: `Autres (${recettes.length - nbOk})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltre(key)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${filtre === key ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-300">
          <svg className="w-14 h-14 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
          <p className="text-sm text-gray-400">Aucune recette trouvée</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(r => <RecetteCard key={r.id} recette={r} />)}
        </div>
      )}
    </div>
  )
}

