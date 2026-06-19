import React, { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import client from '../api/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

function StatCard({ label, value, unit, color }) {
  return (
    <div className="card text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{unit}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const [historique, setHistorique] = useState([])
  const [besoins, setBesoins] = useState(null)
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    Promise.all([
      client.get('/historique?limit=30'),
      client.get('/profil'),
    ]).then(([hRes, pRes]) => {
      setHistorique(hRes.data.historique || [])
      const profil = pRes.data.profil
      if (profil) {
        client.post('/recommandation', { aliments: [], profil })
          .then((r) => setBesoins(r.data.besoins_journaliers))
          .catch(() => {})
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const today = new Date().toDateString()
  const todayMeals = historique.filter((r) => new Date(r.timestamp).toDateString() === today)
  const todayNutrients = todayMeals.reduce(
    (acc, r) => {
      const n = r.nutriments_total || {}
      return {
        calories: acc.calories + (n.calories || 0),
        proteines: acc.proteines + (n.proteines_g || 0),
        glucides: acc.glucides + (n.glucides_g || 0),
        lipides: acc.lipides + (n.lipides_g || 0),
      }
    },
    { calories: 0, proteines: 0, glucides: 0, lipides: 0 }
  )

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })

  const weeklyCalories = last7.map((day) => {
    const dayStr = day.toDateString()
    return historique
      .filter((r) => new Date(r.timestamp).toDateString() === dayStr)
      .reduce((sum, r) => sum + (r.nutriments_total?.calories || 0), 0)
  })

  const weekLabels = last7.map((d) =>
    d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
  )

  const barData = {
    labels: ['Calories', 'Protéines (g)', 'Glucides (g)', 'Lipides (g)'],
    datasets: [
      {
        label: "Aujourd'hui",
        data: [
          Math.round(todayNutrients.calories),
          Math.round(todayNutrients.proteines),
          Math.round(todayNutrients.glucides),
          Math.round(todayNutrients.lipides),
        ],
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: 'rgb(22, 163, 74)',
        borderWidth: 1,
      },
      ...(besoins ? [{
        label: 'Besoins journaliers',
        data: [besoins.calories, besoins.proteines_g, besoins.glucides_g, besoins.lipides_g],
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      }] : []),
    ],
  }

  const lineData = {
    labels: weekLabels,
    datasets: [
      {
        label: 'Calories consommées',
        data: weeklyCalories,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      ...(besoins ? [{
        label: 'Objectif calorique',
        data: Array(7).fill(besoins.calories),
        borderColor: 'rgb(239, 68, 68)',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      }] : []),
    ],
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500">Bonjour, {user.email?.split('@')[0]}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Calories" value={Math.round(todayNutrients.calories)} unit="kcal aujourd'hui" color="text-orange-500" />
        <StatCard label="Protéines" value={Math.round(todayNutrients.proteines)} unit="g aujourd'hui" color="text-blue-500" />
        <StatCard label="Glucides" value={Math.round(todayNutrients.glucides)} unit="g aujourd'hui" color="text-yellow-500" />
        <StatCard label="Lipides" value={Math.round(todayNutrients.lipides)} unit="g aujourd'hui" color="text-red-500" />
      </div>

      {todayMeals.length === 0 && (
        <div className="card text-center text-gray-400 py-8">
          <p>Aucun repas enregistré aujourd'hui.</p>
          <p className="text-sm mt-1">
            <a href="/analyse" className="text-primary-600 hover:underline">Analysez votre premier repas</a>
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Apports vs besoins journaliers</h2>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Tendance calorique (7 jours)</h2>
          <Line data={lineData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>
    </div>
  )
}
