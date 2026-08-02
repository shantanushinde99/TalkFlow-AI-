@echo off
echo ===================================================
echo   Starting AI Technical Interviewer Services...
echo ===================================================
echo.

echo [1/3] Starting Token Server...
start "Token Server" cmd /k "title Token Server && .venv\Scripts\python -m app.token_server"

echo [2/3] Starting LiveKit Agent...
start "LiveKit Agent" cmd /k "title LiveKit Agent && .venv\Scripts\python -m app.main dev"

echo [3/3] Starting Frontend...
cd frontend
start "Frontend (Vite)" cmd /k "title Frontend && npm run dev"
cd ..

echo.
echo All services have been launched in separate windows!
echo - The Token Server runs on port 8880
echo - The Agent waits for LiveKit jobs
echo - The Frontend runs on port 5173
echo.
echo You can safely close this launcher window.
pause
