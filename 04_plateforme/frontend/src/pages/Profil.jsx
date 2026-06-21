import { useState, useEffect } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:5000'

const ACTIVITE_OPTIONS = [
  { value: 'sedentaire', label: 'Sédentaire', coeff: 1.2, desc: "Peu ou pas d'exercice" },
  { value: 'leger', label: 'Légèrement actif', coeff: 1.375, desc: '1–3 jours/semaine' },
  { value: 'modere', label: 'Modérément actif', coeff: 1.55, desc: '3–5 jours/semaine' },
  { value: 'actif', label: 'Très actif', coeff: 1.725, desc: '6–7 jours/semaine' },
  { value: 'tres_actif', label: 'Extrêmement actif', coeff: 1.9, desc: 'Sport intense quotidien' },
]

const PATHOLOGIE_OPTIONS = [
  {
    id: "diabete", label: "Diabète",
    description: "Maladie métabolique caractérisée par un excès de glucose dans le sang.",
    types: ["Type 1 — auto-immun", "Type 2 — résistance à l'insuline", "Gestationnel"],
    recommandations: "Privilégier les aliments à faible index glycémique. Fractionner les repas. Limiter les sucres rapides.",
    ok: ["Légumes verts", "Légumineuses", "Poisson", "Céréales complètes", "Yaourt nature"],
    eviter: ["Sucre blanc", "Sodas", "Pain blanc", "Pâtisseries", "Riz blanc en excès"],
  },
  {
    id: "hypertension", label: "Hypertension",
    description: "Pression artérielle chroniquement élevée, facteur de risque cardiovasculaire majeur.",
    types: ["Primaire (essentielle)", "Secondaire (cause identifiable)"],
    recommandations: "Réduire le sel à moins de 5g/jour. Augmenter potassium et magnésium. Éviter l'alcool.",
    ok: ["Banane", "Épinards", "Avocat", "Poisson gras", "Légumes frais"],
    eviter: ["Sel en excès", "Charcuterie", "Plats industriels", "Fromage salé", "Café en excès"],
  },
  {
    id: "obesite", label: "Obésité",
    description: "Excès de masse grasse avec IMC ≥ 30, associé à de nombreuses comorbidités.",
    types: ["Obésité modérée (IMC 30-35)", "Obésité sévère (IMC 35-40)", "Obésité morbide (IMC > 40)"],
    recommandations: "Déficit calorique modéré. Augmenter les protéines et fibres. Réduire les graisses saturées.",
    ok: ["Légumes", "Protéines maigres", "Fruits entiers", "Eau", "Céréales complètes"],
    eviter: ["Fast-food", "Boissons sucrées", "Graisses trans", "Alcool", "Grignotage"],
  },
  {
    id: "insuffisance_renale", label: "Insuffisance rénale",
    description: "Réduction progressive de la capacité des reins à filtrer le sang.",
    types: ["Aiguë (réversible)", "Chronique (progressive)", "Terminale (dialyse)"],
    recommandations: "Limiter protéines, potassium, phosphore et sel. Contrôler les apports en liquides.",
    ok: ["Riz blanc", "Pain blanc", "Pomme", "Chou", "Huile d'olive"],
    eviter: ["Banane", "Orange", "Tomate", "Produits laitiers en excès", "Sel", "Viande en excès"],
  },
  {
    id: "cholesterol", label: "Cholestérol élevé",
    description: "Excès de cholestérol LDL dans le sang, facteur de risque cardiovasculaire.",
    types: ["Hypercholestérolémie primaire (génétique)", "Secondaire (alimentation, mode de vie)"],
    recommandations: "Réduire les graisses saturées et trans. Augmenter les fibres solubles et oméga-3.",
    ok: ["Poisson gras", "Avocat", "Noix", "Légumes verts", "Huile d'olive", "Flocons d'avoine"],
    eviter: ["Beurre", "Viandes grasses", "Friture", "Charcuterie", "Pâtisseries industrielles"],
  },
  {
    id: "anemie", label: "Anémie",
    description: "Diminution du taux d'hémoglobine, entraînant fatigue et manque d'oxygénation.",
    types: ["Carence en fer (la plus fréquente)", "Carence en B12", "Carence en folates"],
    recommandations: "Augmenter les apports en fer et vitamine C. Éviter le thé/café pendant les repas.",
    ok: ["Viande rouge", "Foie", "Épinards", "Lentilles", "Dattes", "Œufs", "Agrumes"],
    eviter: ["Thé pendant les repas", "Café", "Calcium en excès avec le fer", "Alcool"],
  },
]

function getBMI(poids, taille) {
  if (!poids || !taille) return null
  return (poids / ((taille / 100) ** 2)).toFixed(1)
}

function getBMIInfo(bmi) {
  if (!bmi) return { label: '—', color: '#9ca3af', bg: '#e5e7eb', w: '0%' }
  const v = parseFloat(bmi)
  if (v < 18.5) return { label: 'Insuffisance pondérale', color: '#3b82f6', bg: '#3b82f6', w: '15%' }
  if (v < 25) return { label: 'Poids normal', color: '#10b981', bg: '#10b981', w: '40%' }
  if (v < 30) return { label: 'Surpoids', color: '#f59e0b', bg: '#f59e0b', w: '65%' }
  if (v < 35) return { label: 'Obésité modérée', color: '#f97316', bg: '#f97316', w: '80%' }
  return { label: 'Obésité sévère', color: '#ef4444', bg: '#ef4444', w: '95%' }
}

function initials(nom) {
  if (!nom) return '?'
  return nom.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
  </svg>
)
const IconClose = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const IconInfo = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
  </svg>
)
const IconCheck = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)
const IconX = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

function PathologieModal({ pathologie, onClose }) {
  if (!pathologie) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{pathologie.label}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Guide nutritionnel</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <IconClose />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            {pathologie.description}
          </p>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Classification</p>
            <div className="space-y-1.5">
              {pathologie.types.map((t, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-700 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}.</span>{t}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Recommandations</p>
            <p className="text-sm text-gray-600 leading-relaxed">{pathologie.recommandations}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700 mb-2 flex items-center gap-1">
                <IconCheck /> À privilégier
              </p>
              <div className="flex flex-wrap gap-1">
                {pathologie.ok.map((a, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-white border border-green-200 text-green-700 rounded-md font-medium">{a}</span>
                ))}
              </div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-xs font-bold uppercase tracking-widest text-red-700 mb-2 flex items-center gap-1">
                <IconX /> À éviter
              </p>
              <div className="flex flex-wrap gap-1">
                {pathologie.eviter.map((a, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-white border border-red-200 text-red-700 rounded-md font-medium">{a}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-100 transition">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Profil() {
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const [form, setForm] = useState({
    nom: '', sexe: 'M', age: '', poids_kg: '', taille_cm: '', activite: 'modere', pathologie: ''
  })
  const [besoins, setBesoins] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalPath, setModalPath] = useState(null)

  useEffect(() => {
    axios.get(`${API}/api/profil`, { headers })
      .then(res => {
        const p = res.data.profil || res.data
        setForm({
          nom: p.nom || '',
          sexe: p.sexe || 'M',
          age: p.age || '',
          poids_kg: p.poids_kg || '',
          taille_cm: p.taille_cm || '',
          activite: p.activite || 'modere',
          pathologie: p.pathologie || '',
        })
        if (!p.age && !p.poids_kg && !p.taille_cm) setEditing(true)
      }).catch(() => setEditing(true))
    axios.get(`${API}/api/besoins`, { headers })
      .then(res => setBesoins(res.data))
      .catch(() => { })
  }, [])

  const handleSave = async () => {
    setLoading(true); setError('')
    try {
      const res = await axios.put(`${API}/api/profil`, form, { headers })
      setBesoins(res.data.besoins)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } catch { setError('Erreur lors de la sauvegarde') }
    finally { setLoading(false) }
  }

  const bmi = getBMI(form.poids_kg, form.taille_cm)
  const bmiInfo = getBMIInfo(bmi)
  const selectedPath = PATHOLOGIE_OPTIONS.find(p => p.id === form.pathologie)
  const activiteObj = ACTIVITE_OPTIONS.find(a => a.value === form.activite)

  // ── MODE AFFICHAGE ────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        {modalPath && <PathologieModal pathologie={modalPath} onClose={() => setModalPath(null)} />}
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Hero */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-emerald-500 to-green-400" />
            <div className="px-8 pb-6">
              <div className="flex items-end justify-between -mt-10 mb-4">
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{initials(form.nom)}</span>
                </div>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition bg-white">
                  <IconEdit /> Modifier
                </button>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{form.nom || '—'}</h2>
              <p className="text-sm text-gray-400">{localStorage.getItem('email') || ''}</p>
              {selectedPath && (
                <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  {selectedPath.label}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Âge', value: form.age ? `${form.age} ans` : '—' },
              { label: 'Poids', value: form.poids_kg ? `${form.poids_kg} kg` : '—' },
              { label: 'Taille', value: form.taille_cm ? `${form.taille_cm} cm` : '—' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">{item.label}</p>
              </div>
            ))}
          </div>

          {/* IMC + Activité */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">IMC</p>
              <p className="text-4xl font-bold mb-1" style={{ color: bmiInfo.color }}>{bmi || '—'}</p>
              <p className="text-sm font-medium mb-4" style={{ color: bmiInfo.color }}>{bmiInfo.label}</p>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: bmiInfo.w, backgroundColor: bmiInfo.bg }} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Activité physique</p>
              <p className="text-lg font-bold text-gray-900 mb-1">{activiteObj?.label || '—'}</p>
              <p className="text-sm text-gray-400">{activiteObj?.desc || ''}</p>
            </div>
          </div>

          {/* Besoins */}
          {besoins && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Besoins journaliers</p>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Calories', val: Math.round(besoins.calories || 0), unit: 'kcal', bg: '#fff7ed', color: '#f97316' },
                  { label: 'Protéines', val: Math.round(besoins.proteines_g || 0), unit: 'g', bg: '#eff6ff', color: '#3b82f6' },
                  { label: 'Glucides', val: Math.round(besoins.glucides_g || 0), unit: 'g', bg: '#fffbeb', color: '#f59e0b' },
                  { label: 'Lipides', val: Math.round(besoins.lipides_g || 0), unit: 'g', bg: '#fdf2f8', color: '#ec4899' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: item.bg }}>
                    <p className="text-2xl font-bold" style={{ color: item.color }}>{item.val}</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: item.color }}>{item.unit}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pathologie */}
          {selectedPath && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Condition médicale</p>
                <button onClick={() => setModalPath(selectedPath)}
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition">
                  <IconInfo /> Guide nutritionnel
                </button>
              </div>
              <p className="text-base font-bold text-gray-900 mb-1">{selectedPath.label}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{selectedPath.description}</p>
            </div>
          )}

          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium text-center">
              Profil sauvegardé avec succès
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── MODE ÉDITION ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {modalPath && <PathologieModal pathologie={modalPath} onClose={() => setModalPath(null)} />}
      <div className="max-w-2xl mx-auto">

        {/* Avatar + nom en haut */}
        <div className="flex items-center gap-4 mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">{initials(form.nom)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{form.nom || 'Mon Profil'}</p>
            <p className="text-sm text-gray-400 truncate">{localStorage.getItem('email') || ''}</p>
          </div>
          {form.age && (
            <button onClick={() => setEditing(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition flex-shrink-0">
              <IconClose /> Annuler
            </button>
          )}
        </div>

        <div className="space-y-4">

          {/* Identité */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Identité</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
              <input type="text" value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                placeholder="Votre prénom" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sexe</label>
              <div className="flex gap-3">
                {[['M', 'Homme'], ['F', 'Femme']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setForm(f => ({ ...f, sexe: val }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${form.sexe === val
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'age', label: 'Âge', unit: 'ans', placeholder: '25' },
                { key: 'poids_kg', label: 'Poids', unit: 'kg', placeholder: '70' },
                { key: 'taille_cm', label: 'Taille', unit: 'cm', placeholder: '175' },
              ].map(({ key, label, unit, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <div className="relative">
                    <input type="number" value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                      placeholder={placeholder} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activité */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Niveau d'activité physique</p>
            <div className="space-y-2">
              {ACTIVITE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setForm(f => ({ ...f, activite: opt.value }))}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${form.activite === opt.value
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}>
                  <span className={`font-semibold ${form.activite === opt.value ? 'text-emerald-700' : 'text-gray-700'}`}>{opt.label}</span>
                  <span className="text-xs text-gray-400">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pathologie */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Condition médicale</p>
            <p className="text-xs text-gray-400 mb-4">Cliquez sur une pathologie pour la sélectionner</p>
            <div className="grid grid-cols-2 gap-2">
              {PATHOLOGIE_OPTIONS.map(opt => (
                <div key={opt.id} className="relative">
                  <button
                    onClick={() => setForm(f => ({ ...f, pathologie: f.pathologie === opt.id ? '' : opt.id }))}
                    className={`w-full px-4 py-3 pr-9 rounded-xl border text-sm font-medium text-left transition-all ${form.pathologie === opt.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                    {form.pathologie === opt.id && (
                      <span className="inline-flex items-center justify-center w-4 h-4 bg-emerald-500 rounded-full mr-2 align-middle">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                    {opt.label}
                  </button>
                  <button onClick={() => setModalPath(opt)}
                    className="absolute top-2.5 right-2 w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition">
                    <IconInfo />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button onClick={handleSave} disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-sm bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-60 shadow-sm">
            {loading ? 'Sauvegarde en cours...' : 'Enregistrer le profil'}
          </button>
        </div>
      </div>
    </div>
  )
}