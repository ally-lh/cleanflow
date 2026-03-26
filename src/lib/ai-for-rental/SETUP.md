# Style Assistant Setup Guide

## Prerequisites

1. **Python 3.9+** installed
2. **Node.js 18+** installed
3. **MacBook with 8-core or 10-core GPU** (for running models locally)

---

## Step 1: Install Python Dependencies

```bash
cd src/lib/ai-for-rental
pip install -r requirements.txt
```

This will install:
- `torch` - PyTorch for model inference
- `transformers` - For CLIP model
- `faiss-cpu` - For vector similarity search
- `fastapi` + `uvicorn` - For the API server
- Other required packages

**Note**: If you have NVIDIA GPU, you can install `faiss-gpu` instead of `faiss-cpu` for faster embeddings.

---

## Step 2: Generate CLIP Embeddings

Before running the server, generate embeddings for all 63 images:

```bash
cd src/lib/ai-for-rental
python style_assistant.py
```

This will:
1. Load all 63 images from `DeepFashion/img/`
2. Generate CLIP embeddings for each image
3. Save embeddings to `embeddings.faiss`
4. Save metadata to `metadata.json`

**First run**: Takes ~1-2 minutes (downloading CLIP model + processing images)
**Subsequent runs**: Instant (loads cached embeddings)

---

## Step 3: Start the Python API Server

```bash
cd src/lib/ai-for-rental
python server.py
```

The server will start on `http://127.0.0.1:8000`

**Expected output:**
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
Loading CLIP model on cpu...
CLIP model loaded successfully
Generating embeddings for 63 images...
Processed 10/63 images
...
Saved 63 embeddings to embeddings.faiss
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## Step 4: Start Next.js Development Server

In a new terminal:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

---

## Step 5: Test the Style Assistant

1. Log in to a customer account
2. Click **"Style AI"** in the navigation
3. Try queries like:
   - "I want something vibrant for a summer garden party"
   - "Casual dress for brunch"
   - "Elegant outfit for a wedding"
   - "Romper for beach vacation"

---

## Project Structure

```
src/lib/ai-for-rental/
├── style_assistant.py      # CLIP embeddings + search logic
├── server.py               # FastAPI server
├── requirements.txt        # Python dependencies
├── embeddings.faiss       # Generated vector index (auto-created)
├── metadata.json           # Image metadata (auto-created)
└── DeepFashion/
    ├── img/                # 63 clothing images
    └── anno/               # Category annotations
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Server status |
| `/search` | POST | Search by text query |
| `/chat` | POST | Chat with style assistant |
| `/catalog` | GET | Get all catalog items |

---

## Troubleshooting

### "Failed to connect to Python server"
- Make sure `python server.py` is running
- Check the server is on port 8000

### "Failed to load image"
- Check that images exist in `DeepFashion/img/`
- Run `python style_assistant.py --regenerate` to regenerate embeddings

### Slow performance on MacBook
- The first query downloads the CLIP model (~400MB)
- Subsequent queries are faster
- Consider using CPU-only mode if GPU memory is limited

---

## Conversation History

- Chat history is saved in **localStorage** (browser)
- Each user has their own saved history
- Click "Clear" to reset conversation

---

## Next Steps (After Testing)

1. Move embeddings/metadata to Prisma/Supabase
2. Add user authentication for saving preferences
3. Expand catalog with more clothing categories
4. Add image generation for pairing suggestions
5. Deploy Python server to cloud (optional)
