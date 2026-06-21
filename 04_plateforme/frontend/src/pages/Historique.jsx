import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

// ── Mini bar chart SVG ─────────────────────────────────────────────────────
function MiniBarChart({ values, color = '#22c55e', height = 48 }) {
  const max = Math.max(...values, 1)
  const W = 200, barW = 18, gap = (W - values.length * barW) / (values.length + 1)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full">
      {values.map((v, i) => {
        const bh = (v / max) * (height - 4)
        const x = gap + i * (barW + gap)
        return <rect key={i} x={x} y={height - bh} width={barW} height={bh} rx={4} fill={color} opacity={i === values.length - 1 ? 1 : 0.4} />
      })}
    </svg>
  )
}

// ── Nutri-Score badge ──────────────────────────────────────────────────────
const NS_BG = { A: 'bg-green-500', B: 'bg-lime-400', C: 'bg-yellow-400', D: 'bg-orange-400', E: 'bg-red-500' }
const NS_LABEL = { A: 'Excellent', B: 'Bon', C: 'Moyen', D: 'Mauvais', E: 'Très mauvais' }

function NsBadge({ ns }) {
  if (!ns || ns === 'N/A') return null
  return (
    <span className={`text-xs font-black text-white w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${NS_BG[ns] || 'bg-gray-400'}`}>{ns}</span>
  )
}

// ── Carte repas expandable ─────────────────────────────────────────────────
function RepasCard({ repas }) {
  const [open, setOpen] = useState(false)
  const date = new Date(repas.timestamp)
  const n = repas.nutriments_total || {}
  const aliments = repas.aliments || repas.aliments_detectes || []
  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const ns = repas.nutriscore

  const macros = [
    { label: 'Prot.', val: Math.round(n.proteines_g || 0), color: 'text-blue-500', bg: 'bg-blue-100' },
    { label: 'Gluc.', val: Math.round(n.glucides_g || 0), color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { label: 'Lip.', val: Math.round(n.lipides_g || 0), color: 'text-red-500', bg: 'bg-red-100' },
    { label: 'Fibr.', val: Math.round(n.fibres_g || 0), color: 'text-green-600', bg: 'bg-green-100' },
  ]

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${open ? 'border-green-200 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'}`}>
      {/* Header cliquable */}
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4 flex items-center gap-3">
        {/* Icône heure */}
        <div className="w-10 h-10 bg-green-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-green-600 leading-none">{heure.split(':')[0]}</span>
          <span className="text-xs text-green-400 leading-none">{heure.split(':')[1]}</span>
        </div>

        {/* Aliments */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate capitalize">
            {aliments.length > 0 ? aliments.map(a => a.nom || a.classe || a).join(', ') : 'Repas analysé'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-orange-500 font-medium">{Math.round(n.calories || 0)} kcal</span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">{aliments.length} aliment{aliments.length > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <NsBadge ns={ns} />
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Détails expandés */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          {/* Macros pills */}
          <div className="grid grid-cols-4 gap-2">
            {macros.map(({ label, val, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-2 text-center`}>
                <div className={`text-base font-bold ${color}`}>{val}g</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {/* Aliments détaillés */}
          {aliments.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-medium mb-2">Aliments détectés</p>
              <div className="space-y-1.5">
                {aliments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-gray-700 capitalize font-medium">{a.nom || a.classe || a}</span>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {a.poids_g && <span>{a.poids_g}g</span>}
                      {a.calories && <span className="text-orange-500 font-medium">{Math.round(a.calories)} kcal</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nutri-Score explication */}
          {ns && ns !== 'N/A' && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${NS_BG[ns]?.replace('bg-', 'bg-').replace('500', '50').replace('400', '50') || 'bg-gray-50'}`}>
              <NsBadge ns={ns} />
              <span className="text-xs font-medium text-gray-600">Nutri-Score {ns} — {NS_LABEL[ns]}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color, icon, trend }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{unit}</div>
      {trend !== undefined && (
        <div className={`text-xs font-medium mt-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs semaine dernière
        </div>
      )}
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function Historique() {
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtre, setFiltre] = useState('tout')
  const [search, setSearch] = useState('')
  const [vue, setVue] = useState('liste') // 'liste' | 'stats'

  useEffect(() => {
    client.get('/historique?limit=100')
      .then(res => setHistorique(res.data.historique || []))
      .catch(() => setError("Impossible de charger l'historique"))
      .finally(() => setLoading(false))
  }, [])

  // ── Statistiques ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (historique.length === 0) return null
    const today = new Date().toDateString()
    const todayMeals = historique.filter(r => new Date(r.timestamp).toDateString() === today)
    const totalCal = historique.reduce((s, r) => s + (r.nutriments_total?.calories || 0), 0)
    const avgCal = Math.round(totalCal / Math.max(new Set(historique.map(r => new Date(r.timestamp).toDateString())).size, 1))
    const nsCounts = {}
    historique.forEach(r => { if (r.nutriscore && r.nutriscore !== 'N/A') nsCounts[r.nutriscore] = (nsCounts[r.nutriscore] || 0) + 1 })
    const bestNs = Object.entries(nsCounts).sort((a, b) => 'ABCDE'.indexOf(a[0]) - 'ABCDE'.indexOf(b[0]))[0]

    // 7 derniers jours
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d
    })
    const weekCal = last7.map(day =>
      historique.filter(r => new Date(r.timestamp).toDateString() === day.toDateString())
        .reduce((s, r) => s + (r.nutriments_total?.calories || 0), 0)
    )
    const weekLabels = last7.map(d => d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3))

    return { todayMeals: todayMeals.length, avgCal, bestNs, nsCounts, weekCal, weekLabels }
  }, [historique])

  // ── Filtres ───────────────────────────────────────────────────────────
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const weekAgo = new Date(Date.now() - 7 * 86400000)

  const filtered = useMemo(() => {
    return historique.filter(r => {
      const d = new Date(r.timestamp)
      const ds = d.toDateString()
      if (filtre === 'aujourd') return ds === today
      if (filtre === 'hier') return ds === yesterday
      if (filtre === 'semaine') return d >= weekAgo
      return true
    }).filter(r => {
      if (!search) return true
      const aliments = r.aliments || r.aliments_detectes || []
      return aliments.some(a => (a.nom || a.classe || a).toLowerCase().includes(search.toLowerCase()))
    })
  }, [historique, filtre, search])

  // Grouper par jour
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(r => {
      const d = new Date(r.timestamp)
      const key = d.toDateString()
      if (!groups[key]) groups[key] = { date: d, repas: [] }
      groups[key].repas.push(r)
    })
    return Object.values(groups).sort((a, b) => b.date - a.date)
  }, [filtered])

  if (loading) return (
    <div className="flex items-center justify-center py-40 gap-3 text-gray-400">
      <div className="w-7 h-7 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">Chargement…</span>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-5">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique</h1>
          <p className="text-sm text-gray-400 mt-0.5">{historique.length} repas enregistrés</p>
        </div>
        {/* Toggle liste / stats */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {[
            { key: 'liste', label: 'Liste', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> },
            { key: 'stats', label: 'Stats', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setVue(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${vue === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {/* ── VUE STATS ── */}
      {vue === 'stats' && stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Repas aujourd'hui" value={stats.todayMeals} unit="repas" color="text-green-600"
              icon={<svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>} />
            <StatCard label="Moy. calories/jour" value={stats.avgCal} unit="kcal" color="text-orange-500"
              icon={<svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>} />
            <StatCard label="Nutri-Score dominant" value={stats.bestNs?.[0] || '–'} unit={NS_LABEL[stats.bestNs?.[0]] || ''} color={`text-${stats.bestNs?.[0] === 'A' ? 'green' : stats.bestNs?.[0] === 'B' ? 'lime' : 'yellow'}-500`}
              icon={<svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          </div>

          {/* Bar chart 7 jours */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Calories — 7 derniers jours</h3>
            <MiniBarChart values={stats.weekCal} color="#22c55e" height={80} />
            <div className="flex justify-between mt-1 px-1">
              {stats.weekLabels.map((l, i) => (
                <span key={i} className={`text-xs ${i === 6 ? 'text-green-600 font-bold' : 'text-gray-400'}`}>{l}</span>
              ))}
            </div>
          </div>

          {/* Distribution Nutri-Score */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribution Nutri-Score</h3>
            <div className="space-y-2">
              {Object.entries(stats.nsCounts).sort((a, b) => 'ABCDE'.indexOf(a[0]) - 'ABCDE'.indexOf(b[0])).map(([ns, count]) => {
                const pct = Math.round((count / historique.length) * 100)
                const colors = { A: 'bg-green-500', B: 'bg-lime-400', C: 'bg-yellow-400', D: 'bg-orange-400', E: 'bg-red-500' }
                return (
                  <div key={ns} className="flex items-center gap-3">
                    <span className={`text-xs font-black text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${colors[ns]}`}>{ns}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${colors[ns]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{count} repas</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── VUE LISTE ── */}
      {vue === 'liste' && (
        <>
          {/* Barre recherche + filtres */}
          <div className="space-y-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Rechercher un aliment…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'tout', label: `Tout (${historique.length})` },
                { key: 'aujourd', label: "Aujourd'hui" },
                { key: 'hier', label: 'Hier' },
                { key: 'semaine', label: '7 jours' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setFiltre(key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${filtre === key ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Liste groupée par jour */}
          {grouped.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm text-gray-400">Aucun repas trouvé</p>
              <Link to="/analyse" className="text-xs text-green-600 hover:underline mt-1 inline-block">Analyser un repas</Link>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(({ date, repas }) => {
                const ds = date.toDateString()
                const label = ds === today ? "Aujourd'hui" : ds === yesterday ? 'Hier' : date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                const totalCal = repas.reduce((s, r) => s + (r.nutriments_total?.calories || 0), 0)
                return (
                  <div key={ds}>
                    {/* Séparateur jour */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-px bg-gray-100" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 capitalize">{label}</span>
                        <span className="text-xs text-orange-400 font-medium bg-orange-50 px-2 py-0.5 rounded-full">{Math.round(totalCal)} kcal</span>
                      </div>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <div className="space-y-2">
                      {repas.map(r => <RepasCard key={r.id} repas={r} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}