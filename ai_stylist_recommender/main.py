import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import torch

app = FastAPI()

# SmolLM2: No tokens, no gated access, runs entirely locally.
model_id = "HuggingFaceTB/SmolLM2-1.7B-Instruct"

print("Initializing Local Stylist Brain (SmolLM2)...")
# device_map="auto" ensures it uses your Mac's Metal Performance Shaders (GPU)
pipe = pipeline(
    "text-generation",
    model=model_id,
    torch_dtype=torch.bfloat16, 
    device_map="auto"
)

class ChatRequest(BaseModel):
    message: str

@app.post("/api/v1/style-chat")
async def style_chat(request: ChatRequest):
    messages = [
        {
            "role": "system", 
            "content": "You are a CleanFlow AI Stylist in Singapore. Provide 3 short, helpful sentences of fashion advice. Focus on color pairings and tropical climate appropriateness."
        },
        {"role": "user", "content": request.message},
    ]
    
    # max_new_tokens keeps the response snappy and avoids 'rambling'
    outputs = pipe(messages, max_new_tokens=150, temperature=0.7)
    response_text = outputs[0]["generated_text"][-1]["content"]
    
    return {"response": response_text}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)