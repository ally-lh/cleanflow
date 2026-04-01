#!/usr/bin/env python3
"""
FastAPI server using OpenCLIP
Reads embeddings from Prisma/Supabase database
Works on Mac without GPU issues!
"""

import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''

import json
import sys
from pathlib import Path
from typing import List, Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import torch
torch.set_num_threads(4)

import open_clip
import psycopg2

from clip_openclip import generate_embeddings, search, is_fashion_related, get_pairings, PAIRING, load_annotations

app = FastAPI(title="Style Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent
embeddings = []
metadata = []

# Prisma database connection
def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("⚠️  DATABASE_URL not set, using local embeddings fallback")
        return None
    return psycopg2.connect(db_url)

def load_embeddings_from_prisma():
    """Load embeddings from Prisma database"""
    global embeddings, metadata
    
    conn = get_db_connection()
    if not conn:
        print("📁 Loading embeddings from local JSON (fallback)")
        return False
    
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('SELECT id, name, "imageUrl", category, brand, "pricePerMonth", sizes, description, embedding FROM "ClothingItem" WHERE embedding IS NOT NULL')
        rows = cur.fetchall()
        
        if not rows:
            print("⚠️  No embeddings found in database, using local JSON fallback")
            return False
        
        print(f"📦 Loading {len(rows)} embeddings from Prisma...")
        
        embeddings = []
        metadata = []
        
        for i, row in enumerate(rows):
            embedding = json.loads(row['embedding'])
            embeddings.append(embedding)
            
            metadata.append({
                "id": row['id'],
                "image_path": "",  # Not needed from DB
                "relative_path": row['imageUrl'].split("/")[-1] if row['imageUrl'] else "",
                "category_name": row['category'] if row['category'] else "Unknown",
                "brand": row.get('brand', 'StyleRent'),
                "price": row.get('pricePerMonth', 45),
                "sizes": row.get('sizes', ["XS", "S", "M", "L", "XL"]),
                "description": row.get('description', ''),
                "imageUrl": row.get('imageUrl', ''),
                "name": row.get('name', ''),
            })
        
        cur.close()
        conn.close()
        
        print(f"✅ Loaded {len(embeddings)} items from Prisma!")
        return True
        
    except Exception as e:
        print(f"❌ Error loading from Prisma: {e}")
        print("📁 Falling back to local JSON embeddings")
        return False


class ChatRequest(BaseModel):
    message: str
    history: List[Dict] = []
    current_items: List[Dict] = []


@app.on_event("startup")
async def startup():
    global embeddings, metadata
    
    # Try to load from Prisma first, fallback to local JSON
    if not load_embeddings_from_prisma():
        # Fallback: generate from local files (for initial setup)
        print("🔄 Generating embeddings from local files...")
        embeddings, metadata = generate_embeddings(str(DATA_DIR))


@app.get("/")
def root():
    return {"message": "Style Assistant API is running"}


@app.get("/health")
def health():
    return {"status": "healthy", "items": len(metadata)}


@app.post("/chat")
def chat(request: ChatRequest):
    user_message = request.message.lower().strip()
    
    if not is_fashion_related(user_message):
        return {
            "response": "I'm a fashion style assistant. I can help you find the perfect outfit for any occasion! Tell me about what you're looking for - like the event, your style preferences, or colors you like.",
            "suggest_items": False,
            "items": [],
            "pairing_suggestions": []
        }
    
    results = search(user_message, embeddings, metadata, top_k=5)
    
    if not results:
        return {
            "response": "I couldn't find any items matching your description. Try describing the occasion, style, or colors you're looking for!",
            "suggest_items": False,
            "items": [],
            "pairing_suggestions": []
        }
    
    items = [
        {
            "id": r.get("id", idx),
            "name": r.get("name", ""),
            "imageUrl": r.get("imageUrl", ""),
            "image_path": r.get("relative_path", ""),
            "category": r.get("category_name", ""),
            "similarity": r["similarity"],
            "brand": r.get("brand", ""),
            "price": r.get("price", 0),
            "subscription_price": round(r.get("price", 0) * 1.5, 2),
            "sizes": r.get("sizes", ["XS", "S", "M", "L", "XL"]),
            "description": r.get("description", ""),
        }
        for idx, r in enumerate(results)
    ]
    
    top_category = results[0]["category_name"]
    pairing_suggestions = get_pairings(top_category)
    
    response = f"I found {len(items)} items that match '{request.message}'! "
    response += f"The top match is a beautiful {top_category.lower()}."
    
    return {
        "response": response,
        "suggest_pairing": True,
        "items": items,
        "pairing_suggestions": pairing_suggestions,
        "current_category": top_category
    }


@app.get("/catalog")
def get_catalog():
    return {"items": metadata}


@app.post("/refresh")
def refresh_embeddings():
    """Manually refresh embeddings from database"""
    load_embeddings_from_prisma()
    return {"status": "refreshed", "items": len(metadata)}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)