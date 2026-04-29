@echo off
cd /d C:\Users\admin\afasense\backend
set LEGACY_LOGIN_URL=https://api.afasense.com/api.php
set LEGACY_VERIFY_SSL=false
python -m uvicorn main:app --reload --port 8000
pause
