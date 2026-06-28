"""
Moteur de règles médicales
===========================

Applique des contraintes nutritionnelles selon la pathologie du patient, et permet
de filtrer un aliment ou une recette (décrits par leurs valeurs pour 100 g / portion).

⚠️ Proof of concept. Règles SIMPLIFIÉES, à valider médicalement. La plateforme est un
outil d'aide à la décision, pas un dispositif médical.

Format d'un aliment/recette analysé (dict) — valeurs pour la portion considérée :
    {"sucre_g":, "sel_g":, "potassium_mg":, "proteines_g":, "lipides_g":,
     "fibres_g":, "index_glycemique":, "calories":}
Les clés manquantes sont simplement ignorées par les règles concernées.
"""

# Seuils par pathologie (indicatifs, par portion sauf mention)
REGLES = {
    "diabete": {
        "description": "Limiter sucres et index glycémique, favoriser les fibres.",
        "max": {"sucre_g": 10, "index_glycemique": 55},
        "min": {"fibres_g": 3},
    },
    "hypertension": {
        "description": "Réduire le sel, favoriser le potassium.",
        "max": {"sel_g": 2},
        "min": {"potassium_mg": 300},
    },
    "obesite": {
        "description": "Réduire densité calorique et lipides.",
        "max": {"calories": 600, "lipides_g": 20},
        "min": {},
    },
    "insuffisance_renale": {
        "description": "Limiter protéines et potassium.",
        "max": {"proteines_g": 15, "potassium_mg": 250},
        "min": {},
    },
}


def evaluer(aliment, pathologie):
    """Évalue un aliment/recette pour une pathologie.

    Retourne un dict : {ok: bool, alertes: [..], pathologie: str}
    """
    if pathologie not in REGLES:
        return {"ok": True, "alertes": [], "pathologie": pathologie or "aucune"}

    regle = REGLES[pathologie]
    alertes = []

    for cle, seuil in regle["max"].items():
        if cle in aliment and aliment[cle] > seuil:
            alertes.append(f"{cle} trop élevé ({aliment[cle]} > {seuil})")

    for cle, seuil in regle["min"].items():
        if cle in aliment and aliment[cle] < seuil:
            alertes.append(f"{cle} insuffisant ({aliment[cle]} < {seuil})")

    return {"ok": len(alertes) == 0, "alertes": alertes, "pathologie": pathologie}


def filtrer(recettes, pathologie):
    """Garde les recettes conformes aux règles de la pathologie."""
    return [r for r in recettes if evaluer(r, pathologie)["ok"]]


if __name__ == "__main__":
    soda = {"nom": "Soda", "sucre_g": 35, "fibres_g": 0, "index_glycemique": 70}
    lentilles = {"nom": "Lentilles", "sucre_g": 2, "fibres_g": 8, "index_glycemique": 30}
    for plat in (soda, lentilles):
        res = evaluer(plat, "diabete")
        print(f"{plat['nom']:10s} -> ok={res['ok']}  {res['alertes']}")
