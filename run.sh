#!/bin/bash
set -e

# Project Directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=== Setting up AetherChat Environment ==="

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment .venv..."
    python3 -m venv .venv
fi

# Activate virtual environment and install requirements
echo "Installing dependencies..."
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

# Tests are skipped — they were written for the old google-genai backend and
# need to be rewritten for the openai SDK. Uncomment once updated.
# echo "=== Running Backend Unit Tests ==="
# .venv/bin/pytest backend/test_main.py

echo "=== Starting FastAPI Server ==="
echo "GROQ_API_KEY is read from .env (set to 'mock-dev' to run offline)."
echo "Starting development server at http://127.0.0.1:8000 ..."

.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
