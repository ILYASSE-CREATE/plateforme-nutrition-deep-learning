import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

function DonutRing({ value, max, color, size = 140, strokeWidth = 14 }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / (max || 1), 1)
  const filled = pct * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,2,.6,1)' }} />
    </svg>
  )
}

function MacroBar({ label, value, max, color, unit }) {
  const pct = Math.min((value / (max || 1)) * 100, 100)
  const over = value > max
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className={over ? 'text-red-500 font-bold' : 'text-gray-600'}>{Math.round(value)}/{max} {unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-red-400' : color}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function WeekBarChart({ data, labels, objectif }) {
  const maxVal = Math.max(...data, objectif || 1, 1)
  const W = 320, H = 80, barW = 28, gap = (W - data.length * barW) / (data.length + 1)
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full">
      {data.map((v, i) => {
        const x = gap + i * (barW + gap)
        const barH = (v / maxVal) * H
        const y = H - barH
        const isToday = i === data.length - 1
        const over = v > (objectif || Infinity)
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={6}
              fill={isToday ? '#22c55e' : over ? '#fca5a5' : '#d1fae5'} />
            {isToday && v > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fill="#16a34a" fontWeight="bold">
                {Math.round(v)}
              </text>
            )}
            <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize="9" fill="#9ca3af">
              {labels[i]}
            </text>
          </g>
        )
      })}
      {objectif && (
        <line x1={0} y1={H - (objectif / maxVal) * H} x2={W} y2={H - (objectif / maxVal) * H}
          stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
      )}
    </svg>
  )
}

function HydrationTracker({ glasses, setGlasses }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <span className="text-sm font-semibold text-blue-700">Hydratation</span>
        </div>
        <span className="text-xs text-blue-500">{glasses * 250} ml / 2000 ml</span>
      </div>
      <div className="flex gap-1.5 mb-2">
        {Array.from({ length: 8 }, (_, i) => (
          <button key={i} onClick={() => setGlasses(i < glasses ? i : i + 1)}
            className={`flex-1 h-7 rounded-lg transition-all duration-200 ${i < glasses ? 'bg-blue-400 shadow-sm' : 'bg-blue-100'}`} />
        ))}
      </div>
      <p className="text-xs text-blue-400 text-center">
        {glasses === 0 ? "Commence à boire !" : glasses < 4 ? 'Continue !' : glasses < 8 ? 'Bon rythme !' : 'Objectif atteint !'}
      </p>
    </div>
  )
}

function NutriScoreSummary({ meals }) {
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  meals.forEach(m => { if (m.nutriscore && m.nutriscore !== 'N/A') counts[m.nutriscore]++ })
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const colors = { A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', E: '#ef4444' }
  if (total === 0) return null
  return (
    <div className="flex gap-1 h-3 rounded-full overflow-hidden w-full mt-3">
      {Object.entries(counts).map(([k, v]) => v > 0 && (
        <div key={k} style={{ flex: v, background: colors[k] }} title={`${k}: ${v} repas`} />
      ))}
    </div>
  )
}

function useStreak(historique) {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const ds = d.toDateString()
    const hasMeal = historique.some(r => new Date(r.timestamp).toDateString() === ds)
    if (hasMeal) streak++
    else if (i > 0) break
  }
  return streak
}

const NS_BG = { A: 'bg-green-500', B: 'bg-lime-400', C: 'bg-yellow-400', D: 'bg-orange-400', E: 'bg-red-500' }

const CONSEILS = [
  "Boire 2L d'eau par jour améliore la digestion et l'énergie.",
  "Les protéines le matin réduisent les fringales de 60%.",
  "Manger lentement permet de mieux ressentir la satiété.",
  "Les légumes verts sont riches en fer et en fibres.",
  "Une collation de noix apporte de bons acides gras.",
  "Le petit-déjeuner active le métabolisme dès le matin.",
  "Les fibres alimentaires nourrissent votre microbiote intestinal.",
]

export default function Dashboard() {
  const [historique, setHistorique] = useState([])
  const [besoins, setBesoins] = useState(null)
  const [profil, setProfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [glasses, setGlasses] = useState(() => parseInt(localStorage.getItem('water_glasses') || '0'))

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()
  const prenom = user.email?.split('@')[0] || 'Utilisateur'
  const now = new Date()
  const heure = now.getHours()
  const salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const conseil = CONSEILS[now.getDay() % CONSEILS.length]

  useEffect(() => { localStorage.setItem('water_glasses', glasses) }, [glasses])

  useEffect(() => {
    const lastDate = localStorage.getItem('water_date')
    const todayStr = now.toDateString()
    if (lastDate !== todayStr) {
      setGlasses(0)
      localStorage.setItem('water_date', todayStr)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      client.get('/historique?limit=100'),
      client.get('/profil'),
    ]).then(([hRes, pRes]) => {
      setHistorique(hRes.data.historique || [])
      const p = pRes.data.profil
      setProfil(p)
      if (p) {
        client.get('/besoins')
          .then(r => setBesoins(r.data))
          .catch(() => { })
      }
    }).catch(() => { }).finally(() => setLoading(false))
  }, [])

  const today = now.toDateString()
  const todayMeals = historique.filter(r => new Date(r.timestamp).toDateString() === today)
  const totals = todayMeals.reduce(
    (acc, r) => {
      const n = r.nutriments_total || {}
      return {
        calories: acc.calories + (n.calories || 0),
        proteines: acc.proteines + (n.proteines_g || 0),
        glucides: acc.glucides + (n.glucides_g || 0),
        lipides: acc.lipides + (n.lipides_g || 0),
        fibres: acc.fibres + (n.fibres_g || 0),
      }
    },
    { calories: 0, proteines: 0, glucides: 0, lipides: 0, fibres: 0 }
  )

  const streak = useStreak(historique)

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d
  })
  const weeklyCalories = last7.map(day =>
    historique.filter(r => new Date(r.timestamp).toDateString() === day.toDateString())
      .reduce((s, r) => s + (r.nutriments_total?.calories || 0), 0)
  )
  const weekLabels = last7.map(d => d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3))

  const objCal = besoins?.calories || 2000
  const calPct = Math.round((totals.calories / objCal) * 100)
  const calRestantes = Math.max(objCal - totals.calories, 0)
  const recentMeals = [...todayMeals].reverse().slice(0, 4)

  const bmi = profil?.poids_kg && profil?.taille_cm
    ? (profil.poids_kg / Math.pow(profil.taille_cm / 100, 2)).toFixed(1)
    : null
  const bmiLabel = !bmi ? '' : bmi < 18.5 ? 'Insuffisant' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Surpoids' : 'Obésité'
  const bmiColor = !bmi ? '' : bmi < 18.5 ? 'text-blue-500' : bmi < 25 ? 'text-green-500' : bmi < 30 ? 'text-yellow-500' : 'text-red-500'

  if (loading) return (
    <div className="flex items-center justify-center py-40 gap-3 text-gray-400">
      <div className="w-7 h-7 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">Chargement…</span>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10">

      {/* En-tête */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{salutation}, <span className="text-green-600">{prenom}</span></h1>
          <p className="text-sm text-gray-400 capitalize mt-0.5">{dateStr}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-sm font-semibold border border-orange-100">
              🔥 {streak} jour{streak > 1 ? 's' : ''} de suite
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
            📋 {todayMeals.length} repas
          </div>
        </div>
      </div>

      {/* Conseil du jour */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-lg">💡</div>
        <div>
          <p className="text-xs text-white/70 font-medium">Conseil du jour</p>
          <p className="text-sm text-white font-medium">{conseil}</p>
        </div>
      </div>

      {/* Donut + Macros */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 self-start">Calories aujourd'hui</h2>
          <div className="relative">
            <DonutRing value={totals.calories} max={objCal} color={calPct > 100 ? '#ef4444' : '#22c55e'} size={160} strokeWidth={16} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${calPct > 100 ? 'text-red-500' : 'text-gray-800'}`}>{Math.round(totals.calories)}</span>
              <span className="text-xs text-gray-400">kcal</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full mt-4">
            <div className="text-center bg-gray-50 rounded-xl p-2">
              <div className="text-sm font-bold text-gray-700">{objCal}</div>
              <div className="text-xs text-gray-400">Objectif</div>
            </div>
            <div className="text-center bg-green-50 rounded-xl p-2">
              <div className={`text-sm font-bold ${calPct > 100 ? 'text-red-500' : 'text-green-600'}`}>
                {calPct > 100 ? `+${Math.round(totals.calories - objCal)}` : Math.round(calRestantes)}
              </div>
              <div className="text-xs text-gray-400">{calPct > 100 ? 'Dépassé' : 'Restantes'}</div>
            </div>
          </div>
          {todayMeals.length > 0 && <NutriScoreSummary meals={todayMeals} />}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Répartition des macronutriments</h2>
          <div className="space-y-4">
            <MacroBar label="Protéines" value={totals.proteines} max={besoins?.proteines_g || 64} color="bg-blue-400" unit="g" />
            <MacroBar label="Glucides" value={totals.glucides} max={besoins?.glucides_g || 291} color="bg-yellow-400" unit="g" />
            <MacroBar label="Lipides" value={totals.lipides} max={besoins?.lipides_g || 78} color="bg-red-400" unit="g" />
            <MacroBar label="Fibres" value={totals.fibres} max={25} color="bg-green-400" unit="g" />
          </div>
          <div className="mt-5 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400 mb-2">Répartition énergétique</p>
            <div className="flex gap-4">
              {[
                { label: 'Protéines', kcal: totals.proteines * 4, color: 'bg-blue-400' },
                { label: 'Glucides', kcal: totals.glucides * 4, color: 'bg-yellow-400' },
                { label: 'Lipides', kcal: totals.lipides * 9, color: 'bg-red-400' },
              ].map(({ label, kcal, color }) => {
                const pct = totals.calories > 0 ? Math.round((kcal / totals.calories) * 100) : 0
                return (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-xs text-gray-500">{label} <span className="font-semibold text-gray-700">{pct}%</span></span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tendance + Hydratation + IMC */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Tendance calorique — 7 jours</h2>
            <Link to="/historique" className="text-xs text-green-600 hover:underline">Détails</Link>
          </div>
          <WeekBarChart data={weeklyCalories} labels={weekLabels} objectif={objCal} />
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-400" />
              <span className="text-xs text-gray-400">Aujourd'hui</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1 border-t-2 border-dashed border-red-400" />
              <span className="text-xs text-gray-400">Objectif</span>
            </div>
            <div className="ml-auto text-xs text-gray-400">
              Moy. {Math.round(weeklyCalories.reduce((a, b) => a + b, 0) / 7)} kcal/j
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <HydrationTracker glasses={glasses} setGlasses={setGlasses} />
          {bmi && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-purple-500">⚖️</span>
                <span className="text-sm font-semibold text-gray-700">IMC</span>
              </div>
              <div className={`text-3xl font-black ${bmiColor}`}>{bmi}</div>
              <div className={`text-xs font-medium mt-0.5 ${bmiColor}`}>{bmiLabel}</div>
              <div className="mt-2 h-2 bg-gradient-to-r from-blue-300 via-green-400 via-yellow-400 to-red-500 rounded-full relative">
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-gray-700 rounded-full shadow"
                  style={{ left: `${Math.min(Math.max((bmi - 15) / 25 * 100, 0), 100)}%`, transform: 'translateX(-50%) translateY(-50%)' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>15</span><span>25</span><span>30</span><span>40</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Repas du jour */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-800">Repas d'aujourd'hui</h2>
          <Link to="/historique" className="text-xs text-green-600 hover:underline font-medium">Voir tout</Link>
        </div>
        {recentMeals.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400">Aucun repas enregistré aujourd'hui</p>
            <Link to="/analyse" className="text-xs text-green-600 hover:underline mt-1 inline-block font-medium">
              Analyser mon premier repas
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentMeals.map((repas, i) => {
              const n = repas.nutriments_total || {}
              const ns = repas.nutriscore
              const h = new Date(repas.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              const aliments = repas.aliments?.map(a => a.nom || a.classe).join(', ') || 'Repas'
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">🍽️</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate capitalize">{aliments}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{h}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-orange-500 font-medium">{Math.round(n.calories || 0)} kcal</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-blue-400">{Math.round(n.proteines_g || 0)}g prot</span>
                    </div>
                  </div>
                  {ns && ns !== 'N/A' && (
                    <span className={`text-xs font-black text-white w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${NS_BG[ns] || 'bg-gray-400'}`}>{ns}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}