@echo off
echo ========================================
echo    APLICAR MIGRACIONES - Sistema SCADA
echo ========================================
echo.
echo Este script:
echo  1. Generara migraciones para los cambios de modelos
echo  2. Aplicara las migraciones a la BD
echo  3. (OPCIONAL) Creara un superusuario
echo.
echo ADVERTENCIA: Se eliminaran 18 modelos.
echo Si tienes datos en esos modelos, haz backup ANTES.
echo.
pause

cd /d "%~dp0"

echo.
echo [1/3] Generando migraciones...
echo --------------------------------
python manage.py makemigrations
if %errorlevel% neq 0 (
    echo.
    echo ERROR: No se pudieron generar las migraciones.
    pause
    exit /b 1
)

echo.
echo [2/3] Aplicando migraciones...
echo --------------------------------
python manage.py migrate
if %errorlevel% neq 0 (
    echo.
    echo ERROR: No se pudieron aplicar las migraciones.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   MIGRACIONES APLICADAS EXITOSAMENTE
echo ========================================
echo.
echo Cambios aplicados:
echo  - 18 modelos eliminados
echo  - 1 modelo renombrado (Promocion ^-^> CambioEmpleado)
echo  - 5 modelos nuevos agregados
echo  - 2 campos nuevos en Empleado
echo  - 1 campo eliminado en ItemInventario
echo.
echo Modelos actuales: 34
echo.

echo ¿Deseas crear un superusuario? (S/N)
set /p crear_super="> "
if /i "%crear_super%"=="S" (
    echo.
    echo [3/3] Creando superusuario...
    echo --------------------------------
    python manage.py createsuperuser
)

echo.
echo ========================================
echo   PROCESO COMPLETADO
echo ========================================
echo.
echo Ahora puedes:
echo  1. Iniciar servidor: python manage.py runserver
echo  2. Acceder a admin: http://localhost:8000/admin
echo  3. Probar API: http://localhost:8000/api/
echo.
pause
