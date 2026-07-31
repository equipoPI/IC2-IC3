#!/bin/bash

# Script de configuración rápida para Mosquitto MQTT Broker
# Sistema SCADA

set -e

echo "=================================================="
echo "   Configuración Mosquitto MQTT - Sistema SCADA"
echo "=================================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Crear directorios necesarios
echo -e "${YELLOW}📁 Creando directorios...${NC}"
mkdir -p mosquitto/config
mkdir -p mosquitto/data
mkdir -p mosquitto/log

# Establecer permisos
echo -e "${YELLOW}🔧 Configurando permisos...${NC}"
chmod -R 755 mosquitto/

echo ""
echo -e "${GREEN}✅ Estructura de directorios creada${NC}"
echo ""

# Preguntar si desea habilitar autenticación
read -p "¿Desea configurar autenticación MQTT? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]
then
    echo ""
    echo -e "${YELLOW}🔒 Configurando autenticación...${NC}"
    
    # Iniciar contenedor temporalmente si no está corriendo
    docker-compose up -d mosquitto
    sleep 3
    
    # Crear usuario
    read -p "Nombre de usuario MQTT: " mqtt_user
    docker-compose exec mosquitto mosquitto_passwd -c /mosquitto/config/passwd "$mqtt_user"
    
    # Actualizar configuración
    echo ""
    echo -e "${YELLOW}📝 Actualizando mosquitto.conf...${NC}"
    
    # Descomentar líneas de autenticación
    sed -i 's/# allow_anonymous false/allow_anonymous false/' mosquitto/config/mosquitto.conf
    sed -i 's/# password_file \/mosquitto\/config\/passwd/password_file \/mosquitto\/config\/passwd/' mosquitto/config/mosquitto.conf
    
    # Reiniciar mosquitto
    docker-compose restart mosquitto
    
    echo ""
    echo -e "${GREEN}✅ Autenticación configurada${NC}"
    echo -e "Usuario: ${YELLOW}$mqtt_user${NC}"
    echo ""
fi

# Obtener IP de la máquina
echo -e "${YELLOW}🌐 Detectando IP de la máquina...${NC}"
if command -v ip &> /dev/null; then
    IP=$(ip route get 1 | awk '{print $7}' | head -n 1)
elif command -v ipconfig &> /dev/null; then
    echo "Ejecutar: ipconfig para ver la IP de tu PC"
    IP="TU_IP_AQUI"
else
    IP="TU_IP_AQUI"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✅ Configuración completada${NC}"
echo "=================================================="
echo ""
echo "📡 Configuración para Raspberry Pi Gateway:"
echo ""
echo "En control/raspberry_gateway/config.yaml:"
echo ""
echo "mqtt:"
echo "  broker: \"$IP\""
echo "  port: 1883"

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "  username: \"$mqtt_user\""
    echo "  password: \"tu_contraseña\""
fi

echo ""
echo "🧪 Probar conexión:"
echo "mosquitto_sub -h localhost -p 1883 -t '#' -v"
echo ""
echo "📚 Ver más información: mosquitto/README.md"
echo ""
