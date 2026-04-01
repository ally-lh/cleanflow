#!/usr/bin/env python3
"""
Generate CLIP embeddings for rental catalog images
Works on Mac without PyTorch MPS issues!
"""

import os
import json
import sys
from pathlib import Path

os.environ['CUDA_VISIBLE_DEVICES'] = ''

import torch
torch.set_num_threads(4)

import open_clip
from PIL import Image

IMG_STORAGE_DIR = Path(__file__).parent.parent.parent / "data" / "img"
EMBEDDINGS_FILE = Path(__file__).parent / "embeddings_rental.json"

def get_image_files():
    """Get all image files from img_storage directory"""
    extensions = ['.jpg', '.jpeg', '.png', '.webp']
    files = []
    for ext in extensions:
        files.extend(IMG_STORAGE_DIR.glob(f"*{ext}"))
    return sorted(files)

def generate_rental_embeddings(force=False):
    """Generate embeddings for rental catalog images"""
    
    if EMBEDDINGS_FILE.exists() and not force:
        print("Loading cached rental embeddings...")
        with open(EMBEDDINGS_FILE) as f:
            data = json.load(f)
        return data["embeddings"], data["metadata"]
    
    print("Loading OpenCLIP model (laion2b_e16 - fashion-trained)...")
    model, _, transform = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_e16')
    model.eval()
    
    image_files = get_image_files()
    print(f"Found {len(image_files)} images in {IMG_STORAGE_DIR}")
    
    embeddings = []
    metadata = []
    
    for i, img_path in enumerate(image_files):
        try:
            image = Image.open(img_path).convert('RGB')
            image = transform(image).unsqueeze(0)
            
            with torch.no_grad():
                features = model.encode_image(image)
                features = features / features.norm(dim=-1, keepdim=True)
                embedding = features[0].numpy().tolist()
            
            embeddings.append(embedding)
            
            filename = img_path.stem
            metadata.append({
                "image_path": str(img_path),
                "relative_path": img_path.name,
            })
            
        except Exception as e:
            print(f"Error processing {img_path}: {e}")
        
        if (i + 1) % 5 == 0:
            print(f"Processed {i+1}/{len(image_files)}")
    
    del model
    
    with open(EMBEDDINGS_FILE, 'w') as f:
        json.dump({"embeddings": embeddings, "metadata": metadata}, f)
    
    print(f"Saved {len(metadata)} embeddings to {EMBEDDINGS_FILE}")
    return embeddings, metadata

def search_rental(query, embeddings_file=None, top_k=5):
    """Search rental catalog using CLIP"""
    if embeddings_file is None:
        embeddings_file = EMBEDDINGS_FILE
    
    if not Path(embeddings_file).exists():
        print("No embeddings found. Run generate_rental_embeddings first.")
        return []
    
    with open(embeddings_file) as f:
        data = json.load(f)
    
    embeddings = data["embeddings"]
    metadata = data["metadata"]
    
    print("Loading model for search (laion2b_e16)...")
    model, _, _ = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_e16')
    model.eval()
    
    with torch.no_grad():
        text = open_clip.tokenize([query])
        features = model.encode_text(text)
        features = features / features.norm(dim=-1, keepdim=True)
        query_emb = features[0].numpy().tolist()
    
    del model
    
    similarities = []
    for i, emb in enumerate(embeddings):
        sim = sum(a*b for a,b in zip(query_emb, emb))
        similarities.append((sim, i))
    
    similarities.sort(reverse=True)
    
    return [{**metadata[idx], "similarity": float(sim)} for sim, idx in similarities[:top_k]]

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--regenerate", action="store_true", help="Force regenerate embeddings")
    p.add_argument("--query", help="Search query")
    args = p.parse_args()
    
    if args.regenerate:
        generate_rental_embeddings(force=True)
    
    if args.query:
        results = search_rental(args.query)
        print(f"\nResults for '{args.query}':")
        for r in results:
            print(f"  {r['relative_path']} - similarity: {r['similarity']:.3f}")
