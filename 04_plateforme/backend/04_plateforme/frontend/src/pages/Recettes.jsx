import { useState, useEffect } from "react";
import api from "../api";

const MALADIE_LABELS = {
    diabete: "Diabète",
    hypertension: "Hypertension",
    obesite: "Obésité",
    insuffisance_renale: "Insuffisance rénale",
    cholesterol: "Cholestérol élevé",
    anemie: "Anémie",
};

const NUTRISCORE_COLORS = {
    A: "bg-green-500", B: "bg-lime-400", C: "bg-yellow-400",
    D: "bg-orange-400", E: "bg-red-500",
};

export default function Recettes() {
    const [recommandees, setRecommandees] = useState([]);
    const [aEviter, setAEviter] = useState([]);
    const [autres, setAutres] = useState([]);
    const [pathologie, setPathologie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [onglet, setOnglet] = useState("recommandees");

    useEffect(() => {
        api.get("/recettes").then(r => {
            setRecommandees(r.data.recommandees || []);
            setAEviter(r.data.a_eviter || []);
            setAutres(r.data.autres || []);
            setPathologie(r.data.pathologie);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const liste = onglet === "recommandees" ? recommandees
        : onglet === "eviter" ? aEviter
            : autres;

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500" />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Recettes</h1>
            {pathologie && (
                <p className="text-sm text-gray-500 mb-6">
                    Recettes personnalisées pour : <span className="font-semibold text-green-600">{MALADIE_LABELS[pathologie]}</span>
                </p>
            )}

            {/* Onglets */}
            {pathologie && (
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setOnglet("recommandees")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${onglet === "recommandees"
                                ? "bg-green-500 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        ✅ Recommandées ({recommandees.length})
                    </button>
                    <button
                        onClick={() => setOnglet("eviter")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${onglet === "eviter"
                                ? "bg-red-500 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        ⚠️ À éviter ({aEviter.length})
                    </button>
                    <button
                        onClick={() => setOnglet("autres")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${onglet === "autres"
                                ? "bg-blue-500 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        Autres ({autres.length})
                    </button>
                </div>
            )}

            {/* Grille recettes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liste.map(r => (
                    <div
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className={`bg-white rounded-xl border cursor-pointer hover:shadow-md transition p-4 ${r.statut === "recommande" ? "border-green-300 ring-1 ring-green-200" :
                                r.statut === "eviter" ? "border-red-200 opacity-75" :
                                    "border-gray-200"
                            }`}
                    >
                        {/* Badge statut */}
                        {r.statut === "recommande" && (
                            <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mb-2 font-medium">
                                ✅ Recommandé
                            </span>
                        )}
                        {r.statut === "eviter" && (
                            <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full mb-2 font-medium">
                                ⚠️ À éviter
                            </span>
                        )}

                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-semibold text-gray-800 text-sm leading-tight">{r.nom}</h3>
                            <span className={`text-white text-xs font-bold px-2 py-0.5 rounded ml-2 flex-shrink-0 ${NUTRISCORE_COLORS[r.nutriscore] || "bg-gray-400"}`}>
                                {r.nutriscore}
                            </span>
                        </div>

                        <p className="text-xs text-gray-400 mb-2">{r.categorie} · {r.temps}</p>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{r.description}</p>

                        {r.pourquoi && (
                            <p className="text-xs italic text-blue-600 mb-3 line-clamp-2">💡 {r.pourquoi}</p>
                        )}

                        <div className="grid grid-cols-3 gap-1 text-center">
                            <div className="bg-orange-50 rounded p-1">
                                <p className="text-xs font-bold text-orange-600">{r.calories}</p>
                                <p className="text-xs text-gray-500">kcal</p>
                            </div>
                            <div className="bg-blue-50 rounded p-1">
                                <p className="text-xs font-bold text-blue-600">{r.proteines_g}g</p>
                                <p className="text-xs text-gray-500">prot.</p>
                            </div>
                            <div className="bg-green-50 rounded p-1">
                                <p className="text-xs font-bold text-green-600">{r.fibres_g}g</p>
                                <p className="text-xs text-gray-500">fibres</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {liste.length === 0 && (
                <div className="text-center text-gray-400 py-16">
                    Aucune recette dans cette catégorie.
                </div>
            )}

            {/* Modal détail */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{selected.nom}</h2>
                                <p className="text-sm text-gray-500">{selected.categorie} · {selected.temps}</p>
                            </div>
                            <span className={`text-white text-sm font-bold px-3 py-1 rounded-lg ${NUTRISCORE_COLORS[selected.nutriscore] || "bg-gray-400"}`}>
                                {selected.nutriscore}
                            </span>
                        </div>

                        {selected.statut === "recommande" && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-green-700 font-medium">✅ Recommandé pour {MALADIE_LABELS[pathologie]}</p>
                                {selected.pourquoi && <p className="text-xs text-green-600 mt-1">{selected.pourquoi}</p>}
                            </div>
                        )}
                        {selected.statut === "eviter" && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-red-700 font-medium">⚠️ À éviter pour {MALADIE_LABELS[pathologie]}</p>
                                {selected.pourquoi && <p className="text-xs text-red-600 mt-1">{selected.pourquoi}</p>}
                            </div>
                        )}

                        <p className="text-sm text-gray-600 mb-4">{selected.description}</p>

                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {[
                                { label: "Calories", val: selected.calories, unit: "kcal", color: "orange" },
                                { label: "Protéines", val: selected.proteines_g, unit: "g", color: "blue" },
                                { label: "Glucides", val: selected.glucides_g, unit: "g", color: "yellow" },
                                { label: "Lipides", val: selected.lipides_g, unit: "g", color: "purple" },
                            ].map(({ label, val, unit, color }) => (
                                <div key={label} className={`bg-${color}-50 rounded-lg p-2 text-center`}>
                                    <p className={`text-sm font-bold text-${color}-600`}>{val}{unit}</p>
                                    <p className="text-xs text-gray-500">{label}</p>
                                </div>
                            ))}
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Ingrédients</h4>
                            <div className="flex flex-wrap gap-1">
                                {selected.ingredients?.map((ing, i) => (
                                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{ing}</span>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setSelected(null)}
                            className="mt-4 w-full py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}