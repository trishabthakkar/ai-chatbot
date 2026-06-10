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

echo "=== Running Backend Unit Tests ==="
# Set mock key for tests to avoid API failures
export GEMINI_API_KEY="mock-key-for-test"
.venv/bin/pytest backend/test_main.py

echo "=== Starting FastAPI Server ==="
echo "Make sure GEMINI_API_KEY environment variable is set!"
echo "Usage: export GEMINI_API_KEY='your-real-api-key' && ./run.sh"
echo "Starting development server at http://127.0.0.1:8000 ..."

# Run uvicorn server (without test env key unless it is already set in parent shell)
# If GEMINI_API_KEY is not set, warn the user
if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "mock-key-for-test" ]; then
    echo -e "\n\033[33mWARNING: GEMINI_API_KEY is not set or set to mock. The chatbot will show connection errors in browser until a real key is provided.\033[0m"
fi

.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
