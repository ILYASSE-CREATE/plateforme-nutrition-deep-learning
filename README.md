# Plateforme web intelligente de reconnaissance alimentaire et de recommandation nutritionnelle

Projet de fin d'études — Deep Learning & développement web.

Plateforme qui reconnaît les aliments d'une assiette par **Deep Learning** (CNN de
segmentation), estime les portions, puis génère des **recommandations nutritionnelles
personnalisées et sécurisées** selon le profil médical de l'utilisateur (diabète,
hypertension, obésité, insuffisance rénale).

> ⚠️ Outil d'aide à la décision et de sensibilisation. **Ne remplace pas** un avis médical.

---

## Binôme

- Nom 1 — _________________
- Nom 2 — _________________
- Encadrant : _________________
- Année universitaire : 2025–2026

---

## Architecture (vue d'ensemble)

```
Photo / code-barres + profil médical
        │
        ▼
[1] CNN de segmentation (YOLOv8-seg) ──► aliments détourés + surface
        │
        ▼
[2] Estimation de portion (surface → grammes) ──► nutriments de l'assiette (USDA)
        │
        ▼
[3] Besoins (formule Mifflin-St Jeor)  +  [4] Moteur de règles médicales
        │
        ▼
[5] Recommandation (plan, recettes, liste de courses, alertes)
        │
        ▼
Plateforme web : API Flask + interface React
```

Le **Deep Learning** est concentré sur la vision (CNN). Le calcul des besoins utilise
une **formule médicale validée** (transparente et explicable), pas un modèle boîte noire.
Un module **LSTM** de prévision de tendance est prévu en option (après le cœur fonctionnel).

---

## Structure du dépôt

| Dossier | Contenu |
|---|---|
| `data/` | Échantillons + liens de téléchargement (voir `data/README_data.md`) |
| `01_preparation_donnees/` | Conversion FoodSeg103 → YOLO, base nutritionnelle, EDA |
| `02_modele_vision/` | Entraînement YOLOv8-seg, poids, résultats, architecture |
| `03_logique_nutritionnelle/` | Portion, besoins (Mifflin), règles médicales, recommandation |
| `04_plateforme/` | Backend Flask + Frontend React |
| `05_tests/` | Tests utilisateurs |
| `rapport/`, `poster/` | Livrables PDF |

---

## Installation

```bash
# 1. Cloner
git clone <lien_du_depot>
cd Nom1_Nom2

# 2. Environnement Python (3.10+)
python -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
pip install -r requirements.txt
```

Les données ne sont pas versionnées (voir `data/README_data.md` pour les télécharger).

---

## Pipeline de réalisation

1. **Préparation & données** — structure, téléchargement, conversion FoodSeg103 → YOLO, base USDA
2. **Modèle de vision** — entraînement YOLOv8-seg sur Kaggle, évaluation (mIoU, mAP)
3. **Logique nutritionnelle** — portion, besoins, règles, recommandation
4. **Plateforme web** — backend Flask + frontend React
5. **Tests & soutenance** — tests, rapport, poster, démo

Détails complets dans `rapport/` (cahier des charges).

---

## Stack

Python · PyTorch · Ultralytics YOLOv8 · scikit-learn · Flask · PostgreSQL · React · Chart.js

## Dépôt GitHub

Lien : _________________
