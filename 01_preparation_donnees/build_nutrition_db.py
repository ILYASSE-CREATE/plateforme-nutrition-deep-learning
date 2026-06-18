"""
Construction de la base nutritionnelle (Étape 1)
================================================
TODO (étape 1) :
  1. Charger les CSV USDA (data/usda/) -> table aliments (nom, calories, macros,
     sucre, sel, potassium, fibres, index glycémique si dispo).
  2. Importer dans PostgreSQL (via SQLAlchemy).
  3. Charger un sous-ensemble RecipeNLG (~500-1000 recettes), parser les ingrédients,
     matcher chaque ingrédient à USDA, calculer les valeurs nutritionnelles par recette.
  4. Construire la table de correspondance : classe FoodSeg103 -> entrée USDA.

Sortie : base nutritionnelle + table de correspondance prêtes pour la suite.
"""

def main():
    raise NotImplementedError("À implémenter à l'étape 1 (préparation des données).")

if __name__ == "__main__":
    main()
