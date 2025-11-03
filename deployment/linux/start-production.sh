#!/bin/bash

echo "========================================"
echo "Starting WorkplanV6 Production Mode"
echo "========================================"

echo ""
echo "[1/4] Building Frontend for Production..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
echo "✅ Frontend build completed!"

echo ""
echo "[2/4] Starting Backend Server..."
cd ../backend
npm run start &
BACKEND_PID=$!

echo ""
echo "[3/4] Waiting for backend to start..."
sleep 5

echo ""
echo "[4/4] Starting Frontend Server..."
cd ../frontend
npm run start &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "Production servers started!"
echo "========================================"
echo "Backend: ${BACKEND_URL:-http://localhost:3101}"
echo "Frontend: ${FRONTEND_URL:-http://localhost:3011}"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop all servers..."

# Wait for user to stop
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
