import { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

const COULEURS_NUTRISCORE = {
  A: "bg-green-600",
  B: "bg-lime-500",
  C: "bg-yellow-400 text-gray-800",
  D: "bg-orange-500",
  E: "bg-red-600",
};

const LABEL_NUTRISCORE = {
  A: "Excellent choix nutritionnel",
  B: "Bon choix nutritionnel",
  C: "Qualité nutritionnelle moyenne",
  D: "Qualité nutritionnelle insuffisante",
  E: "À consommer avec modération",
};

function IconCamera() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-600 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function IconChevron({ open }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function AlerteCard({ alerte, pathologie }) {
  const [ouverte, setOuverte] = useState(false);

  const conseils = {
    diabete: [
      "Privilégiez les aliments à index glycémique bas (inférieur à 55)",
      "Ajoutez des fibres à chaque repas pour ralentir l'absorption du sucre",
      "Évitez les boissons sucrées et les jus de fruits industriels",
      "Fractionnez vos repas en petites portions réparties sur la journée",
    ],
    hypertension: [
      "Limitez le sel à moins de 2g par repas",
      "Consommez des aliments riches en potassium : banane, épinards, avocat",
      "Évitez les plats préparés, charcuteries et fromages à pâte dure",
      "Préférez les herbes aromatiques et épices au sel de table",
    ],
    obesite: [
      "Visez des repas inférieurs à 500 kcal par prise alimentaire",
      "Augmentez l'apport en protéines pour favoriser la satiété",
      "Réduisez les graisses saturées et les sucres à absorption rapide",
      "Buvez un grand verre d'eau avant chaque repas",
    ],
    insuffisance_renale: [
      "Limitez les protéines à 15g maximum par repas",
      "Évitez les aliments riches en potassium : banane, pomme de terre, avocat",
      "Réduisez les apports en phosphates : produits laitiers, noix, boissons cola",
      "Consultez votre néphrologue pour adapter votre plan alimentaire",
    ],
  };

  const conseilsPatho = conseils[pathologie] || [];

  return (
    <div className="border border-red-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOuverte(!ouverte)}
        className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <IconWarning />
          <div>
            <p className="text-sm font-medium text-red-700">{alerte}</p>
            <p className="text-xs text-red-400 mt-0.5">Voir les recommandations</p>
          </div>
        </div>
        <IconChevron open={ouverte} />
      </button>

      {ouverte && conseilsPatho.length > 0 && (
        <div className="px-4 py-4 bg-white border-t border-red-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Recommandations
          </p>
          <ul className="space-y-2">
            {conseilsPatho.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NutrimentBarre({ label, valeur, max, unite, couleur }) {
  const pct = Math.min((valeur / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className="font-medium text-gray-700">{valeur}{unite}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${couleur}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Analyse() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState(null);

  const token = localStorage.getItem("token");

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResultat(null);
    setErreur(null);
  };

  const analyser = async () => {
    if (!image) return;
    setLoading(true);
    setErreur(null);
    try {
      const form = new FormData();
      form.append("image", image);
      const res = await axios.post(`${API}/api/analyse`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResultat(res.data);
    } catch (e) {
      setErreur(e.response?.data?.error || "Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  const ns = resultat?.nutriscore;
  const totaux = resultat?.totaux || {};
  const alertes = resultat?.alertes || [];
  const pathologie = resultat?.pathologie;
  const aliments = resultat?.aliments || [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <div>
        <h1 className="text-xl font-semibold text-gray-800">Analyse nutritionnelle</h1>
        <p className="text-sm text-gray-400 mt-1">
          Importez une photo de votre repas pour obtenir une analyse complète
        </p>
      </div>

      {/* Zone upload */}
      <label className="block cursor-pointer">
        <div className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${preview ? "border-blue-200 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-gray-50"
          }`}>
          {preview ? (
            <img src={preview} alt="repas" className="mx-auto max-h-60 rounded-lg object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <IconCamera />
              <p className="text-sm text-gray-500">Cliquez pour importer une photo</p>
              <p className="text-xs text-gray-400">JPG, PNG — 16 MB maximum</p>
            </div>
          )}
        </div>
        <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
      </label>

      {preview && (
        <button
          onClick={analyser}
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? "Analyse en cours..." : "Lancer l'analyse"}
        </button>
      )}

      {loading && (
        <div className="text-center py-10">
          <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 mt-3">Détection des aliments en cours...</p>
        </div>
      )}

      {erreur && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          <IconWarning />
          <p className="text-sm text-red-600">{erreur}</p>
        </div>
      )}

      {resultat && (
        <div className="space-y-5">

          {/* Nutri-Score */}
          {ns && ns !== "N/A" && (
            <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-black ${COULEURS_NUTRISCORE[ns] || "bg-gray-400"}`}>
                {ns}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Nutri-Score</p>
                <p className="font-medium text-gray-800 mt-0.5">{LABEL_NUTRISCORE[ns]}</p>
              </div>
            </div>
          )}

          {/* Totaux */}
          {totaux.calories > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Valeurs nutritionnelles
              </h2>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Calories", valeur: totaux.calories, unite: "kcal", couleur: "text-orange-500" },
                  { label: "Protéines", valeur: totaux.proteines_g, unite: "g", couleur: "text-blue-500" },
                  { label: "Glucides", valeur: totaux.glucides_g, unite: "g", couleur: "text-yellow-500" },
                  { label: "Lipides", valeur: totaux.lipides_g, unite: "g", couleur: "text-red-400" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p className={`text-xl font-bold ${item.couleur}`}>{item.valeur}</p>
                    <p className="text-xs text-gray-400">{item.unite}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-1 border-t border-gray-50">
                <NutrimentBarre label="Fibres" valeur={totaux.fibres_g} max={30} unite="g" couleur="bg-green-400" />
                <NutrimentBarre label="Sucres" valeur={totaux.sucre_g} max={50} unite="g" couleur="bg-yellow-400" />
                <NutrimentBarre label="Sel" valeur={totaux.sel_g} max={6} unite="g" couleur="bg-red-400" />
              </div>
            </div>
          )}

          {/* Aliments */}
          {aliments.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Aliments détectés — {aliments.length}
              </h2>
              <div className="divide-y divide-gray-50">
                {aliments.map((a, i) => {
                  const n = a.nutriments || {};
                  const conf = Math.round((a.confiance || 0) * 100);
                  return (
                    <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800 capitalize">{n.nom || a.classe}</p>
                        <p className="text-xs text-gray-400">{a.poids_g} g &bull; confiance {conf}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700">{n.calories} kcal</p>
                        <p className="text-xs text-gray-400">P {n.proteines_g}g · G {n.glucides_g}g · L {n.lipides_g}g</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alertes */}
          {alertes.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Alertes médicales — {alertes.length}
              </h2>
              {alertes.map((a, i) => (
                <AlerteCard key={i} alerte={a} pathologie={pathologie} />
              ))}
            </div>
          )}

          {alertes.length === 0 && pathologie && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
              <IconCheck />
              <div>
                <p className="text-sm font-medium text-green-700">Repas compatible</p>
                <p className="text-xs text-green-500 mt-0.5">
                  Ce repas est adapté à votre profil médical.
                </p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}