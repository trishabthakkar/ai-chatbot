import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import MagicMock, AsyncMock, patch
import os
import json

# Ensure GEMINI_API_KEY is temporarily set for testing
os.environ["GEMINI_API_KEY"] = "mock-api-key-for-testing"

# Import after setting env var to ensure app initialization inherits it
from backend.main import app

class MockChunk:
    """Mock for google-genai response chunk."""
    def __init__(self, text: str):
        self.text = text

@pytest.mark.asyncio
async def test_chat_stream_success():
    mock_chunks = [
        MockChunk("Hello"),
        MockChunk(" from"),
        MockChunk(" Gemini!")
    ]
    
    async def mock_generate_content_stream(*args, **kwargs):
        for chunk in mock_chunks:
            yield chunk

    # Patch google.genai.Client to mock responses
    with patch("backend.main.genai.Client") as MockClient:
        # Configure mocked client instance
        mock_instance = MockClient.return_value
        mock_instance.aio = MagicMock()
        mock_instance.aio.models = MagicMock()
        mock_instance.aio.models.generate_content_stream = AsyncMock(side_effect=mock_generate_content_stream)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "history": [
                    {"role": "user", "content": "Hello"}
                ]
            }
            response = await ac.post("/api/chat/stream", json=payload)
            
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]
            
            # Parse streaming events
            received_text = []
            done_received = False
            
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[len("data: "):]
                    if data_str == "[DONE]":
                        done_received = True
                        break
                    
                    data_json = json.loads(data_str)
                    if "text" in data_json:
                        received_text.append(data_json["text"])
            
            assert "".join(received_text) == "Hello from Gemini!"
            assert done_received is True

@pytest.mark.asyncio
async def test_chat_stream_missing_api_key():
    # Temporarily remove GEMINI_API_KEY
    if "GEMINI_API_KEY" in os.environ:
        del os.environ["GEMINI_API_KEY"]
        
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "history": [
                {"role": "user", "content": "Hello"}
            ]
        }
        response = await ac.post("/api/chat/stream", json=payload)
        
        assert response.status_code == 500
        assert "GEMINI_API_KEY" in response.json()["detail"]
        
    # Restore API key
    os.environ["GEMINI_API_KEY"] = "mock-api-key-for-testing"

@pytest.mark.asyncio
async def test_chat_stream_invalid_payload():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Invalid role (must be user/model) or empty history
        payload = {
            "history": [
                {"role": "invalid_role", "content": "Hello"}
            ]
        }
        response = await ac.post("/api/chat/stream", json=payload)
        assert response.status_code == 422
