"""
Estimation de portion (Étape 3)
===============================
À partir des masques de YOLOv8-seg :
  surface (pixels) de chaque aliment -> portion estimée (grammes)
  -> association aux valeurs USDA -> nutriments totaux de l'assiette.

TODO :
  - calculer l'aire de chaque masque,
  - convertir aire -> grammes (calibration simple / objet de référence),
  - sommer les nutriments via la table de correspondance classe -> USDA.

Limite assumée : une surface 2D n'est pas un volume 3D -> approximation.
"""

def aire_masque(masque):
    """Nombre de pixels actifs d'un masque binaire."""
    return int(masque.sum())

def estimer_assiette(detections):
    """detections : liste de (classe, masque). Retourne les nutriments cumulés."""
    raise NotImplementedError("À implémenter à l'étape 3.")
