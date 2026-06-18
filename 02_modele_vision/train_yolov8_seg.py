"""
Entrainement du CNN de segmentation (YOLOv8-seg)
================================================

A executer de preference sur Kaggle (GPU gratuit P100/T4), en mode
"Save & Run All" pour que l'entrainement continue en arriere-plan.

Prerequis : avoir lance la conversion (conversion_foodseg_yolo.py) qui produit
le fichier data.yaml.

Usage :
    python train_yolov8_seg.py --data data/yolo_dataset/data.yaml --epochs 80

Conseils Kaggle (version gratuite) :
  - modele leger : yolov8s-seg (bon compromis) ou yolov8n-seg (plus rapide).
  - imgsz 640 (ou 512 pour gagner du temps).
  - sauvegarder les poids regulierement (save_period) pour ne rien perdre.
"""

import argparse


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="chemin du data.yaml")
    parser.add_argument("--model", default="yolov8s-seg.pt", help="modele de base")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--name", default="foodseg_yolov8s")
    args = parser.parse_args()

    from ultralytics import YOLO

    model = YOLO(args.model)  # poids pre-entraines (transfer learning)
    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        name=args.name,
        patience=15,          # early stopping
        save_period=5,        # checkpoint tous les 5 epochs (securite Kaggle)
        plots=True,           # genere les courbes dans results/
    )

    # Evaluation sur le set de validation
    metrics = model.val()
    print("mAP50-95 (masque) :", metrics.seg.map)
    print("mAP50    (masque) :", metrics.seg.map50)

    # Export des poids finaux
    model.export(format="onnx")  # optionnel, pour le deploiement


if __name__ == "__main__":
    main()
