#!/bin/bash

# Script de instalación para Raspberry Pi Gateway
# Instala todas las dependencias y configura el sistema

set -e  # Salir en caso de error

echo "=================================================="
echo "   Instalación Raspberry Pi SCADA Gateway"
echo "=================================================="
echo ""

# Verificar que se ejecuta como root o con sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor ejecutar con sudo"
    exit 1
fi

# Obtener usuario real (no root)
REAL_USER=${SUDO_USER:-$USER}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="/opt/scada_gateway"

echo "📦 Actualizando sistema..."
apt update
apt upgrade -y

echo "📦 Instalando dependencias del sistema..."
apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    sqlite3 \
    mosquitto \
    mosquitto-clients

echo "📁 Creando directorios..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/logs"
mkdir -p "$INSTALL_DIR/data"
mkdir -p "$INSTALL_DIR/backups"

echo "📋 Copiando archivos..."
cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/"

echo "🐍 Creando entorno virtual Python..."
cd "$INSTALL_DIR"
python3 -m venv venv

echo "📦 Instalando dependencias Python..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "🔧 Configurando permisos de puerto serial..."
usermod -a -G dialout "$REAL_USER"

# Detectar puerto serial del Arduino
SERIAL_PORT=""
if [ -e "/dev/ttyACM0" ]; then
    SERIAL_PORT="/dev/ttyACM0"
elif [ -e "/dev/ttyUSB0" ]; then
    SERIAL_PORT="/dev/ttyUSB0"
fi

if [ -n "$SERIAL_PORT" ]; then
    echo "✅ Puerto serial detectado: $SERIAL_PORT"
    chmod 666 "$SERIAL_PORT"
    # Actualizar config.yaml con el puerto correcto
    sed -i "s|port: \"/dev/ttyACM0\"|port: \"$SERIAL_PORT\"|g" "$INSTALL_DIR/config.yaml"
else
    echo "⚠️  No se detectó Arduino conectado"
fi

echo "🔧 Configurando servicio systemd..."
cat > /etc/systemd/system/raspberry_gateway.service << EOF
[Unit]
Description=Raspberry Pi SCADA Gateway
After=network.target

[Service]
Type=simple
User=$REAL_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/venv/bin/python $INSTALL_DIR/src/gateway_main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "🔄 Habilitando servicio..."
systemctl daemon-reload
systemctl enable raspberry_gateway.service

echo "🔧 Configurando permisos..."
chown -R "$REAL_USER:$REAL_USER" "$INSTALL_DIR"

echo ""
echo "=================================================="
echo "✅ Instalación completada exitosamente"
echo "=================================================="
echo ""
echo "📝 Siguiente pasos:"
echo "   1. Editar configuración: sudo nano $INSTALL_DIR/config.yaml"
echo "   2. Iniciar servicio: sudo systemctl start raspberry_gateway"
echo "   3. Ver estado: sudo systemctl status raspberry_gateway"
echo "   4. Ver logs: sudo journalctl -u raspberry_gateway -f"
echo ""
echo "⚠️  IMPORTANTE: Reinicia la sesión o ejecuta:"
echo "   newgrp dialout"
echo "   para aplicar permisos de puerto serial"
echo ""
