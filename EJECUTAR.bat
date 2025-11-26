@echo off
echo ====================================
echo  Applanta - Sistema de Transportistas
echo ====================================
echo.
echo Este script iniciara el backend y la app movil
echo en dos ventanas separadas.
echo.
echo IMPORTANTE: Necesitas tener PostgreSQL corriendo
echo             con la base de datos 'applanta_db' creada.
echo.
echo Presiona cualquier tecla para continuar...
pause > nul

echo.
echo Iniciando Backend...
start "Applanta Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 > nul

echo.
echo Iniciando App Movil...
start "Applanta Mobile App" cmd /k "cd mobile-app && npm start"

echo.
echo ====================================
echo  Servicios iniciados!
echo ====================================
echo.
echo Backend: http://localhost:3000
echo Expo DevTools: Se abrira en tu navegador
echo.
echo Para usar la app:
echo 1. Instala 'Expo Go' en tu celular
echo 2. Escanea el QR que aparece en Expo DevTools
echo 3. Login: transportista@applanta.com
echo 4. Password: admin123
echo.
echo Presiona cualquier tecla para salir...
pause > nul

