@echo off
echo ========================================
echo Iniciando Expo de forma optimizada
echo ========================================
echo.

cd /d "%~dp0"

echo Limpiando cache...
powershell -Command "if (Test-Path .expo) { Remove-Item -Recurse -Force .expo }; if (Test-Path node_modules\.cache) { Remove-Item -Recurse -Force node_modules\.cache }"

echo.
echo ========================================
echo IMPORTANTE: NO uses --clear
echo ========================================
echo.
echo Iniciando Expo (usa cache para ser mas rapido)...
echo Si necesitas limpiar cache, usa: npm run start:clear
echo.

npx expo start

pause
