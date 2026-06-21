"""
Estimation de portion à partir des masques YOLOv8-seg
======================================================
Méthode : ratio surface masque / surface image totale
  → proportion de l'assiette couverte par l'aliment
  → volume approché (surface × hauteur moyenne)
  → poids (volume × densité de l'aliment)

Hypothèse : image prise en vue du dessus d'une assiette standard.
Limite documentée : approximation 2D, non calibrée par objet de référence.
"""

DENSITE = {
    "egg": 1.1, "chicken": 1.05, "beef": 1.05, "fish": 1.0, "salmon": 1.0,
    "rice": 0.8, "bread": 0.3, "pasta": 0.8, "pizza": 0.6, "noodle": 0.7,
    "salad": 0.2, "tomato": 0.95, "broccoli": 0.4, "carrot": 0.75, "potato": 0.8,
    "apple": 0.75, "banana": 0.65, "cheese": 1.1, "yogurt": 1.05,
    "cake": 0.4, "cookie": 0.5, "chocolate": 1.3, "soup": 1.0,
    "burger": 0.5, "sushi": 0.8, "steak": 1.05,
}

PORTION_TYPIQUE = {
    "egg": 60, "chicken": 150, "beef": 180, "fish": 150, "salmon": 150,
    "rice": 200, "bread": 80, "pasta": 200, "pizza": 250, "noodle": 200,
    "salad": 100, "tomato": 120, "broccoli": 150, "carrot": 100, "potato": 180,
    "apple": 180, "banana": 120, "orange": 150, "strawberry": 100,
    "cheese": 40, "yogurt": 150, "milk": 250,
    "cake": 100, "cookie": 30, "chocolate": 50, "ice_cream": 100,
    "soup": 300, "sandwich": 200, "burger": 220,
    "aliment_inconnu": 100,
}


def aire_masque(masque) -> int:
    """Nombre de pixels actifs d'un masque binaire NumPy."""
    return int(masque.sum())


def estimer_poids(classe: str, aire_pixels: int, image_w: int, image_h: int) -> float:
    """
    Estime le poids d'un aliment (grammes) à partir de l'aire de son masque.
    Retourne un poids borné entre 10 g et 600 g.
    """
    if aire_pixels <= 0 or image_w <= 0 or image_h <= 0:
        return float(PORTION_TYPIQUE.get(classe, 100))

    ratio = aire_pixels / (image_w * image_h)
    surface_cm2 = ratio * 500.0
    volume_cm3 = surface_cm2 * 2.0
    densite = DENSITE.get(classe, 0.7)
    poids = volume_cm3 * densite

    return round(max(10.0, min(600.0, poids)), 1)


def estimer_assiette(detections: list) -> list:
    """Enrichit chaque détection avec un poids estimé en grammes."""
    for det in detections:
        masque = det.get("masque")
        w = det.get("image_w", 0)
        h = det.get("image_h", 0)
        aire = aire_masque(masque) if masque is not None else 0
        det["poids_g"] = estimer_poids(det["classe"], aire, w, h)
    return detections


if __name__ == "__main__":
    import numpy as np
    w, h = 640, 480
    masque_sim = np.zeros((h, w), dtype=bool)
    masque_sim[120:360, 160:480] = True

    poids = estimer_poids("chicken", aire_masque(masque_sim), w, h)
    print(f"Poulet (25% de l'image) → {poids} g")