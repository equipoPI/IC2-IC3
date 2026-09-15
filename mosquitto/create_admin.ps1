<#
PowerShell script para crear el usuario 'admin' en el contenedor Mosquitto
Ejecutar desde la raíz del repo en Windows con Docker Desktop
#>
param()

if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Error "docker-compose no encontrado. Ejecuta desde la raíz del repo donde docker-compose.yml está disponible."
    exit 1
}

Write-Host "Levantando contenedor mosquitto..."

Write-Host "Creando/actualizando usuario 'admin' con contraseña 'admin'..."
& docker-compose exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd admin admin

Write-Host "Asegurando permisos (si aplica)..."
& docker-compose exec mosquitto sh -c 'chmod 640 /mosquitto/config/passwd || true'

Write-Host "Reiniciando mosquitto..."
& docker-compose restart mosquitto

Write-Host "Hecho. Prueba conexión con:"
Write-Host "mosquitto_sub -h localhost -p 1883 -u admin -P admin -t 'scada/#' -v"
