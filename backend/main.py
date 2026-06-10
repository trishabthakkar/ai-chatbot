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
from openai import AsyncOpenAI

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("groq-chatbot")

app = FastAPI(title="Groq Chatbot API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq exposes an OpenAI-compatible endpoint, so we use the openai SDK pointed at
# Groq's base URL. Swapping to OpenAI/OpenRouter/etc. later only requires changing
# these two constants.
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
MODEL = "llama-3.3-70b-versatile"


class Message(BaseModel):
    # Keep "model" in the schema so the existing frontend + localStorage continue
    # to work without changes. We translate to OpenAI's "assistant" below.
    role: Literal["user", "model"]
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    history: List[Message]


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest, http_request: Request):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY is not set.")
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY environment variable is not set on the server.",
        )

    # Map frontend roles ("model") to OpenAI-compatible roles ("assistant")
    messages = [
        {
            "role": "assistant" if m.role == "model" else "user",
            "content": m.content,
        }
        for m in request.history
    ]

    async def event_generator():
        try:
            # Mock-dev mode: simulate streaming without any external API call
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

            # Real Groq call
            client = AsyncOpenAI(api_key=api_key, base_url=GROQ_BASE_URL)
            stream = await client.chat.completions.create(
                model=MODEL,
                messages=messages,
                stream=True,
            )

            async for chunk in stream:
                if await http_request.is_disconnected():
                    logger.info("Client disconnected from SSE stream.")
                    break

                # OpenAI-style streaming chunks: choices[0].delta.content
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                text = getattr(delta, "content", None)
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
    logger.warning(
        f"Frontend directory {FRONTEND_DIR} does not exist yet. Static files will not be served."
    )
