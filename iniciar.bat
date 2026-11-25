@echo off
chcp 65001 >nul
cls

echo.
echo ==================================================
echo Claude Code Dashboard - Servidor PowerShell
echo ==================================================
echo.

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "servidor.ps1"

pause
