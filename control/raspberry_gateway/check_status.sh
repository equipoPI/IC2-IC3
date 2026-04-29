#!/bin/bash

# Script para verificar el estado del sistema
# Útil para diagnóstico y troubleshooting

echo "=================================================="
echo "   Diagnóstico Raspberry Pi SCADA Gateway"
echo "=================================================="
echo ""

echo "📊 Estado del servicio:"
systemctl status raspberry_gateway.service --no-pager | head -n 10
echo ""

echo "📊 Recursos del sistema:"
echo "  CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')%"
echo "  RAM: $(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2 }')"
echo "  Disco: $(df -h / | awk 'NR==2{print $5}')"

# Temperatura (específico Raspberry Pi)
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$(echo "scale=1; $TEMP/1000" | bc)
    echo "  Temperatura: ${TEMP_C}°C"
fi
echo ""

echo "📊 Puertos seriales disponibles:"
ls -la /dev/tty{ACM,USB}* 2>/dev/null || echo "  No se encontraron dispositivos seriales"
echo ""

echo "📊 Conexión MQTT:"
if systemctl is-active --quiet mosquitto; then
    echo "  ✅ Mosquitto activo"
else
    echo "  ❌ Mosquitto inactivo"
fi
echo ""

echo "📊 Base de datos:"
if [ -f "/opt/scada_gateway/data/scada_local.db" ]; then
    DB_SIZE=$(du -h /opt/scada_gateway/data/scada_local.db | awk '{print $1}')
    echo "  ✅ Base de datos: $DB_SIZE"
    
    # Contar registros
    RECORDS=$(sqlite3 /opt/scada_gateway/data/scada_local.db "SELECT COUNT(*) FROM mediciones;" 2>/dev/null || echo "N/A")
    echo "  📊 Mediciones almacenadas: $RECORDS"
else
    echo "  ❌ Base de datos no encontrada"
fi
echo ""

echo "📊 Últimas 10 líneas del log:"
journalctl -u raspberry_gateway.service -n 10 --no-pager
echo ""

echo "=================================================="
echo "Comandos útiles:"
echo "  - Reiniciar: sudo systemctl restart raspberry_gateway"
echo "  - Detener:   sudo systemctl stop raspberry_gateway"
echo "  - Logs:      sudo journalctl -u raspberry_gateway -f"
echo "=================================================="
