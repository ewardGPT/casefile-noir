#!/bin/bash

echo "🔍 Verifying Hackathon Winner Setup"
echo "====================================="
echo ""

# Check vite.config.js for correct port
if grep -q "port: 5173" client/vite.config.js; then
    echo "✅ Vite config: Port 5173 configured"
else
    echo "❌ Vite config: Port 5173 NOT configured"
fi

# Check strictPort setting
if grep -q "strictPort: true" client/vite.config.js; then
    echo "✅ Vite config: Strict port enabled"
else
    echo "❌ Vite config: Strict port NOT enabled"
fi

# Check package.json dev script
if grep -q '"dev": "vite"' client/package.json; then
    echo "✅ Package.json: dev script configured"
else
    echo "❌ Package.json: dev script NOT configured"
fi

# Check if new systems exist
echo ""
echo "📦 Checking new systems..."

if [ -f "client/src/systems/NotebookSystem.ts" ]; then
    echo "✅ NotebookSystem.ts exists"
else
    echo "❌ NotebookSystem.ts missing"
fi

if [ -f "client/src/systems/LockpickPuzzle.ts" ]; then
    echo "✅ LockpickPuzzle.ts exists"
else
    echo "❌ LockpickPuzzle.ts missing"
fi

if [ -f "client/src/systems/DopamineEffects.ts" ]; then
    echo "✅ DopamineEffects.ts exists"
else
    echo "❌ DopamineEffects.ts missing"
fi

echo ""
echo "🚀 To start the game:"
echo "   cd client"
echo "   npm run dev"
echo ""
echo "   Game will run on: http://localhost:5173"
echo ""
