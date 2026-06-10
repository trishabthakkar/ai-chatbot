from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Literal
from pathlib import Path
import os
import json
import logging
import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gemini-chatbot")

app = FastAPI(title="Gemini Chatbot API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: Literal["user", "model"]
    content: str = Field(..., min_length=1)

class ChatRequest(BaseModel):
    history: List[Message]

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest, http_request: Request):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY is not set.")
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable is not set on the server."
        )

    # Reformat history to google-genai format
    contents = []
    for msg in request.history:
        contents.append(
            types.Content(
                role=msg.role,
                parts=[types.Part.from_text(text=msg.content)]
            )
        )

    async def event_generator():
        try:
            # Handle mock-dev simulation mode
            if api_key == "mock-dev":
                mock_text = (
                    "### Welcome to Mock Mode!\n\n"
                    "This is a **simulated response** from AetherChat to verify the streaming SSE "
                    "connection and frontend rendering.\n\n"
                    "Here is a quick Python code example:\n"
                    "```python\n"
                    "def greet(name):\n"
                    "    return f\"Hello, {name}!\"\n\n"
                    "print(greet(\"Developer\"))\n"
                    "```\n\n"
                    "The SSE connection is working flawlessly!"
                )
                # Stream word-by-word with delay to simulate typing
                words = mock_text.split(" ")
                for i, word in enumerate(words):
                    if await http_request.is_disconnected():
                        logger.info("Client disconnected from mock stream.")
                        break
                    chunk = word + (" " if i < len(words) - 1 else "")
                    yield f"data: {json.dumps({'text': chunk})}\n\n"
                    await asyncio.sleep(0.04)
                yield "data: [DONE]\n\n"
                return

            # Initialize async client
            client = genai.Client(api_key=api_key)
            
            # Request streaming from gemini-2.5-flash
            response_stream = await client.aio.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=contents
            )
            
            async for chunk in response_stream:
                # If the client disconnected, we stop generating
                if await http_request.is_disconnected():
                    logger.info("Client disconnected from SSE stream.")
                    break
                
                text = chunk.text
                if text:
                    yield f"data: {json.dumps({'text': text})}\n\n"
                    
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.error(f"Error during stream generation: {str(e)}")
            yield f"data: {json.dumps({'error': f'API Error: {str(e)}'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Mount frontend files at root (/)
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    logger.warning(f"Frontend directory {FRONTEND_DIR} does not exist yet. Static files will not be served.")
