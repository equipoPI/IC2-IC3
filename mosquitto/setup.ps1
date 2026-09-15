# Script de configuración rápida para Mosquitto MQTT Broker
# Sistema SCADA - Windows PowerShell

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Configuración Mosquitto MQTT - Sistema SCADA" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Crear directorios necesarios
Write-Host "📁 Creando directorios..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "mosquitto\data" | Out-Null
New-Item -ItemType Directory -Force -Path "mosquitto\log" | Out-Null

Write-Host ""
Write-Host "✅ Estructura de directorios creada" -ForegroundColor Green
Write-Host ""

# Preguntar si desea habilitar autenticación
$auth = Read-Host "¿Desea configurar autenticación MQTT? (s/n)"

if ($auth -eq "s" -or $auth -eq "S") {
    Write-Host ""
    Write-Host "🔒 Configurando autenticación..." -ForegroundColor Yellow
    
    # Iniciar contenedor
    docker-compose up -d mosquitto
    Start-Sleep -Seconds 3
    
    # Crear usuario
    $mqtt_user = Read-Host "Nombre de usuario MQTT"
    docker-compose exec mosquitto mosquitto_passwd -c /mosquitto/config/passwd $mqtt_user
    
    # Actualizar configuración
    Write-Host ""
    Write-Host "📝 Actualizando mosquitto.conf..." -ForegroundColor Yellow
    
    $configPath = "mosquitto\config\mosquitto.conf"
    $config = Get-Content $configPath
    $config = $config -replace "# allow_anonymous false", "allow_anonymous false"
    $config = $config -replace "# password_file /mosquitto/config/passwd", "password_file /mosquitto/config/passwd"
    $config | Set-Content $configPath
    
    # Reiniciar mosquitto
    docker-compose restart mosquitto
    
    Write-Host ""
    Write-Host "✅ Autenticación configurada" -ForegroundColor Green
    Write-Host "Usuario: $mqtt_user" -ForegroundColor Yellow
    Write-Host ""
}

# Obtener IP de la máquina
Write-Host "🌐 Detectando IP de la máquina..." -ForegroundColor Yellow
$IP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*","Wi-Fi*" | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1).IPAddress

if (-not $IP) {
    $IP = "TU_IP_AQUI"
    Write-Host "⚠️  No se pudo detectar IP automáticamente" -ForegroundColor Yellow
    Write-Host "Ejecuta 'ipconfig' para ver tu IP" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "✅ Configuración completada" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📡 Configuración para Raspberry Pi Gateway:" -ForegroundColor Cyan
Write-Host ""
Write-Host "En control/raspberry_gateway/config.yaml:"
Write-Host ""
Write-Host "mqtt:"
Write-Host "  broker: `"$IP`""
Write-Host "  port: 1883"

if ($auth -eq "s" -or $auth -eq "S") {
    Write-Host "  username: `"$mqtt_user`""
    Write-Host "  password: `"tu_contraseña`""
}

Write-Host ""
Write-Host "🧪 Probar conexión:" -ForegroundColor Cyan
Write-Host "mosquitto_sub -h localhost -p 1883 -t '#' -v"
Write-Host ""
Write-Host "📚 Ver más información: mosquitto\README.md"
Write-Host ""
Write-Host "🚀 Para levantar todos los servicios:" -ForegroundColor Cyan
Write-Host "docker-compose up -d"
Write-Host ""
