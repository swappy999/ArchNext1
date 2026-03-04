@echo off
echo ==============================================
echo STARTING ARCHNEXT BACKEND
echo ==============================================
cd backend
if exist venv\Scripts\activate (
    call venv\Scripts\activate
    uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    echo [ERROR] Virtual environment not found in backend/venv.
    echo Please run backend setup first.
    pause
)
