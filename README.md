# AetherChat: Premium Full-Stack LLM Chatbot

AetherChat is a clean, modern, full-stack chatbot application designed around a traditional request-response and streaming architecture. It is built using **FastAPI** on the backend and features a responsive, glassmorphic **Vanilla HTML/CSS/JS** dashboard on the frontend.

The application uses the official **Google GenAI SDK** to stream responses using Server-Sent Events (SSE) from the `gemini-2.5-flash` model.

---

## Features

- **Instant SSE Streaming**: Backend streams tokens using Server-Sent Events (SSE) to ensure immediate responsiveness.
- **Stateless History Architecture**: The backend receives a complete array of message history (`[{"role": "user", "content": "..."}, {"role": "model", "content": "..."}]`) from the client, eliminating server-side session overhead.
- **Premium Sidebar Dashboard**:
  - Full conversation history management (creating, renaming, deleting chats).
  - Local state persistence using `localStorage`.
  - Conversation search and filtering.
- **Advanced Markdown & Code Snippet Rendering**:
  - Renders markdown structures (headers, lists, tables, bold text, blockquotes) instantly.
  - Auto-detects and formats multi-line code blocks with dynamic syntax highlighting via **PrismJS**.
  - Includes a one-click **"Copy Code"** button for every generated code block.
- **Responsive Layout**: Designed for desktop and mobile viewports using modern CSS styling (fluid layouts, custom scrollbars, overscroll containment).
- **Developer Mock Mode**: Built-in mock mode (`GEMINI_API_KEY=mock-dev`) to test network streaming and UI responsiveness completely offline without calling external APIs.
- **Automated Tests**: Unit tests mocking the Gemini API to verify response codes, SSE syntax, payload structures, and error states.

---

## Technology Stack

- **Backend**: Python 3.11+, FastAPI, Uvicorn, Google GenAI SDK (`google-genai`), Pytest
- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Backdrop Blur), Client-side JavaScript (ReadableStream API)
- **External Libraries**: [marked.js](https://marked.js.org/) (Markdown Parser), [PrismJS](https://prismjs.com/) (Code Highlighter)

---

## Getting Started

### Prerequisites
- Python 3.11 or higher
- A Google Gemini API Key (get one from [Google AI Studio](https://aistudio.google.com/))

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone <your-repository-url>
   cd ai-chatbot
   ```

2. **Configure Environment Variables**:
   Copy the example environment template and add your API key:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and replace `your_gemini_api_key_here` with your actual key:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
   *(To run offline in simulated mock mode, set `GEMINI_API_KEY=mock-dev`)*

3. **Start the Application**:
   You can run the startup script which automatically creates a virtual environment, installs dependencies, runs tests, and launches the server:
   ```bash
   ./run.sh
   ```
   Alternatively, perform the steps manually:
   ```bash
   # Create and activate virtual environment
   python3 -m venv .venv
   source .venv/bin/activate

   # Install dependencies
   pip install -r requirements.txt

   # Start server
   uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

4. **Access the Chatbot**:
   Open your browser and navigate to: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## Running Automated Tests

Run backend unit tests inside the virtual environment using `pytest`:
```bash
# Activate virtual environment if not already activated
source .venv/bin/activate

# Execute pytest
python -m pytest backend/test_main.py
```

---

## Project Structure

```text
ai-chatbot/
├── backend/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application & SSE streaming logic
│   ├── test_main.py            # Pytest test suite with mocked GenAI Client
│   └── test_stream_client.py   # CLI tool to test server streaming output
├── frontend/
│   ├── index.html              # Main single-page web interface
│   ├── style.css               # Premium CSS layout stylesheet
│   └── app.js                  # Frontend client logic, local storage, stream parser
├── .env.example                # Sample environment file
├── .gitignore                  # Git ignored folders list
├── README.md                   # Project documentation
├── requirements.txt            # Python dependencies
└── run.sh                      # Automation script for setup/test/run
```
