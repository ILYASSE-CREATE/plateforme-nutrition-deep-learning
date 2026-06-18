# Données du projet

Les datasets volumineux **ne sont pas inclus** dans le dépôt (plusieurs Go).
Ce fichier indique comment les récupérer. Seuls quelques **échantillons** sont versionnés
dans `samples/` pour la reproductibilité.

---

## 1. FoodSeg103 — segmentation alimentaire (entraînement du CNN)

- Contenu : ~7 000 images annotées au pixel près, 103 catégories d'aliments.
- Source : disponible sur Kaggle (rechercher « FoodSeg103 »).
- Layout attendu après extraction dans `data/FoodSeg103/` :

```
FoodSeg103/
  Images/
    img_dir/train/*.jpg
    img_dir/test/*.jpg
    ann_dir/train/*.png      (masques : valeur du pixel = id de classe)
    ann_dir/test/*.png
  category_id.txt            (id  ->  nom de classe)
```

Conversion au format YOLO : voir `01_preparation_donnees/conversion_foodseg_yolo.py`.

---

## 2. Food-101 — classification (pré-entraînement / appoint)

- Contenu : 101 000 images, 101 classes de plats.
- Source : Kaggle (« Food-101 ») ou ETH Zürich.
- Dossier : `data/food-101/`.

---

## 3. USDA FoodData Central — valeurs nutritionnelles de référence

- Contenu : 300 000+ aliments avec composition nutritionnelle.
- Source : fdc.nal.usda.gov (téléchargement « Full Download of All Data Types », CSV).
- Dossier : `data/usda/`.
- Import en base : `01_preparation_donnees/build_nutrition_db.py`.

---

## 4. Open Food Facts — produits emballés (code-barres)

- Pas de téléchargement : utilisé **en direct** via l'API.
- Endpoint produit : `https://world.openfoodfacts.org/api/v2/product/{code_barres}.json`

---

## 5. RecipeNLG — recettes (sous-ensemble enrichi)

- Contenu : ~2M recettes (texte libre des ingrédients).
- Source : Kaggle (« RecipeNLG »).
- Dossier : `data/recipes/`.
- ⚠️ On n'utilise qu'un **sous-ensemble** (~500–1000 recettes) enrichi de leurs valeurs
  nutritionnelles via USDA (le matching ingrédient → USDA est fait dans `build_nutrition_db.py`).

---

## Table de correspondance

`01_preparation_donnees/` produit une table reliant chaque classe d'aliment
(FoodSeg103) à son entrée nutritionnelle USDA. C'est elle qui transforme une
détection visuelle en apport nutritionnel.
