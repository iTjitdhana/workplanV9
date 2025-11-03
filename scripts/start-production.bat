@echo off
if not defined BACKEND_URL set BACKEND_URL=http://localhost:3101
if not defined FRONTEND_URL set FRONTEND_URL=http://localhost:3012
echo ========================================
echo Starting WorkplanV6 Production Mode
echo ========================================

echo.
echo [1/4] Building Frontend for Production...
call build-simple.bat
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    pause
    exit /b 1
)
echo ✅ Frontend build completed!

echo.
echo [2/4] Starting Backend Server...
cd ..\backend
start "Backend Server" cmd /k "npm run start"

echo.
echo [3/4] Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo [4/4] Starting Frontend Server...
cd ..\frontend
start "Frontend Server" cmd /k "npm run start"

echo.
echo ========================================
echo Production servers started!
echo ========================================
echo Backend: %BACKEND_URL%
echo Frontend: %FRONTEND_URL%
echo ========================================
echo.
echo Press any key to exit...
pause > nul
