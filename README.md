# Plateforme Web Intelligente de Reconnaissance Alimentaire et de Recommandation Nutritionnelle

> Projet de Fin d'Études — Deep Learning & Développement Web  
> Faculté des Sciences Ben M'Sik — Année universitaire 2025–2026

---

## Équipe

| Rôle | Nom |
|---|---|
| Étudiant | ELOUARDANI Ilyasse |
| Étudiant | AAROU Ikram |
| Encadrant | LOTFI Anass |
| Encadrant | EL HABIB Ben Lahmar |
| Encadrante | GUENDOUL Oumaima |

---

## Description du Projet

Plateforme intelligente qui permet à un utilisateur de **photographier son assiette** et d'obtenir instantanément :

- La **détection et segmentation** des aliments par Deep Learning (YOLOv8m-seg)
- L'**estimation des nutriments** (calories, protéines, glucides, lipides, fibres...)
- Des **recommandations nutritionnelles personnalisées** selon le profil médical (diabète, hypertension, obésité, insuffisance rénale)
- Un **historique** des repas et un **tableau de bord** de suivi

> ⚠️ Outil d'aide à la décision et de sensibilisation. **Ne remplace pas** un avis médical.

---

## Architecture du Système

```
Photo de l'assiette + Profil médical de l'utilisateur
                │
                ▼
 ┌─────────────────────────────────────┐
 │  [1] YOLOv8m-seg (Deep Learning)   │
 │  Détection + Segmentation           │
 │  62 classes alimentaires            │
 │  mAP50 = 0.484 — mAP50-95 = 0.382  │
 └─────────────────────────────────────┘
                │
                ▼
 ┌─────────────────────────────────────┐
 │  [2] Estimation des Nutriments      │
 │  Table nutritionnelle 62 classes    │
 │  Calories, protéines, glucides...   │
 └─────────────────────────────────────┘
                │
                ▼
 ┌─────────────────────────────────────┐
 │  [3] Calcul des Besoins             │
 │  Formule Mifflin-St Jeor            │
 │  (IMC, âge, sexe, activité)         │
 └─────────────────────────────────────┘
                │
                ▼
 ┌─────────────────────────────────────┐
 │  [4] Moteur de Règles Médicales     │
 │  Diabète / Hypertension             │
 │  Obésité / Insuffisance rénale      │
 └─────────────────────────────────────┘
                │
                ▼
 ┌─────────────────────────────────────┐
 │  [5] Plateforme Web                 │
 │  Backend : Flask (Python)           │
 │  Frontend : React + TailwindCSS     │
 │  Base de données : PostgreSQL       │
 └─────────────────────────────────────┘
```

---

## Modèle de Deep Learning

### Dataset : FoodSeg103

| Propriété | Valeur |
|---|---|
| Dataset source | FoodSeg103 |
| Classes originales | 103 |
| Classes retenues | **62** |
| Images d'entraînement | 4 977 |
| Images de test | 2 133 |

### Modèle : YOLOv8m-seg

| Paramètre | Valeur |
|---|---|
| Architecture | YOLOv8m-seg |
| Paramètres | 27 275 546 |
| Epochs | 70 |
| Image size | 640×640 |
| Batch size | 16 |
| Optimizer | AdamW |
| GPU | Tesla T4 (Kaggle) |
| Durée entraînement | ~5h 46min |

### Résultats

| Métrique | Box | Mask |
|---|---|---|
| mAP50 | 0.479 | **0.484** |
| mAP50-95 | 0.408 | **0.382** |
| Précision | 0.548 | 0.552 |
| Rappel | 0.485 | 0.487 |

### Meilleures classes (mAP50 Mask)

| Classe | mAP50 |
|---|---|
| Corn | 0.877 |
| Broccoli | 0.867 |
| Blueberry | 0.867 |
| Strawberry | 0.781 |
| Rice | 0.740 |
| Banana | 0.737 |

---

## Structure du Dépôt

```
plateforme-nutrition-deep-learning/
│
├── 01_preparation_donnees/     # Conversion FoodSeg103 → YOLO, EDA
├── 02_modele_vision/           # Entraînement YOLOv8-seg, résultats
├── 03_logique_nutritionnelle/  # Calcul portions, besoins, règles médicales
├── 04_plateforme/
│   ├── backend/                # API Flask (Python)
│   └── frontend/               # Interface React
├── 05_tests/                   # Tests utilisateurs
├── data/
├── requirements.txt
└── README.md
```

---

## Stack Technologique

| Couche | Technologies |
|---|---|
| Deep Learning | Python, PyTorch, Ultralytics YOLOv8 |
| Backend | Flask, Flask-JWT-Extended, SQLAlchemy |
| Base de données | PostgreSQL |
| Frontend | React, Vite, TailwindCSS |
| Entraînement | Kaggle (GPU Tesla T4) |
| Dataset | FoodSeg103 |

---

## Installation et Lancement

### 1. Cloner le projet

```bash
git clone https://github.com/ILYASSE-CREATE/plateforme-nutrition-deep-learning.git
cd plateforme-nutrition-deep-learning
```

### 2. Backend

```bash
cd 04_plateforme/backend
pip install -r requirements_backend.txt
python app.py
```

> Le modèle YOLOv8 est téléchargé automatiquement depuis Google Drive au premier démarrage.

### 3. Frontend

```bash
cd 04_plateforme/frontend
npm install
npm run dev
```

---

## Fonctionnalités

- Inscription / Connexion avec profil médical (JWT)
- Analyse d'image — photo → détection des aliments → nutriments
- Scan code-barres — identification produit
- Dashboard — suivi nutritionnel quotidien
- Historique des repas
- Recommandations personnalisées selon pathologies
- Recettes adaptées au profil

---

## 62 Classes Alimentaires Détectées

```
apple, asparagus, avocado, banana, beans, biscuit, blueberry, bread,
broccoli, cabbage, carrot, cauliflower, celery stick, cheese butter,
cherry, chicken duck, chocolate, cilantro mint, corn, cucumber, egg,
fish, french fries, garlic, grape, green_onion, hot_drink, ice cream,
juice, kiwi, lemon, lettuce, mango, meat, milk, milkshake, mushroom,
noodles_pasta, nuts, olives, orange, other ingredients, pastry, peach,
pear, pepper, pineapple, pizza, potato, pumpkin, rape, raspberry,
rice, sauce, seafood, soup, soy, strawberry, tofu, tomato,
white radish, wine
```

---

*Faculté des Sciences Ben M'Sik — 2025–2026*

## Dépôt GitHub

Lien : _________________
