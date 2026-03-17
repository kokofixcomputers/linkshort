#!/bin/bash
set -e

echo "=== LinkShort Setup ==="

# Install Python dependencies
echo "[1/3] Installing Python dependencies..."
cd "$(dirname "$0")/backend"
pip install -r requirements.txt --break-system-packages -q

# Install Node dependencies
echo "[2/3] Installing Node dependencies..."
cd "../frontend"
pnpm install

echo "[3/3] Starting servers..."
echo ""
echo "  Backend: http://localhost:5000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "  Login: admin / admin"
echo ""

# Start backend in background
cd "../backend"
python app.py &
BACKEND_PID=$!

# Start frontend
cd "../frontend"
npx vite build &
FRONTEND_PID=$!

# Trap to kill both on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
