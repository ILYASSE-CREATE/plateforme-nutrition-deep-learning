"""
Recommandation de recettes (Étape 3)
====================================
Filtrage (moteur_regles) + scoring (content-based) des recettes selon le profil,
les règles médicales et les besoins (besoins_mifflin). Produit :
  - le plan alimentaire journalier (3 repas),
  - le top des recettes adaptées,
  - la liste de courses,
  - les alertes d'aliments à éviter.

TODO : implémenter le score de pertinence (proximité besoins/apports + respect des règles).
"""

def recommander(profil, besoins, recettes):
    raise NotImplementedError("À implémenter à l'étape 3.")
