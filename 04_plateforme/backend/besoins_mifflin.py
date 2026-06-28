"""
Calcul des besoins nutritionnels — formule Mifflin-St Jeor
==========================================================

Module DETERMINISTE (pas de réseau de neurones) : les besoins énergétiques se
calculent par une équation médicale exacte et reconnue. C'est un choix volontaire :
transparence et explicabilité dans un contexte de santé.

  Métabolisme de base (BMR), Mifflin-St Jeor :
      Homme : BMR = 10*poids + 6.25*taille - 5*age + 5
      Femme : BMR = 10*poids + 6.25*taille - 5*age - 161

  Besoins journaliers (TDEE) = BMR * facteur d'activité

La répartition des macronutriments est ensuite ajustée selon la pathologie.
"""

# Facteurs d'activité physique (standard)
ACTIVITE = {
    "sedentaire": 1.2,
    "leger": 1.375,
    "modere": 1.55,
    "actif": 1.725,
    "tres_actif": 1.9,
}

# Répartition par défaut des macronutriments (% des calories)
REPARTITION_DEFAUT = {"glucides": 0.50, "proteines": 0.20, "lipides": 0.30}

# Ajustements par pathologie (proof of concept — à valider médicalement)
REPARTITION_PATHOLOGIE = {
    "diabete":      {"glucides": 0.45, "proteines": 0.25, "lipides": 0.30},
    "hypertension": {"glucides": 0.50, "proteines": 0.20, "lipides": 0.30},
    "obesite":      {"glucides": 0.45, "proteines": 0.30, "lipides": 0.25},
    "insuffisance_renale": {"glucides": 0.55, "proteines": 0.12, "lipides": 0.33},
}

# Calories par gramme
KCAL_PAR_G = {"glucides": 4, "proteines": 4, "lipides": 9}


def bmr_mifflin(sexe, poids_kg, taille_cm, age):
    """Métabolisme de base. sexe : 'M' ou 'F'."""
    base = 10 * poids_kg + 6.25 * taille_cm - 5 * age
    return base + 5 if sexe.upper() == "M" else base - 161


def besoins_journaliers(sexe, poids_kg, taille_cm, age, activite="modere",
                        pathologie=None):
    """Retourne les besoins : calories + grammes de chaque macronutriment."""
    if activite not in ACTIVITE:
        raise ValueError(f"activité inconnue : {activite} ({list(ACTIVITE)})")

    bmr = bmr_mifflin(sexe, poids_kg, taille_cm, age)
    tdee = bmr * ACTIVITE[activite]

    # Déficit calorique en cas d'obésité (perte de poids progressive ~ -20%)
    if pathologie == "obesite":
        tdee *= 0.80

    repartition = REPARTITION_PATHOLOGIE.get(pathologie, REPARTITION_DEFAUT)

    macros = {}
    for macro, part in repartition.items():
        macros[macro + "_g"] = round((tdee * part) / KCAL_PAR_G[macro], 1)

    return {
        "calories": round(tdee),
        "bmr": round(bmr),
        **macros,
        "pathologie": pathologie or "aucune",
    }


if __name__ == "__main__":
    # Test : homme, 30 ans, 80 kg, 178 cm, activité modérée, diabétique
    res = besoins_journaliers("M", 80, 178, 30, "modere", "diabete")
    print("Exemple (homme diabétique) :")
    for k, v in res.items():
        print(f"  {k:14s}: {v}")
