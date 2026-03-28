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
    allow_methods=["*"],
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

def clip_search_with_embeddings(query: str, top_k: int = 14):
    global model, preprocess_val, tokenizer, embeddings, metadata
    
    if not embeddings:
        return clip_search_realtime(query, top_k)
    
    mod, preproc, tok = init_model()
    
    text = tok([query])
    
    with torch.no_grad():
        text_features = mod.encode_text(text, normalize=True)
        query_emb = text_features[0].float().numpy()
    
    similarities = []
    for i, emb in enumerate(embeddings):
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
        if idx < len(metadata)
    ]

def clip_search_realtime(query: str, top_k: int = 14):
    global model, preprocess_val, tokenizer
    
    mod, preproc, tok = init_model()
    
    image_files = []
    for ext in ['.jpg', '.jpeg', '.png', '.webp']:
        image_files.extend(sorted(RENTAL_IMAGES_DIR.glob(f"*{ext}")))
    
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
        text_probs = (100.0 * image_features @ text_features.T).softmax(dim=-1)
        similarities = text_probs.squeeze().numpy()
    
    indexed = [(float(sim), i) for i, sim in enumerate(similarities)]
    indexed.sort(reverse=True)
    
    return [
        {
            "index": idx,
            "similarity": float(sim),
            "filename": Path(image_files[idx]).name,
        }
        for sim, idx in indexed[:top_k]
        if idx < len(image_files)
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
        
        results = clip_search_with_embeddings(user_message, top_k=14)
        print(f"Found {len(results)} results")
        
        if not results:
            return {
                "response": "No items found matching your description.",
                "suggest_items": False,
                "items": []
            }
        
        items = []
        for r in results:
            filename = r.get("filename", "")
            matching_item = next(
                (item for item in catalog if filename in item.get("image", "")),
                None
            )
            
            if matching_item:
                items.append({
                    "id": matching_item.get("id", ""),
                    "name": matching_item.get("name", ""),
                    "image": matching_item.get("image", ""),
                    "category": matching_item.get("category", ""),
                    "similarity": r.get("similarity", 0),
                    "clip_percent": int(r.get("similarity", 0) * 100),
                    "price": matching_item.get("price", 0),
                    "description": matching_item.get("description", ""),
                })
        
        if not items:
            return {
                "response": "No items found matching your description.",
                "suggest_items": False,
                "items": []
            }
        
        top = items[0]
        response = f"I found {len(items)} items visually matching '{user_message}'! "
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
            
            new_embeddings.append(embedding)
            new_metadata.append({
                "image_path": str(img_path),
                "relative_path": img_path.name,
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
