@echo off
cd /d "%~dp0"
py -3 -m ab_serial %*
if errorlevel 1 (
  echo Necesitas Python 3.11+ en PATH.
  pause
)
