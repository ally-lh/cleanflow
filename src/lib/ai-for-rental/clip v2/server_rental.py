#!/usr/bin/env python3
"""
FastAPI server for Rental Catalog Style Assistant
Combines keyword matching with CLIP similarity search
"""

import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''

import json
import re
from pathlib import Path
from typing import List, Dict, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import uvicorn
import torch
torch.set_num_threads(4)

try:
    import open_clip
    from PIL import Image
    CLIP_AVAILABLE = True
except ImportError:
    CLIP_AVAILABLE = False

DATA_DIR = Path(__file__).parent
IMAGES_DIR = DATA_DIR.parent.parent / "data" / "img"
EMBEDDINGS_FILE = DATA_DIR / "embeddings_rental.json"
CATALOG_FILE = DATA_DIR / "rental_catalog_data.json"

embeddings = []
metadata = []
catalog = []
model = None

CLOTHING_TYPES = ["dress", "jumpsuit", "romper", "top", "suit", "vest", "jacket"]
OCCASION_KEYWORDS = {
    "work": ["work", "office", "business", "professional", "career"],
    "casual": ["casual", "relaxed", "everyday", "day", "brunch", "lunch"],
    "festive": ["festive", "celebration", "chinese new year", "christmas", "holiday"],
    "dinner": ["dinner", "evening", "formal", "gala", "party", "date", "night"],
}

def load_catalog():
    global catalog
    if CATALOG_FILE.exists():
        with open(CATALOG_FILE) as f:
            catalog = json.load(f)
    else:
        catalog = []
    return catalog

def generate_embeddings_from_images():
    global embeddings, metadata, model
    
    if not CLIP_AVAILABLE:
        print("CLIP not available!")
        return [], []
    
    image_files = []
    for ext in ['.jpg', '.jpeg', '.png', '.webp']:
        image_files.extend(sorted(IMAGES_DIR.glob(f"*{ext}")))
    
    print(f"Found {len(image_files)} images")
    
    if not image_files:
        print(f"No images found in {IMAGES_DIR}")
        return [], []
    
    print("Loading OpenCLIP model (laion2b_e16 - fashion-trained)...")
    model, _, transform = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion/CLIP-ViT-B-32-laion2B-s34B-b79K')
    model.eval()
    
    embeddings = []
    metadata = []
    
    for i, img_path in enumerate(image_files):
        try:
            image = Image.open(img_path).convert('RGB')
            image_tensor = transform(image).unsqueeze(0)
            
            with torch.no_grad():
                features = model.encode_image(image_tensor)
                features = features / features.norm(dim=-1, keepdim=True)
                embedding = features[0].numpy().tolist()
            
            embeddings.append(embedding)
            metadata.append({
                "image_filename": img_path.name,
                "relative_path": img_path.name,
            })
            
        except Exception as e:
            print(f"Error: {img_path}: {e}")
        
        if (i + 1) % 5 == 0:
            print(f"Processed {i+1}/{len(image_files)}")
    
    with open(EMBEDDINGS_FILE, 'w') as f:
        json.dump({"embeddings": embeddings, "metadata": metadata}, f)
    
    print(f"Saved {len(metadata)} embeddings")
    return embeddings, metadata

def load_embeddings():
    global embeddings, metadata, model
    
    if not EMBEDDINGS_FILE.exists():
        print("Generating embeddings...")
        generate_embeddings_from_images()
        return
    
    try:
        with open(EMBEDDINGS_FILE) as f:
            data = json.load(f)
        embeddings = data["embeddings"]
        metadata = data["metadata"]
        print(f"Loaded {len(embeddings)} embeddings")
        
        if CLIP_AVAILABLE and embeddings:
            print("Loading CLIP model...")
            model, _, _ = open_clip.create_model_and_transforms('ViT-B-32', pretrained='openai')
            model.eval()
    except Exception as e:
        print(f"Error loading embeddings: {e}")
        embeddings = []
        metadata = []

def clip_search(query, top_k=14):
    global model
    
    if not embeddings or not CLIP_AVAILABLE or model is None:
        print("CLIP not available or no embeddings")
        return []
    
    if not metadata:
        print("No metadata available")
        return []
    
    try:
        with torch.no_grad():
            text = open_clip.tokenize([query])
            features = model.encode_text(text)
            features = features / features.norm(dim=-1, keepdim=True)
            query_emb = features[0].numpy().tolist()
        
        similarities = []
        for i, emb in enumerate(embeddings):
            sim = sum(a*b for a,b in zip(query_emb, emb))
            similarities.append((sim, i))
        
        similarities.sort(reverse=True)
        
        results = []
        for sim, idx in similarities[:top_k]:
            if idx < len(metadata):
                rel_path = metadata[idx].get("relative_path", metadata[idx].get("image_filename", ""))
                results.append({
                    "index": idx,
                    "similarity": float(sim),
                    "relative_path": rel_path,
                    "image_filename": rel_path,
                })
        
        print(f"CLIP returned {len(results)} results")
        return results
    except Exception as e:
        print(f"CLIP search error: {e}")
        import traceback
        traceback.print_exc()
        return []

def extract_budget(query):
    budget_patterns = [
        r'under\s*(?:sgd?\s*)?(\d+)',
        r'budget\s*(?:of\s*)?(?:sgd?\s*)?(\d+)',
        r'less\s*than\s*(?:sgd?\s*)?(\d+)',
        r'below\s*(?:sgd?\s*)?(\d+)',
        r'not\s*(?:more\s*than\s*)?(?:sgd?\s*)?(\d+)',
        r'(?:sgd?\s*)?(\d+)\s*(?:and\s*below|or\s*less)',
    ]
    
    for pattern in budget_patterns:
        match = re.search(pattern, query.lower())
        if match:
            return int(match.group(1))
    return None

def analyze_query_type(query):
    words = query.lower().split()
    known_keywords = set([
        "wear", "clothing", "dress", "outfit", "style", "fashion", "jumpsuit",
        "romper", "top", "suit", "vest", "jacket", "color", "casual", "formal", 
        "party", "wedding", "work", "office", "evening", "elegant", "cheap", 
        "budget", "black", "white", "blue", "green", "yellow", "red", "pink", 
        "beige", "grey", "luxury", "expensive", "premium", "affordable", "chic",
        "vintage", "modern", "sleek", "bold", "soft", "flowy", "fitted"
    ])
    known_count = sum(1 for w in words if w in known_keywords)
    total_words = len(words)
    known_ratio = known_count / total_words if total_words > 0 else 0
    
    if known_ratio >= 0.5:
        return "keyword_heavy", 0.8
    elif known_ratio >= 0.2:
        return "mixed", 0.5
    else:
        return "descriptive", 0.2

def keyword_search(query, budget=None):
    q = query.lower()
    scores = []
    query_words = set(q.replace(",", " ").replace(".", " ").split())
    
    for item in catalog:
        score = 0
        
        name = item.get("name", "").lower()
        category = item.get("category", "").lower()
        occasion = item.get("occasion", "").lower()
        color = item.get("color", "").lower()
        description = item.get("description", "").lower()
        brand = item.get("brand", "").lower()
        price = float(item.get("price", 0))
        
        if category in q:
            score += 5
        
        for key, keywords in OCCASION_KEYWORDS.items():
            if any(kw in q for kw in keywords):
                if key in occasion:
                    score += 4
        
        if color in q:
            score += 3
        
        clothing_words = ["dress", "gown", "jumpsuit", "romper", "top", "suit", "vest", "jacket"]
        for word in clothing_words:
            if word in q and word in name:
                score += 5
        
        if brand in q:
            score += 2
        
        if any(w in q for w in ["cheap", "budget", "affordable", "under"]):
            if budget and price <= budget:
                score += 8
            elif price < 50:
                score += 3
        
        if any(w in q for w in ["expensive", "luxury", "premium", "elegant", "sophisticated"]):
            if price > 80:
                score += 3
        
        if "formal" in q or "gala" in q:
            if item.get("category") in ["Dress", "Suit"]:
                score += 3
        
        for word in query_words:
            if word in description:
                score += 1
        
        scores.append({
            "id": item.get("id"),
            "image_filename": item.get("image", "").split("/")[-1] if item.get("image") else "",
            "keyword_score": score,
            "price": price,
        })
    
    return scores

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_catalog()
    load_embeddings()
    print(f"Loaded {len(catalog)} catalog items and {len(embeddings)} embeddings")
    yield

app = FastAPI(title="Rental Style Assistant API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    history: List[Dict] = []
    current_items: List[Dict] = []

@app.get("/")
def root():
    return {"message": "Rental Style Assistant API", "items": len(catalog)}

@app.get("/health")
def health():
    return {
        "status": "healthy", 
        "catalog_items": len(catalog), 
        "embeddings": len(embeddings), 
        "clip_available": CLIP_AVAILABLE
    }

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        user_message = request.message.lower().strip()
        print(f"Received query: {user_message}")
        
        fashion_keywords = [
            "wear", "clothing", "dress", "outfit", "style", "fashion", "jumpsuit", 
            "romper", "top", "suit", "color", "casual", "formal", "party", "wedding",
            "work", "office", "evening", "elegant", "cheap", "budget", "black", "white",
            "blue", "green", "yellow", "red", "pink", "beige", "grey", "luxury",
            "expensive", "premium", "affordable", "chic", "vintage", "modern"
        ]
        
        if not any(kw in user_message for kw in fashion_keywords):
            return {
                "response": "I'm a fashion style assistant for rental clothing. Tell me about what you're looking for - the event, style, colors, or budget!",
                "suggest_items": False,
                "items": []
            }
        
        query_type, keyword_weight = analyze_query_type(user_message)
        clip_weight = 1 - keyword_weight
        
        budget = extract_budget(user_message)
        print(f"Budget: {budget}, Query type: {query_type}")
        
        keyword_scores = keyword_search(user_message, budget)
        
        clip_results = clip_search(user_message, top_k=14)
        
        print(f"CLIP results: {len(clip_results)}")
        for cr in clip_results[:3]:
            print(f"  - {cr.get('image_filename')}: {cr.get('similarity')}")
        
        combined = []
        for kw in keyword_scores:
            clip_sim = 0
            for clip in clip_results:
                if kw.get("image_filename") == clip.get("image_filename"):
                    clip_sim = clip.get("similarity", 0)
                    break
            
            normalized_keyword = min(kw["keyword_score"] / 15, 1.0)
            final_score = (keyword_weight * normalized_keyword) + (clip_weight * clip_sim)
            
            combined.append({
                "id": kw["id"],
                "image_filename": kw["image_filename"],
                "keyword_score": kw["keyword_score"],
                "keyword_percent": int(normalized_keyword * 100),
                "clip_similarity": clip_sim,
                "clip_percent": int(clip_sim * 100),
                "final_percent": int(final_score * 100),
            })
        
        combined.sort(key=lambda x: x["final_percent"], reverse=True)
        top_items = combined[:5]
        
        print(f"Top items: {[t['id'] for t in top_items]}")
        
        response_items = []
        for result in top_items:
            item = next((i for i in catalog if i["id"] == result["id"]), None)
            if item:
                response_items.append({
                    "id": item["id"],
                    "name": item.get("name", ""),
                    "image": item.get("image", ""),
                    "category": item.get("category", ""),
                    "price": item.get("price", 0),
                    "color": item.get("color", ""),
                    "occasion": item.get("occasion", ""),
                    "brand": item.get("brand", ""),
                    "description": item.get("description", ""),
                    "keyword_percent": result["keyword_percent"],
                    "clip_percent": result["clip_percent"],
                    "final_percent": result["final_percent"],
                })
        
        if not response_items:
            return {
                "response": "I couldn't find any items matching your description.",
                "suggest_items": False,
                "items": []
            }
        
        top_item = response_items[0]
        response = f"I found {len(response_items)} items for you! "
        response += f"Top pick: {top_item['name']} - {top_item['category']} for {top_item['occasion']}."
        
        return {
            "response": response,
            "suggest_items": True,
            "items": response_items,
            "query_type": query_type,
            "weights": {"keyword": keyword_weight, "clip": clip_weight},
            "budget_used": budget
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "response": f"Sorry, I encountered an error: {str(e)}",
                "suggest_items": False,
                "items": []
            }
        )

@app.get("/catalog")
def get_catalog():
    return {"items": catalog}

@app.post("/refresh")
def refresh():
    load_catalog()
    load_embeddings()
    return {"status": "refreshed", "catalog": len(catalog), "embeddings": len(embeddings)}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
