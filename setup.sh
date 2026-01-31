#!/bin/bash

echo "🚀 Setting up Aeris Voice Calling System..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs config

# Check for required API keys
echo ""
echo "🔑 Checking API keys..."

missing_keys=()

if [ -z "$ELEVENLABS_API_KEY" ] && ! grep -q "ELEVENLABS_API_KEY=.." .env 2>/dev/null; then
    missing_keys+=("ELEVENLABS_API_KEY (for ultra-realistic voice)")
fi

if [ -z "$DEEPGRAM_API_KEY" ] && ! grep -q "DEEPGRAM_API_KEY=.." .env 2>/dev/null; then
    if [ -z "$OPENAI_API_KEY" ] && ! grep -q "OPENAI_API_KEY=.." .env 2>/dev/null; then
        missing_keys+=("DEEPGRAM_API_KEY or OPENAI_API_KEY (for speech-to-text)")
    fi
fi

if [ ${#missing_keys[@]} -eq 0 ]; then
    echo "✅ All required API keys configured"
else
    echo "⚠️  Missing API keys:"
    for key in "${missing_keys[@]}"; do
        echo "   - $key"
    done
    echo ""
    echo "Please add these to your .env file before running the system."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Add missing API keys to .env file"
echo "   2. Run: npm start (starts the server)"
echo "   3. Run: npm run ngrok (exposes server to internet)"
echo "   4. Configure Twilio webhook with the ngrok URL"
echo ""
