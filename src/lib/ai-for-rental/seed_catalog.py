#!/usr/bin/env python3
"""
Seed clothing catalog to Prisma database with CLIP embeddings
Run: python seed_catalog.py clothing_catalog_export.json

This script:
1. Reads the JSON with Supabase image URLs
2. Generates CLIP embeddings from local images
3. Saves everything to Supabase/Prisma database
"""

import json
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

# Setup CLIP
os.environ['CUDA_VISIBLE_DEVICES'] = ''
import torch
torch.set_num_threads(4)
import open_clip
from PIL import Image

print("Loading CLIP model...")
model, _, transform = open_clip.create_model_and_transforms('ViT-B-32', pretrained='openai')
model.eval()
print("Model loaded!\n")

def generate_embedding(image_path):
    """Generate CLIP embedding for an image"""
    try:
        img = Image.open(image_path).convert('RGB')
        img_tensor = transform(img).unsqueeze(0)
        
        with torch.no_grad():
            features = model.encode_image(img_tensor)
            features = features / features.norm(dim=-1, keepdim=True)
            return features[0].numpy().tolist()
    except Exception as e:
        print(f"Error embedding {image_path}: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python seed_catalog.py <json_file>")
        print("Example: python seed_catalog.py clothing_catalog_export.json")
        sys.exit(1)
    
    json_file = sys.argv[1]
    
    if not os.path.exists(json_file):
        print(f"Error: {json_file} not found")
        sys.exit(1)
    
    with open(json_file, 'r') as f:
        items = json.load(f)
    
    # Connect to Supabase/Prisma
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not set in .env")
        sys.exit(1)
    
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print(f"📦 Processing {len(items)} items...\n")
    
    success = 0
    failed = 0
    
    for i, item in enumerate(items):
        try:
            # Skip if imageUrl is still placeholder
            if item.get("imageUrl") == "REPLACE_WITH_SUPABASE_URL":
                print(f"[{i+1}] Skipping - no Supabase URL")
                failed += 1
                continue
            
            # Generate embedding from local image
            local_path = item.get("localImagePath")
            if not local_path:
                print(f"[{i+1}] Skipping - no local path")
                failed += 1
                continue
            
            # Construct full path - assumes script runs from project root
            img_dir = "src/lib/ai-for-rental/DeepFashion/img"
            full_path = os.path.join(os.path.dirname(__file__), "..", "..", img_dir, local_path)
            
            if not os.path.exists(full_path):
                print(f"[{i+1}] Image not found: {full_path}")
                failed += 1
                continue
            
            print(f"[{i+1}/{len(items)}] Processing: {item['name']}...", end=" ")
            
            embedding = generate_embedding(full_path)
            if not embedding:
                print("❌ Embedding failed")
                failed += 1
                continue
            
            # Insert into Prisma
            cur.execute("""
                INSERT INTO "ClothingItem" (
                    name, "imageUrl", category, brand, "pricePerMonth",
                    sizes, "sizeQuantities", description, "isAvailable", embedding
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                item["name"],
                item["imageUrl"],
                item["category"],
                item["brand"],
                item["pricePerMonth"],
                item["sizes"],
                json.dumps(item.get("sizeQuantities", {})),
                item.get("description", ""),
                item.get("isAvailable", True),
                json.dumps(embedding)
            ))
            
            conn.commit()
            print("✅ Done")
            success += 1
            
        except Exception as e:
            print(f"❌ Error: {e}")
            failed += 1
    
    cur.close()
    conn.close()
    
    print(f"\n✅ Complete! {success} items seeded, {failed} failed")

if __name__ == "__main__":
    main()