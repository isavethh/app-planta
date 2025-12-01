@echo off
echo.
echo ================================================
echo    🤖 INICIANDO SERVICIO DE IA
echo    Sistema de Inteligencia Artificial
echo    Planta Logistica
echo ================================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando Python...
python --version
if errorlevel 1 (
    echo ❌ Python no esta instalado
    pause
    exit /b 1
)

echo.
echo [2/3] Verificando entorno virtual...
if not exist "venv\" (
    echo Creando entorno virtual...
    python -m venv venv
    echo ✅ Entorno virtual creado
)

echo.
echo [3/3] Activando entorno e iniciando servicio...
call venv\Scripts\activate.bat

echo.
echo Instalando/actualizando dependencias...
pip install -r requirements.txt --quiet

echo.
echo ================================================
echo    🚀 INICIANDO SERVICIO DE IA
echo    Puerto: 5000
echo    API: http://localhost:5000/api/ia
echo ================================================
echo.

python app.py

pause
