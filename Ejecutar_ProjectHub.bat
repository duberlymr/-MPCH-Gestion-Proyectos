@echo off
:: Ensure we are in the script's directory
cd /d "%~dp0"

TITLE ProjectHub Estudios - Launcher
echo ==========================================
echo    Iniciando ProjectHub Estudios...
echo ==========================================
echo.

:: Check if Node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se encuentra Node.js instalado. 
    echo Por favor instale Node.js desde https://nodejs.org/
    pause
    exit /b
)

echo [1/2] Verificando dependencias...
if not exist "node_modules\" (
    echo Instalando dependencias (esto tardara unos minutos la primera vez)...
    call npm.cmd install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Hubo un problema instalando las dependencias.
        pause
        exit /b
    )
)

echo.
echo [2/2] Lanzando servidor de desarrollo...
echo.
echo El sistema se abrira en su navegador predeterminado.
echo Mantenga esta ventana abierta mientras usa la aplicacion.
echo.

:: Run dev server and open browser
call npm.cmd run dev -- --open

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] El servidor se detuvo inesperadamente.
    pause
)
