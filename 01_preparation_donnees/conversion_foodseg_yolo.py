"""
Conversion FoodSeg103 -> format YOLOv8-seg
==========================================

FoodSeg103 fournit des masques SEMANTIQUES (une image PNG par photo, ou la valeur
de chaque pixel = l'id de la classe d'aliment, 0 = fond).

YOLOv8-seg attend, pour chaque image, un fichier texte de POLYGONES d'instances :
    <class_index> x1 y1 x2 y2 ... xn yn      (coordonnees normalisees dans [0,1])

Ce script :
  1. parcourt les masques,
  2. extrait un polygone par instance d'aliment (via les contours OpenCV),
  3. ecrit les fichiers .txt au format YOLO,
  4. organise le dataset (images/ + labels/, splits train/val),
  5. genere le fichier data.yaml utilise pour l'entrainement.

Usage :
    python conversion_foodseg_yolo.py --src data/FoodSeg103 --out data/yolo_dataset

Dependances : opencv-python, numpy, tqdm, pyyaml
"""

import argparse
import shutil
from pathlib import Path

import cv2
import numpy as np
import yaml
from tqdm import tqdm

# ---------------------------------------------------------------------------
# Conversion masque -> polygones
# ---------------------------------------------------------------------------
def mask_to_polygons(binary_mask, min_area=200, eps_frac=0.005):
    """Retourne une liste de polygones (Nx2) pour une instance binaire donnee.

    - min_area : on ignore les petites taches (bruit).
    - eps_frac : facteur de simplification du contour (fraction du perimetre).
    """
    contours, _ = cv2.findContours(
        binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    polygons = []
    for contour in contours:
        if cv2.contourArea(contour) < min_area:
            continue
        epsilon = eps_frac * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        if len(approx) < 3:  # un polygone valide a au moins 3 points
            continue
        polygons.append(approx.reshape(-1, 2))
    return polygons


def mask_to_yolo_lines(mask, ignore_id=0):
    """Convertit un masque semantique complet en lignes YOLO (texte)."""
    h, w = mask.shape
    lines = []
    for class_id in np.unique(mask):
        if class_id == ignore_id:  # fond
            continue
        binary = (mask == class_id).astype(np.uint8) * 255
        for poly in mask_to_polygons(binary):
            norm = poly.astype(float)
            norm[:, 0] /= w
            norm[:, 1] /= h
            norm = np.clip(norm, 0.0, 1.0)
            coords = " ".join(f"{x:.6f} {y:.6f}" for x, y in norm)
            # YOLO indexe les classes a partir de 0 -> on decale (1..103 -> 0..102)
            lines.append(f"{int(class_id) - 1} {coords}")
    return lines


# ---------------------------------------------------------------------------
# Traitement d'un split (train / test)
# ---------------------------------------------------------------------------
def convert_split(img_dir, ann_dir, out_img_dir, out_lbl_dir):
    out_img_dir.mkdir(parents=True, exist_ok=True)
    out_lbl_dir.mkdir(parents=True, exist_ok=True)

    ann_files = sorted(ann_dir.glob("*.png"))
    if not ann_files:
        print(f"  [!] Aucun masque .png trouve dans {ann_dir}")
        return 0

    kept = 0
    for ann_path in tqdm(ann_files, desc=f"  {ann_dir.name}", ncols=80):
        stem = ann_path.stem
        # l'image source peut etre .jpg ou .png
        img_path = next(
            (img_dir / f"{stem}{ext}" for ext in (".jpg", ".jpeg", ".png")
             if (img_dir / f"{stem}{ext}").exists()),
            None,
        )
        if img_path is None:
            continue

        mask = cv2.imread(str(ann_path), cv2.IMREAD_GRAYSCALE)
        if mask is None:
            continue

        lines = mask_to_yolo_lines(mask)
        if not lines:  # image sans aliment exploitable -> ignoree
            continue

        shutil.copy(img_path, out_img_dir / img_path.name)
        (out_lbl_dir / f"{stem}.txt").write_text("\n".join(lines))
        kept += 1

    return kept


# ---------------------------------------------------------------------------
# Noms de classes
# ---------------------------------------------------------------------------
def load_class_names(src, nc_default=103):
    """Lit category_id.txt si present, sinon noms generiques."""
    cat_file = src / "category_id.txt"
    if cat_file.exists():
        names = []
        for line in cat_file.read_text(encoding="utf-8", errors="ignore").splitlines():
            parts = line.replace("\t", " ").split(maxsplit=1)
            if len(parts) == 2 and parts[0].isdigit():
                idx = int(parts[0])
                if idx == 0:  # on saute le fond
                    continue
                names.append(parts[1].strip())
        if names:
            return names
    print("  [i] category_id.txt introuvable -> noms generiques class_0..N")
    return [f"class_{i}" for i in range(nc_default)]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="FoodSeg103 -> YOLOv8-seg")
    parser.add_argument("--src", required=True, help="Racine FoodSeg103")
    parser.add_argument("--out", required=True, help="Dossier de sortie YOLO")
    args = parser.parse_args()

    src = Path(args.src)
    out = Path(args.out)

    img_root = src / "Images" / "img_dir"
    ann_root = src / "Images" / "ann_dir"
    if not ann_root.exists():
        raise SystemExit(f"Dossier introuvable : {ann_root}\n"
                         "Verifie le layout (voir data/README_data.md).")

    print("Conversion en cours...")
    # FoodSeg103 : train + test. On mappe 'test' -> 'val' pour YOLO.
    n_train = convert_split(img_root / "train", ann_root / "train",
                            out / "images" / "train", out / "labels" / "train")
    n_val = convert_split(img_root / "test", ann_root / "test",
                          out / "images" / "val", out / "labels" / "val")

    names = load_class_names(src)
    data_yaml = {
        "path": str(out.resolve()),
        "train": "images/train",
        "val": "images/val",
        "nc": len(names),
        "names": names,
    }
    with open(out / "data.yaml", "w", encoding="utf-8") as f:
        yaml.safe_dump(data_yaml, f, allow_unicode=True, sort_keys=False)

    print("\n--- Termine ---")
    print(f"  train : {n_train} images")
    print(f"  val   : {n_val} images")
    print(f"  classes : {len(names)}")
    print(f"  config  : {out / 'data.yaml'}")


if __name__ == "__main__":
    main()
