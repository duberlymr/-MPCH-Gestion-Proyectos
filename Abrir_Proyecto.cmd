@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo    PROJECT HUB - DIAGNOSTICO
echo ==========================================
echo Carpeta actual: %CD%
echo.

echo Probando acceso a comandos...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No encuentro Node.js. 
    echo Por favor, instalalo desde: https://nodejs.org/
    pause
    exit /b
)

echo Node.js detectado. Iniciando servidor...
echo.
echo No cierres esta ventana.
echo.

:: Usamos npm.cmd directamente para evitar problemas de PowerShell
cmd /c npm.cmd run dev -- --open

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] No se pudo iniciar el proyecto.
    echo Asegurate de estar en la carpeta correcta.
    pause
)
