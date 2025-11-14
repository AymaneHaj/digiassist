#!/bin/bash
# Startup script for Railway deployment

echo "🚀 Starting DigiAssistant AI Agent..."
echo "Current directory: $(pwd)"
echo "Python version: $(python --version)"
echo "PORT: ${PORT:-8000}"

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "⚠️  main.py not found in current directory"
    echo "Contents of current directory:"
    ls -la
    exit 1
fi

# Check Python dependencies
echo "Checking Python dependencies..."
python -c "import fastapi; import uvicorn; print('✅ Dependencies OK')" || {
    echo "❌ Missing dependencies. Installing..."
    pip install -r requirements.txt
}

# Start the server
echo "Starting uvicorn server..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}

