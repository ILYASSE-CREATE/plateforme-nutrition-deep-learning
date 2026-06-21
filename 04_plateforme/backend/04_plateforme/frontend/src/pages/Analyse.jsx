import { useState, useRef } from "react";
import api from "../api";

const NUTRISCORE_COLORS = {
    A: "bg-green-500", B: "bg-lime-400", C: "bg-yellow-400",
    D: "bg-orange-400", E: "bg-red-500",
};

export default function Analyse() {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef();

    const handleFile = (file) => {
        if (!file) return;
        setImage(file);
        setPreview(URL.createObjectURL(file));
        setResult(null);
        setError("");
    };

    const handleAnalyse = async () => {
        if (!image) return;
        setLoading(true);
        setError("");
        try {
            const form = new FormData();
            form.append("image", image);
            const { data } = await api.post("/analyse", form);
            setResult(data);
        } catch (e) {
            setError(e.response?.data?.error || "Erreur lors de l'analyse");
        } finally {
            setLoading(false);
        }
    };

    const typeRepasIcon = {
        "Petit-déjeuner": "🌅",
        "Déjeuner": "☀️",
        "Collation": "🍎",
        "Dîner": "🌙",
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Analyser un repas</h1>

            {/* Zone upload */}
            <div
                onClick={() => fileRef.current.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition mb-4"
            >
                {preview ? (
                    <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-xl object-contain" />
                ) : (
                    <div>
                        <p className="text-4xl mb-2">📷</p>
                        <p className="text-gray-500">Cliquez ou glissez une photo de votre repas</p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG — max 16 MB</p>
                    </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>

            {preview && (
                <button
                    onClick={handleAnalyse}
                    disabled={loading}
                    className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 transition mb-6"
                >
                    {loading ? "Analyse en cours..." : "Analyser ce repas"}
                </button>
            )}

            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

            {result && (
                <div className="space-y-4">

                    {/* Type de repas + Nutri-Score */}
                    <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
                        <div>
                            <p className="text-lg font-semibold text-gray-800">
                                {typeRepasIcon[result.type_repas] || "🍽️"} {result.type_repas}
                            </p>
                            <p className="text-xs text-gray-400">Repas n°{result.suivi_journalier?.nb_repas_aujourd_hui} aujourd'hui</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Nutri-Score</p>
                            <span className={`text-white text-xl font-bold px-4 py-1 rounded-lg ${NUTRISCORE_COLORS[result.nutriscore] || "bg-gray-400"}`}>
                                {result.nutriscore}
                            </span>
                        </div>
                    </div>

                    {/* Aliments détectés */}
                    {result.aliments?.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h2 className="font-semibold text-gray-700 mb-3">Aliments détectés</h2>
                            <div className="space-y-2">
                                {result.aliments.map((a, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                        <div>
                                            <p className="font-medium text-gray-800 capitalize">{a.nutriments?.nom || a.classe}</p>
                                            <p className="text-xs text-gray-400">{a.poids_g}g · confiance {Math.round(a.confiance * 100)}%</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-orange-500">{a.nutriments?.calories} kcal</p>
                                            <p className="text-xs text-gray-400">{a.nutriments?.proteines_g}g prot.</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Totaux du repas */}
                    {result.totaux && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h2 className="font-semibold text-gray-700 mb-3">Totaux de ce repas</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Calories", val: result.totaux.calories, unit: "kcal", color: "orange" },
                                    { label: "Protéines", val: result.totaux.proteines_g, unit: "g", color: "blue" },
                                    { label: "Glucides", val: result.totaux.glucides_g, unit: "g", color: "yellow" },
                                    { label: "Lipides", val: result.totaux.lipides_g, unit: "g", color: "purple" },
                                    { label: "Fibres", val: result.totaux.fibres_g, unit: "g", color: "green" },
                                    { label: "Sel", val: result.totaux.sel_g, unit: "g", color: "red" },
                                ].map(({ label, val, unit, color }) => (
                                    <div key={label} className={`bg-${color}-50 rounded-lg p-3`}>
                                        <p className={`text-lg font-bold text-${color}-600`}>{val}{unit}</p>
                                        <p className="text-xs text-gray-500">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suivi journalier */}
                    {result.suivi_journalier?.reste && (
                        <div className="bg-white rounded-xl border border-blue-200 p-4">
                            <h2 className="font-semibold text-gray-700 mb-1">📊 Reste pour aujourd'hui</h2>
                            <p className="text-xs text-gray-400 mb-3">Après ce repas, il vous reste :</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Calories", key: "calories", unit: "kcal", color: "orange" },
                                    { label: "Protéines", key: "proteines_g", unit: "g", color: "blue" },
                                    { label: "Glucides", key: "glucides_g", unit: "g", color: "yellow" },
                                    { label: "Lipides", key: "lipides_g", unit: "g", color: "purple" },
                                ].map(({ label, key, unit, color }) => {
                                    const val = result.suivi_journalier.reste[key] ?? 0;
                                    const depasse = val < 0;
                                    return (
                                        <div key={key} className={`rounded-lg p-3 ${depasse ? "bg-red-50 border border-red-200" : `bg-${color}-50`}`}>
                                            <p className={`text-lg font-bold ${depasse ? "text-red-600" : `text-${color}-600`}`}>
                                                {depasse ? `+${Math.abs(val)}` : val}{unit}
                                            </p>
                                            <p className="text-xs text-gray-500">{label} {depasse ? "⚠️ dépassé" : "restant"}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recommandations ingrédients prochain repas */}
                    {result.ingredients_prochain_repas?.length > 0 && (
                        <div className="bg-white rounded-xl border border-green-200 p-4">
                            <h2 className="font-semibold text-gray-700 mb-1">🥗 Pour votre prochain repas</h2>
                            <p className="text-xs text-gray-400 mb-3">Ingrédients à intégrer selon vos besoins et votre pathologie :</p>
                            <div className="space-y-3">
                                {result.ingredients_prochain_repas.map((rec, i) => (
                                    <div key={i} className="bg-green-50 rounded-lg p-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-sm font-semibold text-green-700">{rec.nutriment}</p>
                                            {rec.manque && <span className="text-xs text-red-500 font-medium">{rec.manque}</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {rec.ingredients.map((ing, j) => (
                                                <span key={j} className="text-xs bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">
                                                    {ing}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Alertes médicales */}
                    {result.alertes?.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <h2 className="font-semibold text-red-700 mb-2">⚠️ Alertes médicales</h2>
                            <ul className="space-y-1">
                                {result.alertes.map((a, i) => (
                                    <li key={i} className="text-sm text-red-600">• {a}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Bouton nouvelle analyse */}
                    <button
                        onClick={() => { setImage(null); setPreview(null); setResult(null); }}
                        className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-medium transition"
                    >
                        Analyser un autre repas
                    </button>
                </div>
            )}
        </div>
    );
}