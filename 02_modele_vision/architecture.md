# Architecture du modèle de vision

## Modèle : YOLOv8-seg (CNN de segmentation d'instances)

YOLOv8-seg est un **réseau de neurones convolutif profond**. Contrairement à un
simple classifieur (1 image → 1 étiquette), il **segmente plusieurs aliments**
dans une même assiette et fournit, pour chacun, sa classe et son masque au pixel près.

### Pourquoi ce choix
- Les vraies assiettes contiennent plusieurs aliments mélangés → la classification
  d'un plat unique (type Food-101) ne suffit pas.
- Le **masque** donne la **surface** de chaque aliment → base de l'estimation de portion.
- Architecture éprouvée, optimisée, entraînable sur GPU gratuit (Kaggle).

### Schéma simplifié

```
Image (640 x 640 x 3)
        │
        ▼
Backbone CNN (CSPDarknet)        ── extraction de caractéristiques
        │
        ▼
Neck (PANet / FPN)               ── fusion multi-échelles
        │
        ├─► Tête de détection     ── classe + boîte de chaque aliment
        └─► Tête de segmentation  ── masque (prototypes + coefficients)
        │
        ▼
Pour chaque aliment : classe + masque (pixels) + confiance
```

### Entraînement
- **Transfer learning** : initialisation avec les poids pré-entraînés (COCO).
- Dataset : FoodSeg103 converti au format YOLO (voir `01_preparation_donnees/`).
- Plateforme : Kaggle (GPU gratuit), mode batch + checkpoints.
- Variante : `yolov8s-seg` (compromis vitesse/précision) ; `yolov8n-seg` si budget serré.

### Métriques
- **mAP50-95** et **mAP50** (qualité des masques et des boîtes).
- **mIoU** (recouvrement moyen des masques).
- Remarque honnête : performance mesurée sur le set de test ; en conditions réelles
  (assiettes mixtes, angles, éclairage), elle sera inférieure.

## Module nutritionnel (rappel : pas de réseau)

Le calcul des besoins n'utilise **pas** de réseau de neurones mais la formule médicale
**Mifflin-St Jeor** (déterministe, explicable, validée). Voir
`03_logique_nutritionnelle/besoins_mifflin.py`.

## Option : LSTM de prévision

Un réseau récurrent (LSTM/GRU) pourra être ajouté pour prévoir la tendance
nutritionnelle à partir de l'historique des repas (données séquentielles), branché
sur le suivi hebdomadaire. À réaliser **après** validation du cœur fonctionnel.
