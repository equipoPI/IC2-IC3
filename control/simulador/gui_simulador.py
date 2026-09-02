"""
Simulador Interactivo Visual GUI (Tkinter) para Pruebas SCADA Multi-Dispositivo & Multi-Red.

Características:
1. Permite modificar libremente la Dirección MAC / Gateway ID (en lugar de ser fija).
2. Pestañas organizadas: Conexión & Tópicos, Control de Telemetría (Random vs Sliders), Monitor de Comandos.
3. Luces LED virtuales (Canvas) que se encienden/apagan al recibir órdenes desde la web (/scada o /control).
4. Publicación en tiempo real hacia Mosquitto MQTT.
"""

from __future__ import annotations

import json
import math
import random
import sys
import os
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import yaml

# Agregar directorio actual al sys.path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

try:
    import paho.mqtt.client as mqtt
except ImportError:
    messagebox.showerror("Error de Dependencias", "Se requiere 'paho-mqtt'. Instálalo con: pip install paho-mqtt")
    sys.exit(1)


class SimuladorGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("SCADA - Simulador Interactivo Multi-Dispositivo & Red")
        self.root.geometry("820x640")
        self.root.minsize(780, 580)
        
        # Configurar estilos ttk
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Estado de conexión y cliente MQTT
        self.client: Optional[mqtt.Client] = None
        self.is_connected = False
        self.running = True
        
        # Variables simuladas físicas
        self.modo_telemetria = tk.StringVar(value="manual") # "manual" o "random"
        self.intervalo_envio = tk.DoubleVar(value=2.0)
        
        # Sliders y Valores
        self.val_temp = tk.DoubleVar(value=24.5)
        self.val_presion = tk.DoubleVar(value=2.4)
        self.val_bombo1 = tk.DoubleVar(value=80.0)
        self.val_bombo2 = tk.DoubleVar(value=60.0)
        self.val_mezcla = tk.DoubleVar(value=15.0)
        self.val_caudal_a = tk.DoubleVar(value=12.5)
        self.val_caudal_b = tk.DoubleVar(value=8.3)
        
        # Estado de actuadores (Luces LED)
        self.actuadores_estado = {
            "pump-1": False,
            "pump-2": False,
            "bomba_mezcla": False,
            "mixer-1": False,
            "bomba_reposicion": False,
            "electrovalvula-1": False,
            "electrovalvula-2": False,
        }
        self.led_canvas_map: Dict[str, tk.Canvas] = {}
        self.led_circle_map: Dict[str, int] = {}
        
        # Configuración por defecto
        self.config_path = CURRENT_DIR / "config.yaml"
        self.load_config_defaults()
        
        # Construir Interfaz
        self.build_ui()
        
        # Protocolo de cierre
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        
        # Hilo de simulación y publicación continua
        self.sim_thread = threading.Thread(target=self.loop_telemetria, daemon=True)
        self.sim_thread.start()

    def load_config_defaults(self):
        self.host_var = tk.StringVar(value="localhost")
        self.port_var = tk.IntVar(value=1883)
        self.user_var = tk.StringVar(value="admin")
        self.pass_var = tk.StringVar(value="admin")
        self.tenant_var = tk.StringVar(value="rafaela_sa")
        self.gateway_mac_var = tk.StringVar(value="d83add60dbb0") # Editable libremente

        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    cfg = yaml.safe_load(f)
                    m = cfg.get("mqtt", {})
                    self.host_var.set(m.get("broker", "localhost"))
                    self.port_var.set(m.get("port", 1883))
                    self.user_var.set(m.get("username", "admin"))
                    self.pass_var.set(m.get("password", "admin"))
                    self.tenant_var.set(m.get("tenant", "rafaela_sa"))
                    self.gateway_mac_var.set(m.get("gateway_id", "d83add60dbb0"))
            except Exception:
                pass

    def build_ui(self):
        # Header principal
        header_frame = ttk.Frame(self.root, padding=10)
        header_frame.pack(fill="x")
        
        lbl_title = ttk.Label(header_frame, text="🧪 Simulador SCADA IoT - Testeo Multisitio", font=("Segoe UI", 14, "bold"))
        lbl_title.pack(side="left")
        
        self.lbl_status_badge = tk.Label(
            header_frame, text="🔴 DESCONECTADO", bg="#dc2626", fg="white", font=("Segoe UI", 9, "bold"), px=8, py=3
        )
        self.lbl_status_badge.pack(side="right")
        
        # Notebook (Pestañas)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Pestaña 1: Conexión & Configuración
        self.tab_conexion = ttk.Frame(self.notebook, padding=15)
        self.notebook.add(self.tab_conexion, text="🔌 Conexión & Tópicos")
        self.build_tab_conexion()
        
        # Pestaña 2: Control de Telemetría (Random / Sliders)
        self.tab_telemetria = ttk.Frame(self.notebook, padding=15)
        self.notebook.add(self.tab_telemetria, text="📊 Telemetría & Sliders")
        self.build_tab_telemetria()
        
        # Pestaña 3: Monitor de Comandos & Luces LED
        self.tab_actuadores = ttk.Frame(self.notebook, padding=15)
        self.notebook.add(self.tab_actuadores, text="💡 Actuadores & Luces LED")
        self.build_tab_actuadores()

    def build_tab_conexion(self):
        grid = ttk.LabelFrame(self.tab_conexion, text="Parámetros de Conexión MQTT & MAC Personalizable", padding=15)
        grid.pack(fill="x", pady=5)
        
        # Broker Host
        ttk.Label(grid, text="Broker MQTT (Host/IP):").grid(row=0, column=0, sticky="w", py=5)
        ttk.Entry(grid, textvariable=self.host_var, width=25).grid(row=0, column=1, sticky="w", px=5)
        
        # Puerto
        ttk.Label(grid, text="Puerto MQTT:").grid(row=0, column=2, sticky="w", py=5, px=10)
        ttk.Entry(grid, textvariable=self.port_var, width=10).grid(row=0, column=3, sticky="w", px=5)
        
        # Usuario
        ttk.Label(grid, text="Usuario MQTT:").grid(row=1, column=0, sticky="w", py=5)
        ttk.Entry(grid, textvariable=self.user_var, width=25).grid(row=1, column=1, sticky="w", px=5)
        
        # Contraseña
        ttk.Label(grid, text="Contraseña:").grid(row=1, column=2, sticky="w", py=5, px=10)
        ttk.Entry(grid, textvariable=self.pass_var, show="*", width=15).grid(row=1, column=3, sticky="w", px=5)
        
        # Tenant
        ttk.Label(grid, text="Tenant / Fábrica:").grid(row=2, column=0, sticky="w", py=5)
        ttk.Entry(grid, textvariable=self.tenant_var, width=25).grid(row=2, column=1, sticky="w", px=5)
        
        # MAC / Gateway ID Personalizable
        ttk.Label(grid, text="Gateway ID / Dirección MAC (Editable):", font=("Segoe UI", 9, "bold")).grid(row=2, column=2, sticky="w", py=5, px=10)
        ttk.Entry(grid, textvariable=self.gateway_mac_var, width=25, font=("Consolas", 10, "bold")).grid(row=2, column=3, sticky="w", px=5)
        
        # Botones de Acción de Conexión
        btn_frame = ttk.Frame(self.tab_conexion, padding=10)
        btn_frame.pack(fill="x", pady=10)
        
        self.btn_connect = tk.Button(
            btn_frame, text="▶ Conectar al Broker MQTT", bg="#16a34a", fg="white", font=("Segoe UI", 10, "bold"),
            command=self.toggle_connection, px=15, py=6
        )
        self.btn_connect.pack(side="left", px=5)
        
        # Info estructural
        info_frame = ttk.LabelFrame(self.tab_conexion, text="Estructura de Tópicos Generada", padding=15)
        info_frame.pack(fill="both", expand=True, pady=10)
        
        txt_topics = (
            "Los datos de telemetría y comandos se transmitirán utilizando el esquema:\n\n"
            "• Telemetría: {tenant}/{gateway_id}/{seccion}/{sistema}/{categoria}/{dispositivo}\n"
            "• Acciones desde Web: {tenant}/{gateway_id}/{seccion}/{sistema}/accion\n"
            "• Diagnóstico Global: {tenant}/{gateway_id}/estado/general\n\n"
            "Modifica el campo 'Gateway ID / Dirección MAC' arriba para simular diferentes clientes o pasarelas de prueba."
        )
        ttk.Label(info_frame, text=txt_topics, justify="left", font=("Segoe UI", 9)).pack(anchor="w")

    def build_tab_telemetria(self):
        # Selector de Modo
        mode_frame = ttk.LabelFrame(self.tab_telemetria, text="Modo de Generación de Telemetría", padding=10)
        mode_frame.pack(fill="x", pady=5)
        
        ttk.Radiobutton(mode_frame, text="🎛️ Control Manual por Sliders en Vivo", variable=self.modo_telemetria, value="manual").pack(side="left", px=15)
        ttk.Radiobutton(mode_frame, text="🎲 Modo Sintético Aleatorio (Random)", variable=self.modo_telemetria, value="random").pack(side="left", px=15)
        
        # Sliders Frame
        sliders_frame = ttk.LabelFrame(self.tab_telemetria, text="Ajuste Manual de Variables y Sensores", padding=15)
        sliders_frame.pack(fill="both", expand=True, pady=5)
        
        # 1. Temperatura
        ttk.Label(sliders_frame, text="Temperatura (°C):").grid(row=0, column=0, sticky="w", py=5)
        s_temp = ttk.Scale(sliders_frame, from_=0.0, to=100.0, variable=self.val_temp, orient="horizontal", length=220)
        s_temp.grid(row=0, column=1, px=10)
        ttk.Label(sliders_frame, textvariable=tk.StringVar(value=""), width=8).grid(row=0, column=2)
        lbl_v_temp = ttk.Label(sliders_frame, text="", font=("Consolas", 10, "bold"))
        lbl_v_temp.grid(row=0, column=2, sticky="w")
        self.val_temp.trace_add("write", lambda *args: lbl_v_temp.config(text=f"{self.val_temp.get():.1f} °C"))
        lbl_v_temp.config(text=f"{self.val_temp.get():.1f} °C")

        # 2. Presión
        ttk.Label(sliders_frame, text="Presión (Bar):").grid(row=1, column=0, sticky="w", py=5)
        s_pres = ttk.Scale(sliders_frame, from_=0.0, to=10.0, variable=self.val_presion, orient="horizontal", length=220)
        s_pres.grid(row=1, column=1, px=10)
        lbl_v_pres = ttk.Label(sliders_frame, text="", font=("Consolas", 10, "bold"))
        lbl_v_pres.grid(row=1, column=2, sticky="w")
        self.val_presion.trace_add("write", lambda *args: lbl_v_pres.config(text=f"{self.val_presion.get():.2f} Bar"))
        lbl_v_pres.config(text=f"{self.val_presion.get():.2f} Bar")

        # 3. Nivel Bombo 1
        ttk.Label(sliders_frame, text="Nivel Bombo 1 (%):").grid(row=2, column=0, sticky="w", py=5)
        s_b1 = ttk.Scale(sliders_frame, from_=0.0, to=100.0, variable=self.val_bombo1, orient="horizontal", length=220)
        s_b1.grid(row=2, column=1, px=10)
        lbl_v_b1 = ttk.Label(sliders_frame, text="", font=("Consolas", 10, "bold"))
        lbl_v_b1.grid(row=2, column=2, sticky="w")
        self.val_bombo1.trace_add("write", lambda *args: lbl_v_b1.config(text=f"{self.val_bombo1.get():.1f} %"))
        lbl_v_b1.config(text=f"{self.val_bombo1.get():.1f} %")

        # 4. Nivel Bombo 2
        ttk.Label(sliders_frame, text="Nivel Bombo 2 (%):").grid(row=3, column=0, sticky="w", py=5)
        s_b2 = ttk.Scale(sliders_frame, from_=0.0, to=100.0, variable=self.val_bombo2, orient="horizontal", length=220)
        s_b2.grid(row=3, column=1, px=10)
        lbl_v_b2 = ttk.Label(sliders_frame, text="", font=("Consolas", 10, "bold"))
        lbl_v_b2.grid(row=3, column=2, sticky="w")
        self.val_bombo2.trace_add("write", lambda *args: lbl_v_b2.config(text=f"{self.val_bombo2.get():.1f} %"))
        lbl_v_b2.config(text=f"{self.val_bombo2.get():.1f} %")

        # 5. Nivel Tanque Mezcla
        ttk.Label(sliders_frame, text="Nivel Mezcla (%):").grid(row=4, column=0, sticky="w", py=5)
        s_mz = ttk.Scale(sliders_frame, from_=0.0, to=100.0, variable=self.val_mezcla, orient="horizontal", length=220)
        s_mz.grid(row=4, column=1, px=10)
        lbl_v_mz = ttk.Label(sliders_frame, text="", font=("Consolas", 10, "bold"))
        lbl_v_mz.grid(row=4, column=2, sticky="w")
        self.val_mezcla.trace_add("write", lambda *args: lbl_v_mz.config(text=f"{self.val_mezcla.get():.1f} %"))
        lbl_v_mz.config(text=f"{self.val_mezcla.get():.1f} %")

        # Botón de disparo manual
        btn_pub = tk.Button(
            self.tab_telemetria, text="⚡ Publicar Lecturas Ahora", bg="#2563eb", fg="white", font=("Segoe UI", 9, "bold"),
            command=self.publicar_manual_ahora, px=12, py=4
        )
        btn_pub.pack(anchor="e", py=5)

    def build_tab_actuadores(self):
        # Panel de Luces LED
        led_frame = ttk.LabelFrame(self.tab_actuadores, text="Luces Indicadoras LED (Respuesta a Comandos del Frontend Web)", padding=15)
        led_frame.pack(fill="x", pady=5)
        
        actuadores_info = [
            ("pump-1", "Bomba P1 (Bombo 1)"),
            ("pump-2", "Bomba P2 (Bombo 2)"),
            ("bomba_mezcla", "Bomba de Mezcla"),
            ("mixer-1", "Mezclador M1"),
            ("bomba_reposicion", "Bomba Reposición"),
            ("electrovalvula-1", "Válvula Rep. A"),
            ("electrovalvula-2", "Válvula Rep. B"),
        ]
        
        grid_leds = ttk.Frame(led_frame)
        grid_leds.pack(fill="x")
        
        col = 0
        row = 0
        for dev_id, nombre in actuadores_info:
            item_f = ttk.Frame(grid_leds, padding=6)
            item_f.grid(row=row, column=col, sticky="w", px=8, py=4)
            
            canvas = tk.Canvas(item_f, width=24, height=24, bg=self.root.cget("bg"), highlightthickness=0)
            canvas.pack(side="left", px=4)
            circle = canvas.create_oval(3, 3, 21, 21, fill="#6b7280", outline="#374151") # Gris por defecto (inactivo)
            
            lbl = ttk.Label(item_f, text=nombre, font=("Segoe UI", 9, "bold"))
            lbl.pack(side="left", px=4)
            
            self.led_canvas_map[dev_id] = canvas
            self.led_circle_map[dev_id] = circle
            
            col += 1
            if col > 2:
                col = 0
                row += 1

        # Consola de Registros de Comandos Recibidos
        log_frame = ttk.LabelFrame(self.tab_actuadores, text="Consola de Comandos Recibidos desde el Frontend SCADA", padding=10)
        log_frame.pack(fill="both", expand=True, pady=10)
        
        self.txt_log = scrolledtext.ScrolledText(log_frame, height=10, font=("Consolas", 9), bg="#1e1e1e", fg="#4ade80")
        self.txt_log.pack(fill="both", expand=True)
        self.log_msg("Esperando conexión con el Broker MQTT...")

    def log_msg(self, msg: str):
        if hasattr(self, 'txt_log'):
            ts = time.strftime("[%H:%M:%S]")
            self.txt_log.insert(tk.END, f"{ts} {msg}\n")
            self.txt_log.see(tk.END)

    def update_led(self, dev_id: str, active: bool):
        if dev_id in self.led_canvas_map and dev_id in self.led_circle_map:
            canvas = self.led_canvas_map[dev_id]
            circle = self.led_circle_map[dev_id]
            color = "#16a34a" if active else "#6b7280" # Verde verde vivo vs Gris
            canvas.itemconfig(circle, fill=color)

    def toggle_connection(self):
        if not self.is_connected:
            self.connect_mqtt()
        else:
            self.disconnect_mqtt()

    def connect_mqtt(self):
        try:
            host = self.host_var.get().strip()
            port = int(self.port_var.get())
            user = self.user_var.get().strip()
            passwd = self.pass_var.get().strip()
            mac = self.gateway_mac_var.get().strip() or "d83add60dbb0"
            
            self.client = mqtt.Client(client_id=f"sim_gui_{mac}_{random.randint(100,999)}")
            if user:
                self.client.username_pw_set(user, passwd)
                
            self.client.on_connect = self.on_mqtt_connect
            self.client.on_message = self.on_mqtt_message
            self.client.on_disconnect = self.on_mqtt_disconnect
            
            self.client.connect(host, port, keepalive=60)
            self.client.loop_start()
            
            self.lbl_status_badge.config(text="🟡 CONECTANDO...", bg="#d97706")
            self.log_msg(f"Conectando a {host}:{port} con Gateway ID: {mac}...")
        except Exception as e:
            messagebox.showerror("Error de Conexión", f"No se pudo conectar al Broker MQTT:\n{e}")
            self.lbl_status_badge.config(text="🔴 ERROR CONEXIÓN", bg="#dc2626")

    def disconnect_mqtt(self):
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
        self.is_connected = False
        self.lbl_status_badge.config(text="🔴 DESCONECTADO", bg="#dc2626")
        self.btn_connect.config(text="▶ Conectar al Broker MQTT", bg="#16a34a")
        self.log_msg("Desconectado del Broker MQTT.")

    def on_mqtt_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.is_connected = True
            tenant = self.tenant_var.get().strip() or "rafaela_sa"
            mac = self.gateway_mac_var.get().strip() or "d83add60dbb0"
            
            # Suscribirse a tópicos de acción
            topic_sub = f"{tenant}/{mac}/#/#/accion"
            topic_sub_cmd = f"cmd/#"
            client.subscribe("#") # Suscripción global para monitorear todas las órdenes del front
            
            self.root.after(0, lambda: self.lbl_status_badge.config(text="🟢 CONECTADO ONLINE", bg="#16a34a"))
            self.root.after(0, lambda: self.btn_connect.config(text="⏹ Desconectar Broker", bg="#dc2626"))
            self.root.after(0, lambda: self.log_msg(f"Conectado exitosamente. Suscrito a acciones de {tenant}/{mac}."))
        else:
            self.root.after(0, lambda: self.lbl_status_badge.config(text="🔴 RECHAZADO", bg="#dc2626"))

    def on_mqtt_disconnect(self, client, userdata, rc):
        self.is_connected = False
        self.root.after(0, lambda: self.lbl_status_badge.config(text="🔴 DESCONECTADO", bg="#dc2626"))
        self.root.after(0, lambda: self.btn_connect.config(text="▶ Conectar al Broker MQTT", bg="#16a34a"))

    def on_mqtt_message(self, client, userdata, msg):
        topic = msg.topic
        payload_str = msg.payload.decode('utf-8', errors='ignore')
        
        # Ignorar telemetría propia publicada
        if "/sensores/" in topic or "/nivel/" in topic or "/caudal/" in topic:
            return
            
        self.root.after(0, lambda: self.log_msg(f"📩 [{topic}] -> {payload_str}"))
        
        # Interpretar comandos de actuadores
        up_payload = payload_str.upper()
        if "PUMP-1" in topic or "bomba1" in topic:
            act = "INICIAR" in up_payload or "1" in up_payload or "ON" in up_payload or "ABRIR" in up_payload
            self.actuadores_estado["pump-1"] = act
            self.root.after(0, lambda: self.update_led("pump-1", act))
            
        if "PUMP-2" in topic or "bomba2" in topic:
            act = "INICIAR" in up_payload or "1" in up_payload or "ON" in up_payload or "ABRIR" in up_payload
            self.actuadores_estado["pump-2"] = act
            self.root.after(0, lambda: self.update_led("pump-2", act))
            
        if "BOMBA_MEZCLA" in topic or "bomba_mezcla" in topic:
            act = "INICIAR" in up_payload or "1" in up_payload or "ON" in up_payload or "ABRIR" in up_payload
            self.actuadores_estado["bomba_mezcla"] = act
            self.root.after(0, lambda: self.update_led("bomba_mezcla", act))
            
        if "MIXER-1" in topic or "mezclador" in topic:
            act = "INICIAR" in up_payload or "1" in up_payload or "ON" in up_payload or "ABRIR" in up_payload
            self.actuadores_estado["mixer-1"] = act
            self.root.after(0, lambda: self.update_led("mixer-1", act))

        if "ELECTROVALVULA-1" in topic or "valvula_a" in topic:
            act = "1" in up_payload or "ON" in up_payload or "ABRIR" in up_payload or "INICIAR" in up_payload
            self.actuadores_estado["electrovalvula-1"] = act
            self.root.after(0, lambda: self.update_led("electrovalvula-1", act))

        if "ELECTROVALVULA-2" in topic or "valvula_b" in topic:
            act = "1" in up_payload or "ON" in up_payload or "ABRIR" in up_payload or "INICIAR" in up_payload
            self.actuadores_estado["electrovalvula-2"] = act
            self.root.after(0, lambda: self.update_led("electrovalvula-2", act))

        if "BOMBA_REPOSICION" in topic or "bomba_reposicion" in topic:
            act = "INICIAR" in up_payload or "1" in up_payload or "ON" in up_payload or "ABRIR" in up_payload
            self.actuadores_estado["bomba_reposicion"] = act
            self.root.after(0, lambda: self.update_led("bomba_reposicion", act))

    def publicar_manual_ahora(self):
        if not self.is_connected or not self.client:
            messagebox.showwarning("Sin Conexión", "Debes conectar el cliente MQTT primero.")
            return
        self.emitir_telemetria_actual()

    def emitir_telemetria_actual(self):
        if not self.is_connected or not self.client:
            return
            
        tenant = self.tenant_var.get().strip() or "rafaela_sa"
        mac = self.gateway_mac_var.get().strip() or "d83add60dbb0"
        modo = self.modo_telemetria.get()
        
        if modo == "random":
            temp = round(20.0 + random.uniform(0.0, 15.0), 1)
            pres = round(2.0 + random.uniform(-0.5, 0.5), 2)
            b1 = round(max(0.0, min(100.0, self.val_bombo1.get() + random.uniform(-1.0, 1.0))), 1)
            b2 = round(max(0.0, min(100.0, self.val_bombo2.get() + random.uniform(-1.0, 1.0))), 1)
            mz = round(max(0.0, min(100.0, self.val_mezcla.get() + random.uniform(-0.5, 0.5))), 1)
            c_a = round(12.0 + random.uniform(-0.5, 0.5), 1) if self.actuadores_estado["pump-1"] else 0.0
            c_b = round(8.0 + random.uniform(-0.5, 0.5), 1) if self.actuadores_estado["pump-2"] else 0.0
            
            self.val_temp.set(temp)
            self.val_presion.set(pres)
            self.val_bombo1.set(b1)
            self.val_bombo2.set(b2)
            self.val_mezcla.set(mz)
            self.val_caudal_a.set(c_a)
            self.val_caudal_b.set(c_b)
        else:
            temp = self.val_temp.get()
            pres = self.val_presion.get()
            b1 = self.val_bombo1.get()
            b2 = self.val_bombo2.get()
            mz = self.val_mezcla.get()
            c_a = self.val_caudal_a.get()
            c_b = self.val_caudal_b.get()

        # Publicar tópicos estándar
        base = f"{tenant}/{mac}/a1/linea_mezclado_1"
        
        # 1. Niveles de Bombos y Tanque Mezcla
        self.client.publish(f"{base}/nivel/sensor_nivel_bombo1", json.dumps({"value": b1, "estado": "ONLINE", "unidad": "%"}))
        self.client.publish(f"{base}/nivel/sensor_nivel_bombo2", json.dumps({"value": b2, "estado": "ONLINE", "unidad": "%"}))
        self.client.publish(f"{base}/nivel/sensor_nivel_mezcla", json.dumps({"value": mz, "estado": "ONLINE", "unidad": "%"}))
        
        # 2. Caudales
        self.client.publish(f"{base}/caudal/sensor-3", json.dumps({"value": c_a, "estado": "ONLINE", "unidad": "L/min"}))
        self.client.publish(f"{base}/caudal/sensor_caudal_02", json.dumps({"value": c_b, "estado": "ONLINE", "unidad": "L/min"}))
        
        # 3. Temperatura & Presión Generales
        self.client.publish(f"{base}/sensores/temperatura", json.dumps({"value": temp, "estado": "ONLINE", "unidad": "°C"}))
        self.client.publish(f"{base}/sensores/presion", json.dumps({"value": pres, "estado": "ONLINE", "unidad": "Bar"}))

        # 4. Diagnóstico de Planta
        self.client.publish(
            f"{tenant}/{mac}/estado/general",
            json.dumps({"estado": "OPERATIVO", "porcentaje_produccion": round(b1 * 0.5 + b2 * 0.5, 1), "temperatura_promedio": temp})
        )

    def loop_telemetria(self):
        while self.running:
            if self.is_connected:
                try:
                    self.emitir_telemetria_actual()
                except Exception as e:
                    pass
            time.sleep(self.intervalo_envio.get())

    def on_close(self):
        self.running = False
        self.disconnect_mqtt()
        self.root.destroy()


if __name__ == "__main__":
    app = SimuladorGUI()
    app.root.mainloop()
