#!/usr/bin/env python3
"""
Marqo FashionCLIP server - specialized for fashion with better color/texture understanding
"""

import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''

import json
from pathlib import Path
from contextlib import asynccontextmanager
import uvicorn
import torch
torch.set_num_threads(4)

from PIL import Image
import open_clip
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

DATA_DIR = Path(__file__).parent.resolve()
RENTAL_IMAGES_DIR = DATA_DIR.parent.parent / "data" / "img"
RENTAL_CATALOG_FILE = DATA_DIR / "rental_catalog_data.json"
EMBEDDINGS_FILE = DATA_DIR / "embeddings_marqo.json"

MODEL_NAME = "Marqo/marqo-fashionCLIP"

catalog = []
embeddings = []
metadata = []
model = None
preprocess_val = None
tokenizer = None

app = FastAPI(title="Marqo FashionCLIP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

def load_catalog():
    global catalog, embeddings, metadata
    
    if RENTAL_CATALOG_FILE.exists():
        with open(RENTAL_CATALOG_FILE) as f:
            catalog = json.load(f)
        print(f"Loaded {len(catalog)} rental catalog items")
    
    if EMBEDDINGS_FILE.exists():
        with open(EMBEDDINGS_FILE) as f:
            data = json.load(f)
            embeddings = data.get("embeddings", [])
            metadata = data.get("metadata", [])
        print(f"Loaded {len(embeddings)} pre-computed embeddings")

def init_model():
    global model, preprocess_val, tokenizer
    if model is None:
        print(f"Loading {MODEL_NAME}...")
        model, _, preprocess_val = open_clip.create_model_and_transforms(f'hf-hub:{MODEL_NAME}')
        tokenizer = open_clip.get_tokenizer(f'hf-hub:{MODEL_NAME}')
        model.eval()
        print("Model loaded!")
    return model, preprocess_val, tokenizer

CATEGORY_KEYWORDS = {
    "dress": ["dress", "gown", "gowns", "dresses"],
    "jumpsuit": ["jumpsuit", "jumpsuits"],
    "romper": ["romper", "rompers"],
    "top": ["top", "tops", "vest", "blouse", "shirt"],
    "bottom": ["pants", "skirt", "shorts", "trousers"],
    "suit": ["suit", "suits", "blazer"],
    "jacket": ["jacket", "jackets", "coat", "coats"],
}

CATEGORY_MAP = {
    "dress": "Dress",
    "jumpsuit": "Jumpsuit",
    "romper": "Romper",
    "top": "Top",
    "bottom": "Bottom",
    "suit": "Suit",
    "jacket": "Jacket",
}

def extract_category_from_query(query: str) -> str | None:
    q = query.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in q:
                return CATEGORY_MAP[category]
    return None

def get_category_from_query(q: str) -> str | None:
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in q:
                return category
    return None

OCCASION_KEYWORDS = {
    "work": ["work", "office", "professional", "business", "corporate"],
    "casual": ["casual", "everyday", "weekend", "relaxed", "daily"],
    "party": ["party", "club", "night out", "celebration", "dinner"],
    "formal": ["formal", "wedding", "gala", "event", "ceremony"],
    "date": ["date", "date night", "romantic", "dinner"],
}

def keyword_search(query: str, cat_filter: str | None = None) -> dict:
    q = query.lower()
    scores = {}
    
    extracted_cat = get_category_from_query(q)
    
    for item in catalog:
        if cat_filter and item.get("category", "").lower() != cat_filter.lower():
            continue
        
        score = 0
        name = item.get("name", "").lower()
        category = item.get("category", "").lower()
        occasion = item.get("occasion", "").lower()
        color = item.get("color", "").lower()
        description = item.get("description", "").lower()
        
        if extracted_cat and category == extracted_cat:
            score += 10
        elif extracted_cat and extracted_cat in category:
            score += 5
        elif not extracted_cat and category in q:
            score += 5
        
        for key, keywords in OCCASION_KEYWORDS.items():
            if any(kw in q for kw in keywords):
                if key in occasion:
                    score += 6
                else:
                    score -= 3
        
        color_lower = color.lower()
        if color_lower in q or any(w for w in q.split() if len(w) >= 3 and color_lower in w):
            score += 5
        
        clothing_words = ["dress", "gown", "jumpsuit", "romper", "top", "suit", "vest", "jacket", "blouse", "pants", "skirt"]
        for word in clothing_words:
            if word in q and word in name:
                score += 2
        
        for word in q.split():
            if word in description:
                score += 1
        
        item_id = item.get("id", "")
        if item_id:
            scores[item_id] = score
    
    return scores

def clip_search_with_embeddings(query: str, top_k: int = 14, category: str | None = None):
    global model, preprocess_val, tokenizer, embeddings, metadata
    
    if not embeddings:
        return clip_search_realtime(query, top_k, category)
    
    mod, preproc, tok = init_model()
    
    text = tok([query])
    
    with torch.no_grad():
        text_features = mod.encode_text(text, normalize=True)
        query_emb = text_features[0].float().numpy()
    
    if category:
        filtered_indices = [i for i, emb in enumerate(embeddings) if i < len(metadata) and metadata[i].get("category", "").lower() == category.lower()]
    else:
        filtered_indices = list(range(len(embeddings)))
    
    if not filtered_indices:
        return []
    
    similarities = []
    for i in filtered_indices:
        emb = embeddings[i]
        sim = sum(a * b for a, b in zip(query_emb, emb))
        similarities.append((float(sim), i))
    
    similarities.sort(reverse=True)
    
    return [
        {
            "index": idx,
            "similarity": float(sim),
            "filename": metadata[idx].get("relative_path", metadata[idx].get("image_path", "")) if idx < len(metadata) else "",
        }
        for sim, idx in similarities[:top_k]
    ]

def clip_search_realtime(query: str, top_k: int = 14, category: str | None = None):
    global model, preprocess_val, tokenizer, catalog
    
    mod, preproc, tok = init_model()
    
    image_files = []
    for ext in ['.jpg', '.jpeg', '.png', '.webp']:
        image_files.extend(sorted(RENTAL_IMAGES_DIR.glob(f"*{ext}")))
    
    if not image_files:
        return []
    
    if category:
        filtered_files = []
        for img_path in image_files:
            matching_item = next(
                (item for item in catalog if img_path.name in item.get("image", "")),
                None
            )
            if matching_item and matching_item.get("category", "").lower() == category.lower():
                filtered_files.append(img_path)
        image_files = filtered_files
    
    if not image_files:
        return []
    
    images = []
    for img_path in image_files:
        try:
            img = Image.open(img_path).convert('RGB')
            images.append(preproc(img))
        except Exception as e:
            print(f"Error loading {img_path}: {e}")
            images.append(preproc(Image.new('RGB', (224, 224))))
    
    image_input = torch.stack(images)
    text = tok([query])
    
    with torch.no_grad():
        image_features = mod.encode_image(image_input, normalize=True)
        text_features = mod.encode_text(text, normalize=True)
        image_features_norm = image_features / image_features.norm(dim=-1, keepdim=True)
        text_features_norm = text_features / text_features.norm(dim=-1, keepdim=True)
        similarities = (image_features_norm @ text_features_norm.T).squeeze()
    
    print(f"Raw similarities for {len(similarities)} images: {similarities}")
    
    indexed = [(float(sim), i) for i, sim in enumerate(similarities)]
    indexed.sort(reverse=True)
    
    return [
        {
            "index": idx,
            "similarity": float(sim),
            "filename": Path(image_files[idx]).name,
        }
        for sim, idx in indexed[:top_k]
    ]

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_catalog()
    yield

app = FastAPI(title="Marqo FashionCLIP API", lifespan=lifespan)

@app.get("/")
def root():
    return {
        "message": "Marqo FashionCLIP API",
        "model": MODEL_NAME,
        "catalog_items": len(catalog),
        "embeddings": len(embeddings),
        "using_embeddings": len(embeddings) > 0
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "catalog_items": len(catalog),
        "embeddings": len(embeddings),
        "using_embeddings": len(embeddings) > 0
    }

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        user_message = request.message.strip()
        print(f"Query: {user_message}")
        
        requested_category = extract_category_from_query(user_message)
        print(f"Filtering by category: {requested_category}")
        
        keyword_scores = keyword_search(user_message, requested_category)
        
        results = clip_search_with_embeddings(user_message, top_k=14, category=requested_category)
        print(f"Found {len(results)} visual results")
        
        max_kw_score = max(keyword_scores.values()) if keyword_scores else 1
        max_vis_score = max([r.get("similarity", 0) for r in results]) if results else 1
        
        combined_scores = []
        for r in results:
            filename = r.get("filename", "")
            matching_item = next(
                (item for item in catalog if filename in item.get("image", "")),
                None
            )
            
            if matching_item:
                item_id = matching_item.get("id", "")
                kw_score = keyword_scores.get(item_id, 0) / max_kw_score if max_kw_score > 0 else 0
                vis_score = r.get("similarity", 0) / max_vis_score if max_vis_score > 0 else 0
                final_score = kw_score + vis_score
                
                combined_scores.append({
                    "item": matching_item,
                    "filename": filename,
                    "keyword_score": kw_score,
                    "visual_score": vis_score,
                    "final_score": final_score,
                })
        
        if not requested_category:
            for item in catalog:
                item_id = item.get("id", "")
                if item_id in keyword_scores and item_id not in [c.get("item", {}).get("id", "") for c in combined_scores]:
                    kw_score = keyword_scores.get(item_id, 0) / max_kw_score if max_kw_score > 0 else 0
                    if kw_score > 0:
                        combined_scores.append({
                            "item": item,
                            "filename": item.get("image", ""),
                            "keyword_score": kw_score,
                            "visual_score": 0,
                            "final_score": kw_score,
                        })
        
        combined_scores.sort(key=lambda x: x["final_score"], reverse=True)
        
        if not combined_scores:
            return {
                "response": "No items found matching your description.",
                "suggest_items": False,
                "items": []
            }
        
        items = []
        for cs in combined_scores[:14]:
            item = cs["item"]
            items.append({
                "id": item.get("id", ""),
                "name": item.get("name", ""),
                "image": item.get("image", ""),
                "category": item.get("category", ""),
                "color": item.get("color", ""),
                "occasion": item.get("occasion", ""),
                "similarity": cs["visual_score"],
                "clip_percent": int(cs["visual_score"] * 100),
                "price": item.get("price", 0),
                "description": item.get("description", ""),
                "keyword_match_score": cs["keyword_score"],
                "final_score": cs["final_score"],
            })
        
        top = items[0]
        response = f"I found {len(items)} items matching '{user_message}'! "
        response += f"Top pick: {top['name']}."
        
        return {
            "response": response,
            "suggest_items": True,
            "items": items,
            "model": MODEL_NAME
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "response": f"Error: {str(e)}",
                "suggest_items": False,
                "items": []
            }
        )

@app.get("/catalog")
def get_catalog():
    return {"items": catalog}

@app.post("/regenerate-embeddings")
def regenerate_embeddings():
    global embeddings, metadata, model, preprocess_val, tokenizer
    
    if model is None:
        init_model()
    
    mod, preproc, tok = init_model()
    
    image_files = []
    for ext in ['.jpg', '.jpeg', '.png', '.webp']:
        image_files.extend(sorted(RENTAL_IMAGES_DIR.glob(f"*{ext}")))
    
    print(f"Generating embeddings for {len(image_files)} images...")
    
    new_embeddings = []
    new_metadata = []
    
    for i, img_path in enumerate(image_files):
        try:
            img = Image.open(img_path).convert('RGB')
            image = preproc(img).unsqueeze(0)
            
            with torch.no_grad():
                image_features = mod.encode_image(image, normalize=True)
                embedding = image_features[0].float().numpy().tolist()
            
            matching_item = next(
                (item for item in catalog if img_path.name in item.get("image", "")),
                None
            )
            
            new_embeddings.append(embedding)
            new_metadata.append({
                "image_path": str(img_path),
                "relative_path": img_path.name,
                "category": matching_item.get("category", "") if matching_item else "",
            })
            
            if (i + 1) % 5 == 0:
                print(f"Processed {i+1}/{len(image_files)}")
                
        except Exception as e:
            print(f"Error processing {img_path}: {e}")
    
    with open(EMBEDDINGS_FILE, 'w') as f:
        json.dump({"embeddings": new_embeddings, "metadata": new_metadata}, f)
    
    embeddings = new_embeddings
    metadata = new_metadata
    
    print(f"Saved {len(embeddings)} embeddings to {EMBEDDINGS_FILE}")
    
    return {
        "status": "success",
        "embeddings_count": len(embeddings),
        "message": f"Generated {len(embeddings)} embeddings"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8003)
