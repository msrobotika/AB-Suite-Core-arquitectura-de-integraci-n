@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 20 o posterior y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Primera preparacion: se creara un entorno Python local y se instalaran las dependencias de BI.
  echo Requiere Python 3.11 o posterior y conexion a Internet esta primera vez.
  node scripts/setup.mjs
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
node scripts/workspace.mjs --open
if errorlevel 1 pause
