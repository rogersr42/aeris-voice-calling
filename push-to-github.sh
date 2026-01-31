#!/bin/bash
# Push Aeris Voice Calling to GitHub

echo "🚀 Pushing to GitHub..."
echo ""

cd /Users/arisrsr/clawd/voice-calling-system

# Remove any existing origin
git remote remove origin 2>/dev/null

# Add the new origin
git remote add origin https://github.com/rogersr42/aeris-voice-calling.git

# Ensure we're on main branch
git branch -M main

# Push to GitHub
echo "📤 Pushing code..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🔗 https://github.com/rogersr42/aeris-voice-calling"
    echo ""
    echo "Next: Go to Render and deploy!"
else
    echo ""
    echo "❌ Push failed. You may need to:"
    echo "   1. Create a GitHub Personal Access Token"
    echo "   2. Use it as your password when prompted"
    echo "   Or run: gh auth login"
fi
