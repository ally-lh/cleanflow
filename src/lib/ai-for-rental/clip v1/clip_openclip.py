#!/usr/bin/env python3
"""
Style Assistant using OpenCLIP
Works on Mac without PyTorch MPS issues!
"""

import os
import json
import numpy as np
from pathlib import Path
from PIL import Image

# Disable CUDA/MPS to force CPU
os.environ['CUDA_VISIBLE_DEVICES'] = ''

import torch
torch.set_num_threads(4)

import open_clip
from collections import defaultdict

CATEGORY_MAP = {41: "Dress", 42: "Jumpsuit", 48: "Romper"}

PAIRING = {
    "Dress": ["Statement necklace", "Clutch bag", "Strappy heels", "Light cardigan"],
    "Jumpsuit": ["Belt", "Statement earrings", "Pointed-toe heels", "Structured handbag"],
    "Romper": ["Sandals", "Sun hat", "Delicate jewelry", "Small crossbody bag"]
}

def load_annotations(anno_file):
    annotations = []
    with open(anno_file, 'r') as f:
        lines = f.readlines()[2:]
    for line in lines:
        parts = line.strip().split()
        if len(parts) >= 4:
            img_path = parts[0]
            if img_path.startswith("img/"):
                img_path = img_path[4:]
            cat = int(parts[1])
            brand = parts[2]
            price = float(parts[3])
            annotations.append({
                "image_path": img_path,
                "category_label": cat,
                "category_name": CATEGORY_MAP.get(cat, "Unknown"),
                "brand": brand,
                "price": price
            })
    return annotations

def generate_embeddings(data_dir, force=False):
    data_dir = Path(data_dir)
    images_dir = data_dir / "DeepFashion" / "img"
    anno_file = data_dir / "DeepFashion" / "anno" / "list_category_img.txt"
    emb_file = data_dir / "embeddings_clip.json"
    
    if emb_file.exists() and not force:
        print("Loading cached embeddings...")
        with open(emb_file) as f:
            data = json.load(f)
        return data["embeddings"], data["metadata"]
    
    print("Loading OpenCLIP model...")
    model, _, transform = open_clip.create_model_and_transforms('ViT-B-32', pretrained='openai')
    model.eval()
    
    annotations = load_annotations(anno_file)
    print(f"Processing {len(annotations)} images...")
    
    embeddings = []
    metadata = []
    
    for i, ann in enumerate(annotations):
        img_path = images_dir / ann["image_path"]
        if not img_path.exists():
            continue
        
        try:
            image = Image.open(img_path).convert('RGB')
            image = transform(image).unsqueeze(0)
            
            with torch.no_grad():
                features = model.encode_image(image)
                features = features / features.norm(dim=-1, keepdim=True)
                embedding = features[0].numpy().tolist()
            
            embeddings.append(embedding)
            
            metadata.append({
                "id": i,
                "image_path": str(img_path),
                "relative_path": ann["image_path"],
                "category_label": ann["category_label"],
                "category_name": ann["category_name"],
                "brand": ann.get("brand", "StyleRent"),
                "price": ann.get("price", 45),
                "sizes": ["XS", "S", "M", "L", "XL"],
                "description": f"Beautiful {ann['category_name'].lower()} perfect for any occasion"
            })
            
        except Exception as e:
            print(f"Error: {img_path}: {e}")
        
        if (i + 1) % 10 == 0:
            print(f"Processed {i+1}/{len(annotations)}")
    
    del model
    
    with open(emb_file, 'w') as f:
        json.dump({"embeddings": embeddings, "metadata": metadata}, f)
    
    print(f"Saved {len(metadata)} embeddings")
    return embeddings, metadata

def detect_clothing_type(query):
    """Detect if user mentions a specific clothing type"""
    q = query.lower()
    
    type_mapping = {
        "dress": ["dress", "gown", "maxi", "midi", "mini dress"],
        "jumpsuit": ["jumpsuit", "playsuit", "overall"],
        "romper": ["romper", "playsuit", "onesie"]
    }
    
    for clothing_type, keywords in type_mapping.items():
        if any(kw in q for kw in keywords):
            return clothing_type.capitalize()
    return None


def search(query, embeddings, metadata, top_k=5):
    print("Loading model for search...")
    model, _, _ = open_clip.create_model_and_transforms('ViT-B-32', pretrained='openai')
    model.eval()
    
    # Detect if user specified a clothing type
    requested_type = detect_clothing_type(query)
    print(f"Detected clothing type: {requested_type}")
    
    # Enhance query to include clothing type for better CLIP matching
    if requested_type:
        enhanced_query = f"{query} {requested_type}"
    else:
        enhanced_query = query
    
    with torch.no_grad():
        text = open_clip.tokenize([enhanced_query])
        features = model.encode_text(text)
        features = features / features.norm(dim=-1, keepdim=True)
        query_emb = features[0].numpy().tolist()
    
    del model
    
    similarities = []
    for i, emb in enumerate(embeddings):
        sim = sum(a*b for a,b in zip(query_emb, emb))
        
        # Boost score if category matches requested type
        if requested_type:
            item_category = metadata[i]["category_name"]
            if item_category.lower() == requested_type.lower():
                sim *= 1.5  # 50% boost for matching type
        
        similarities.append((sim, i))
    
    similarities.sort(reverse=True)
    
    return [{**metadata[idx], "similarity": float(sim)} for sim, idx in similarities[:top_k]]

def is_fashion_related(q):
    kw = ["wear", "clothing", "dress", "outfit", "style", "fashion", "jumpsuit", "romper",
          "shoes", "bag", "jewelry", "color", "casual", "formal", "party", "wedding", 
          "summer", "garden", "vibrant", "elegant", "accessories", "heels", "necklace"]
    return any(k in q.lower() for k in kw)

def get_pairings(cat):
    return PAIRING.get(cat, ["Accessories"])

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default=".")
    p.add_argument("--query")
    p.add_argument("--regenerate", action="store_true")
    args = p.parse_args()
    
    embeddings, metadata = generate_embeddings(args.data_dir, args.regenerate)
    
    if args.query:
        results = search(args.query, embeddings, metadata)
        print("\nResults:")
        for r in results:
            print(f"  {r['relative_path']} ({r['category_name']}) - {r['similarity']:.3f}")
