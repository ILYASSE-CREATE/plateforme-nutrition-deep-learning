"""
Amelioration du modele de segmentation alimentaire - regroupe + filtre les classes rares.
Usage Kaggle :
    !python remap_and_train.py --src /kaggle/working/foodseg_yolo --out /kaggle/working/foodseg_clean --min-instances 30 --epochs 120
"""

import argparse
import os
import shutil
from collections import Counter


FOODSEG103 = [
    "candy", "egg tart", "french fries", "chocolate", "biscuit", "popcorn",
    "pudding", "ice cream", "cheese butter", "cake", "wine", "milkshake",
    "coffee", "juice", "milk", "tea", "almond", "red beans", "cashew",
    "dried cranberries", "soy", "walnut", "peanut", "egg", "apple", "date",
    "apricot", "avocado", "banana", "strawberry", "cherry", "blueberry",
    "raspberry", "mango", "olives", "peach", "lemon", "pear", "fig",
    "pineapple", "grape", "kiwi", "melon", "orange", "watermelon", "steak",
    "pork", "chicken duck", "sausage", "fried meat", "lamb", "sauce", "crab",
    "fish", "shellfish", "shrimp", "soup", "bread", "corn", "hamburg",
    "pizza", "hanamaki baozi", "wonton dumplings", "pasta", "noodles", "rice",
    "pie", "tofu", "eggplant", "potato", "garlic", "cauliflower", "tomato",
    "kelp", "seaweed", "spring onion", "rape", "ginger", "okra", "lettuce",
    "pumpkin", "cucumber", "white radish", "carrot", "asparagus",
    "bamboo shoots", "broccoli", "celery stick", "cilantro mint", "snow peas",
    "cabbage", "bean sprouts", "onion", "pepper", "green beans", "French beans",
    "king oyster mushroom", "shiitake", "enoki mushroom", "oyster mushroom",
    "white button mushroom", "salad", "other ingredients",
]

GROUPES = {
    "king oyster mushroom": "mushroom", "shiitake": "mushroom",
    "enoki mushroom": "mushroom", "oyster mushroom": "mushroom",
    "white button mushroom": "mushroom",
    "steak": "meat", "pork": "meat", "lamb": "meat", "fried meat": "meat",
    "sausage": "meat", "hamburg": "meat",
    "crab": "seafood", "shellfish": "seafood", "shrimp": "seafood",
    "green beans": "beans", "French beans": "beans", "red beans": "beans",
    "snow peas": "beans",
    "almond": "nuts", "cashew": "nuts", "walnut": "nuts", "peanut": "nuts",
    "pasta": "noodles_pasta", "noodles": "noodles_pasta",
    "coffee": "hot_drink", "tea": "hot_drink",
    "cake": "pastry", "pie": "pastry", "egg tart": "pastry", "pudding": "pastry",
    "spring onion": "green_onion", "onion": "green_onion",
}


def nom_groupe(nom):
    return GROUPES.get(nom, nom)


def compter_instances(labels_dir):
    compteur = Counter()
    for fn in os.listdir(labels_dir):
        if not fn.endswith(".txt"):
            continue
        with open(os.path.join(labels_dir, fn)) as f:
            for ligne in f:
                ligne = ligne.strip()
                if not ligne:
                    continue
                idx = int(ligne.split()[0])
                if 0 <= idx < len(FOODSEG103):
                    compteur[nom_groupe(FOODSEG103[idx])] += 1
    return compteur


def construire_mapping(compteur, min_instances):
    gardees = sorted([c for c, n in compteur.items() if n >= min_instances])
    nouveau_index = {nom: i for i, nom in enumerate(gardees)}
    old_to_new = {}
    for old_idx, nom in enumerate(FOODSEG103):
        cible = nom_groupe(nom)
        old_to_new[old_idx] = nouveau_index.get(cible)
    return old_to_new, gardees


def reecrire_split(src_split, out_split, old_to_new):
    img_src = os.path.join(src_split, "images")
    lbl_src = os.path.join(src_split, "labels")
    img_out = os.path.join(out_split, "images")
    lbl_out = os.path.join(out_split, "labels")
    os.makedirs(img_out, exist_ok=True)
    os.makedirs(lbl_out, exist_ok=True)
    if not os.path.isdir(lbl_src):
        return 0
    n_images = 0
    for fn in os.listdir(lbl_src):
        if not fn.endswith(".txt"):
            continue
        lignes_gardees = []
        with open(os.path.join(lbl_src, fn)) as f:
            for ligne in f:
                ligne = ligne.strip()
                if not ligne:
                    continue
                parts = ligne.split()
                old_idx = int(parts[0])
                new_idx = old_to_new.get(old_idx)
                if new_idx is None:
                    continue
                parts[0] = str(new_idx)
                lignes_gardees.append(" ".join(parts))
        if not lignes_gardees:
            continue
        with open(os.path.join(lbl_out, fn), "w") as f:
            f.write("\n".join(lignes_gardees) + "\n")
        base = os.path.splitext(fn)[0]
        for ext in (".jpg", ".jpeg", ".png"):
            chemin = os.path.join(img_src, base + ext)
            if os.path.exists(chemin):
                shutil.copy(chemin, os.path.join(img_out, base + ext))
                break
        n_images += 1
    return n_images


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--min-instances", type=int, default=30)
    parser.add_argument("--epochs", type=int, default=120)
    parser.add_argument("--model", default="yolov8m-seg.pt")
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--no-train", action="store_true")
    args = parser.parse_args()

    train_dir = os.path.join(args.src, "train")
    val_dir = os.path.join(args.src, "val")
    test_dir = os.path.join(args.src, "test")

    compteur = compter_instances(os.path.join(train_dir, "labels"))
    old_to_new, gardees = construire_mapping(compteur, args.min_instances)

    print("\n=== Classes apres regroupement + filtrage (min %d instances) ===" % args.min_instances)
    print("Avant : 103 classes  ->  Apres : %d classes" % len(gardees))
    droppees = sorted({nom_groupe(FOODSEG103[i]) for i, n in old_to_new.items() if n is None})
    print("Classes gardees :", gardees)
    print("Classes droppees (trop rares) :", droppees, "\n")

    for nom, src in [("train", train_dir), ("val", val_dir), ("test", test_dir)]:
        if os.path.isdir(src):
            n = reecrire_split(src, os.path.join(args.out, nom), old_to_new)
            print("  %s: %d images conservees" % (nom, n))

    split_val = "val" if os.path.isdir(val_dir) else "test"
    yaml_path = os.path.join(args.out, "data.yaml")
    with open(yaml_path, "w") as f:
        f.write("path: %s\n" % os.path.abspath(args.out))
        f.write("train: train/images\n")
        f.write("val: %s/images\n" % split_val)
        f.write("nc: %d\n" % len(gardees))
        f.write("names: %s\n" % gardees)
    print("\ndata.yaml ecrit ->", yaml_path)

    if args.no_train:
        print("\n--no-train : dataset pret, entrainement ignore.")
        return

    from ultralytics import YOLO
    model = YOLO(args.model)
    model.train(
        data=yaml_path, epochs=args.epochs, imgsz=args.imgsz, batch=args.batch,
        name="nutrivision_clean", patience=30, save_period=10, plots=True,
        erasing=0.2,
    )
    metrics = model.val()
    print("mAP50    (masque) :", metrics.seg.map50)
    print("mAP50-95 (masque) :", metrics.seg.map)


if __name__ == "__main__":
    main()