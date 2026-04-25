@echo off
cd /d C:\Users\admin\afasense\backend
python -m uvicorn main:app --reload --port 8000
pause
