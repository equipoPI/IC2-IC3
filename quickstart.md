# ⚡ Inicio Rápido - Sistema SCADA Industrial 4.0

## 1. Requisitos Previos
- [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado y en ejecución.

## 2. Puesta en Marcha en 3 Pasos

```powershell
# 1. Copiar plantilla de variables de entorno
cp .env.example .env

# 2. Levantar el stack completo (PostgreSQL, Backend, Frontend, Mosquitto)
docker compose up -d

# 3. Aplicar migraciones de base de datos
docker compose exec backend python manage.py migrate
```

## 3. Simulación de Planta en Vivo

```powershell
# Opción A: Simulador GUI Tkinter Interactivo (Recomendado)
python control/simulador/gui_simulador.py

# Opción B: Simulador CLI Headless
python control/simulador/mock_mqtt_gateway.py
```

## 4. Credenciales y Puertos por Defecto

- **Web Frontend SCADA**: [`http://localhost:5173`](http://localhost:5173)
- **Backend API & Admin**: [`http://localhost:8000/admin`](http://localhost:8000/admin)
- **Broker Mosquitto MQTT**: `localhost:1883` (`admin` / `admin`)
- **WebSockets SCADA**: `ws://localhost:8000/ws/scada/`
- **PostgreSQL 15**: `localhost:5432` (`postgres` / `postgres`)
