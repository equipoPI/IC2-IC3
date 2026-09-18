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
        
        # Selección / Habilitación dinámica de componentes (Checkbuttons para simulación de presencia/ausencia)
        self.componentes_habilitados: Dict[str, tk.BooleanVar] = {
            "nivel_bombo1": tk.BooleanVar(value=False),
            "nivel_bombo2": tk.BooleanVar(value=False),
            "nivel_mezcla": tk.BooleanVar(value=True),
            "caudal_1": tk.BooleanVar(value=False),
            "caudal_2": tk.BooleanVar(value=False),
            "temperatura": tk.BooleanVar(value=False),
            "presion": tk.BooleanVar(value=False),
            "pump-1": tk.BooleanVar(value=True),
            "pump-2": tk.BooleanVar(value=True),
            "bomba_mezcla": tk.BooleanVar(value=False),
            "mixer-1": tk.BooleanVar(value=False),
            "bomba_reposicion": tk.BooleanVar(value=False),
            "electrovalvula-1": tk.BooleanVar(value=False),
            "electrovalvula-2": tk.BooleanVar(value=False),
        }

        # Configuración por defecto
        self.config_path = CURRENT_DIR / "config.yaml"
        self.showing_topics = False
        self.load_config_defaults()

        # Construir Interfaz
        self.build_ui()
        
        # Protocolo de cierre
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        
        # Hilo de simulación y publicación continua
        self.sim_thread = threading.Thread(target=self.loop_telemetria, daemon=True)
        self.sim_thread.start()

    def is_componente_enabled(self, key: str) -> bool:
        var = self.componentes_habilitados.get(key)
        return var.get() if var else True

    def set_all_componentes(self, status: bool):
        for var in self.componentes_habilitados.values():
            var.set(status)

    def load_config_defaults(self):
        self.host_var = tk.StringVar(value="100.69.41.46")
        self.port_var = tk.IntVar(value=1883)
        self.user_var = tk.StringVar(value="admin")
        self.pass_var = tk.StringVar(value="admin")
        self.tenant_var = tk.StringVar(value="rafaela_sa")
        self.gateway_mac_var = tk.StringVar(value="d83add60dbb0") # Editable libremente
        self.sector_var = tk.StringVar(value="A1")
        self.sistema_var = tk.StringVar(value="linea_mezclado_1")

        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    cfg = yaml.safe_load(f)
                    m = cfg.get("mqtt", {})
                    self.host_var.set(m.get("broker", "100.69.41.46"))
                    self.port_var.set(m.get("port", 1883))
                    self.user_var.set(m.get("username", "admin"))
                    self.pass_var.set(m.get("password", "admin"))
                    self.tenant_var.set(m.get("tenant", "rafaela_sa"))
                    self.gateway_mac_var.set(m.get("gateway_id", "d83add60dbb0"))
                    self.sector_var.set(m.get("default_sector", "A1"))
                    self.sistema_var.set(m.get("default_system", "linea_mezclado_1"))
            except Exception:
                pass

        # Trace listeners para que los tópicos mostrados en la interfaz se adapten dinámicamente al escribir
        for var in (self.tenant_var, self.gateway_mac_var, self.sector_var, self.sistema_var):
            var.trace_add("write", lambda *args: self._on_params_changed())

    def build_ui(self):
        # Header principal
        header_frame = ttk.Frame(self.root, padding=10)
        header_frame.pack(fill="x")
        
        lbl_title = ttk.Label(header_frame, text="🧪 Simulador SCADA IoT - Testeo Multisitio", font=("Segoe UI", 14, "bold"))
        lbl_title.pack(side="left")
        
        self.lbl_status_badge = tk.Label(
            header_frame, text="🔴 DESCONECTADO", bg="#dc2626", fg="white", font=("Segoe UI", 9, "bold"), padx=8, pady=3
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
        # Frame principal con panel lateral (izquierda) y monitor (derecha)
        main_frame = ttk.Frame(self.tab_conexion)
        main_frame.pack(fill="both", expand=True)
        
        # ===== PANEL LATERAL IZQUIERDO =====
        left_panel = ttk.LabelFrame(main_frame, text="Panel Lateral", padding=10, width=300)
        left_panel.pack(side="left", fill="both", expand=False, padx=(0, 5))
        left_panel.pack_propagate(False)
        
        # --- SECCIÓN SUPERIOR: Configuración ---
        config_frame = ttk.LabelFrame(left_panel, text="Configuración MQTT", padding=10)
        config_frame.pack(fill="x", pady=(0, 10))
        
        # Broker Host
        ttk.Label(config_frame, text="Broker MQTT:", font=("Segoe UI", 9)).grid(row=0, column=0, sticky="w", pady=3)
        ttk.Entry(config_frame, textvariable=self.host_var, width=20, font=("Segoe UI", 9)).grid(row=0, column=1, sticky="w", padx=3)
        
        # Puerto
        ttk.Label(config_frame, text="Puerto:", font=("Segoe UI", 9)).grid(row=1, column=0, sticky="w", pady=3)
        ttk.Entry(config_frame, textvariable=self.port_var, width=20, font=("Segoe UI", 9)).grid(row=1, column=1, sticky="w", padx=3)
        
        # Usuario
        ttk.Label(config_frame, text="Usuario:", font=("Segoe UI", 9)).grid(row=2, column=0, sticky="w", pady=3)
        ttk.Entry(config_frame, textvariable=self.user_var, width=20, font=("Segoe UI", 9)).grid(row=2, column=1, sticky="w", padx=3)
        
        # Contraseña
        ttk.Label(config_frame, text="Contraseña:", font=("Segoe UI", 9)).grid(row=3, column=0, sticky="w", pady=3)
        ttk.Entry(config_frame, textvariable=self.pass_var, show="*", width=20, font=("Segoe UI", 9)).grid(row=3, column=1, sticky="w", padx=3)
        
        # Tenant
        ttk.Label(config_frame, text="Tenant:", font=("Segoe UI", 9)).grid(row=4, column=0, sticky="w", pady=3)
        ttk.Entry(config_frame, textvariable=self.tenant_var, width=20, font=("Segoe UI", 9)).grid(row=4, column=1, sticky="w", padx=3)
        
        # Gateway ID
        ttk.Label(config_frame, text="Gateway ID:", font=("Segoe UI", 9, "bold")).grid(row=5, column=0, sticky="w", pady=3)
        ttk.Entry(config_frame, textvariable=self.gateway_mac_var, width=20, font=("Consolas", 9, "bold")).grid(row=5, column=1, sticky="w", padx=3)
        
        # Sector
        ttk.Label(config_frame, text="Sector:", font=("Segoe UI", 9)).grid(row=6, column=0, sticky="w", pady=3)
        ttk.Entry(config_frame, textvariable=self.sector_var, width=20, font=("Segoe UI", 9)).grid(row=6, column=1, sticky="w", padx=3)
        
        # Sistema
        ttk.Label(config_frame, text="Sistema:", font=("Segoe UI", 9, "bold")).grid(row=7, column=0, sticky="w", pady=3)
        ttk.Entry(config_frame, textvariable=self.sistema_var, width=20, font=("Segoe UI", 9)).grid(row=7, column=1, sticky="w", padx=3)
        
        # Botones de Control
        btn_frame1 = ttk.Frame(config_frame)
        btn_frame1.grid(row=8, column=0, columnspan=2, sticky="ew", pady=(10, 0))
        
        self.btn_connect = tk.Button(
            btn_frame1, text="▶ Conectar", bg="#16a34a", fg="white", font=("Segoe UI", 9, "bold"),
            command=self.toggle_connection, width=11
        )
        self.btn_connect.pack(side="left", padx=2)
        
        btn_refresh = tk.Button(
            btn_frame1, text="🔄 Actualizar", bg="#3b82f6", fg="white", font=("Segoe UI", 9, "bold"),
            command=self._refresh_tab_conexion, width=11
        )
        btn_refresh.pack(side="left", padx=2)
        
        # Botones de alternancia Datos/Tópicos
        ttk.Label(config_frame, text="Mostrar:", font=("Segoe UI", 9, "bold")).grid(row=9, column=0, sticky="w", pady=(10, 3))
        
        btn_frame2 = ttk.Frame(config_frame)
        btn_frame2.grid(row=10, column=0, columnspan=2, sticky="ew")
        
        self.btn_show_datos = tk.Button(
            btn_frame2, text="📊 Datos", bg="#9333ea", fg="white", font=("Segoe UI", 9, "bold"),
            command=self._show_datos_conexion, width=12
        )
        self.btn_show_datos.pack(side="left", padx=2)
        
        self.btn_show_topics_conexion = tk.Button(
            btn_frame2, text="📋 Tópicos", bg="#2563eb", fg="white", font=("Segoe UI", 9, "bold"),
            command=self._show_topics_conexion, width=12
        )
        self.btn_show_topics_conexion.pack(side="left", padx=2)

        # Botón para tópicos ampliados (modal)
        btn_modal = tk.Button(
            config_frame, text="📜 Tópicos Ampliados", bg="#475569", fg="white", font=("Segoe UI", 9, "bold"),
            command=self.mostrar_topicos_dialog, width=25
        )
        btn_modal.grid(row=11, column=0, columnspan=2, sticky="ew", pady=(8, 0))
        
        # --- SECCIÓN INFERIOR: Área de visualización (SIEMPRE DESPLEGADA) ---
        display_frame = ttk.LabelFrame(left_panel, text="Información", padding=10)
        display_frame.pack(fill="both", expand=True, pady=(10, 0))
        
        # ScrolledText para mostrar contenido
        self.display_text = scrolledtext.ScrolledText(
            display_frame, height=20, width=35, font=("Consolas", 8),
            bg="#1e293b", fg="#e2e8f0", wrap="word", relief="solid", borderwidth=1
        )
        self.display_text.pack(fill="both", expand=True)
        self.display_text.config(state="disabled")
        
        # ===== PANEL DERECHO: Monitor General =====
        right_panel = ttk.LabelFrame(main_frame, text="Monitor Principal", padding=10)
        right_panel.pack(side="right", fill="both", expand=True, padx=(5, 0))
        
        ttk.Label(right_panel, text="Información del Sistema", font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=5)
        
        self.info_conexion = scrolledtext.ScrolledText(
            right_panel, height=25, width=45, font=("Consolas", 8),
            bg="#1e293b", fg="#e2e8f0", wrap="word", relief="solid", borderwidth=1
        )
        self.info_conexion.pack(fill="both", expand=True)
        self.info_conexion.config(state="disabled")
        
        # Mostrar datos inicialmente
        self._show_datos_conexion()

    def _show_datos_conexion(self):
        """Muestra datos y estado en el panel"""
        self.showing_topics = False
        self.btn_show_datos.config(bg="#a855f7", relief="sunken")
        self.btn_show_topics_conexion.config(bg="#2563eb", relief="raised")
        self._refresh_tab_conexion()
    
    def _show_topics_conexion(self):
        """Muestra tópicos MQTT en el panel"""
        self.showing_topics = True
        self.btn_show_topics_conexion.config(bg="#0ea5e9", relief="sunken")
        self.btn_show_datos.config(bg="#9333ea", relief="raised")
        self._refresh_tab_conexion()
    
    def _refresh_tab_conexion(self, show_topics=None):
        """Actualiza el contenido del panel de visualización preservando el scroll"""
        if show_topics is not None:
            self.showing_topics = bool(show_topics)
            
        try:
            scroll_disp = self.display_text.yview()
        except Exception:
            scroll_disp = None
            
        try:
            scroll_info = self.info_conexion.yview()
        except Exception:
            scroll_info = None

        self.display_text.config(state="normal")
        self.display_text.delete(1.0, "end")
        self.info_conexion.config(state="normal")
        self.info_conexion.delete(1.0, "end")
        
        if self.showing_topics:
            self._display_topics_conexion()
        else:
            self._display_datos_conexion()
        
        self.display_text.config(state="disabled")
        self.info_conexion.config(state="disabled")
        
        if scroll_disp and scroll_disp[0] > 0.0:
            try:
                self.display_text.yview_moveto(scroll_disp[0])
            except Exception:
                pass
                
        if scroll_info and scroll_info[0] > 0.0:
            try:
                self.info_conexion.yview_moveto(scroll_info[0])
            except Exception:
                pass
    
    def _display_datos_conexion(self):
        """Muestra datos y valores actuales"""
        tenant = self.tenant_var.get() or "rafaela_sa"
        gw = self.gateway_mac_var.get() or "d83add60dbb0"
        sector = self.sector_var.get() or "A1"
        sistema = self.sistema_var.get() or "linea_mezclado_1"
        
        content = "📊 DATOS ACTUALES DE SENSORES (SLIDERS)\n"
        content += "=" * 38 + "\n\n"
        content += f"Temperatura: {self.val_temp.get():.1f} °C\n"
        content += f"Presión: {self.val_presion.get():.2f} Bar\n"
        content += f"Nivel Bombo 1: {self.val_bombo1.get():.1f} %\n"
        content += f"Nivel Bombo 2: {self.val_bombo2.get():.1f} %\n"
        content += f"Nivel Mezcla: {self.val_mezcla.get():.1f} %\n"
        content += f"Caudal 1: {self.val_caudal_a.get():.1f} L/min\n"
        content += f"Caudal 2: {self.val_caudal_b.get():.1f} L/min\n\n"
        
        content += "🌐 Conexión MQTT:\n"
        content += f"Host: {self.host_var.get()}\n"
        content += f"Puerto: {self.port_var.get()}\n"
        content += f"Usuario: {self.user_var.get()}\n"
        content += f"Tenant: {tenant}\n"
        content += f"Gateway: {gw}\n"
        content += f"Sector: {sector}\n"
        content += f"Sistema: {sistema}\n"
        content += f"Estado: {'🟢 ONLINE' if self.is_connected else '🔴 OFFLINE'}\n"
        
        self.display_text.insert("end", content)
        
        # Info panel
        info = "🖥️ ESTADO DE LUCES Y ACTUADORES\n"
        info += "=" * 32 + "\n\n"
        for dev_id, estado in self.actuadores_estado.items():
            status = "🟢 ACTIVO (ON)" if estado else "🔴 Inactivo (OFF)"
            enabled = "✓ Transmitiendo" if self.is_componente_enabled(dev_id) else "✗ Oculto/Deshabilitado"
            info += f"{dev_id}: {status} [{enabled}]\n"
        
        self.info_conexion.insert("end", info)

    def _on_params_changed(self):
        """Se ejecuta cuando el usuario modifica Planta, Gateway, Sector o Sistema en la interfaz"""
        try:
            self._refresh_tab_conexion()
        except Exception:
            pass

    def _display_topics_conexion(self):
        """Muestra la estructura completa de tópicos MQTT de Envío (Telemetría de Sliders y Luces) y Recepción (Acciones) adaptados en tiempo real"""
        tenant = self.tenant_var.get().strip() or "rafaela_sa"
        gw = self.gateway_mac_var.get().strip() or "d83add60dbb0"
        sector = self.sector_var.get().strip() or "A1"
        sistema = self.sistema_var.get().strip() or "linea_mezclado_1"
        
        # --- PANEL IZQUIERDO: TÓPICOS DE ENVÍO / TELEMETRÍA DE SLIDERS Y LUCES ---
        content = "📤 TÓPICOS DE ENVÍO (TELEMETRÍA DE SLIDERS Y LUCES)\n"
        content += "=" * 52 + "\n\n"
        content += f"🌐 Estructura de Telemetría (6 Niveles):\n"
        content += f"{{tenant}}/{{gateway_id}}/{{seccion}}/{{sistema}}/{{tipo}}/{{nombre}}\n\n"
        content += f"Empresa/Tenant: {tenant}\n"
        content += f"Gateway ID: {gw}\n"
        content += f"Sección: {sector}\n"
        content += f"Sistema: {sistema}\n\n"
        
        content += "🎛️ DATOS ENVIADOS DESDE LOS SLIDERS (SENSORES):\n"
        content += f"• Nivel Bombo 1 ({self.val_bombo1.get():.1f}%):\n"
        content += f"  Tópico: {tenant}/{gw}/{sector}/{sistema}/sensores/bombo1\n"
        content += f"  Payload: {{\"porcentaje\": {self.val_bombo1.get():.1f}, \"valor\": {self.val_bombo1.get():.1f}, \"unidad\": \"%\"}}\n\n"
        
        content += f"• Nivel Bombo 2 ({self.val_bombo2.get():.1f}%):\n"
        content += f"  Tópico: {tenant}/{gw}/{sector}/{sistema}/sensores/bombo2\n"
        content += f"  Payload: {{\"porcentaje\": {self.val_bombo2.get():.1f}, \"valor\": {self.val_bombo2.get():.1f}, \"unidad\": \"%\"}}\n\n"
        
        content += f"• Nivel Mezcla ({self.val_mezcla.get():.1f}%):\n"
        content += f"  Tópico: {tenant}/{gw}/{sector}/{sistema}/sensores/mezcla\n"
        content += f"  Payload: {{\"porcentaje\": {self.val_mezcla.get():.1f}, \"valor\": {self.val_mezcla.get():.1f}, \"unidad\": \"%\"}}\n\n"
        
        content += f"• Caudales 1 y 2 ({self.val_caudal_a.get():.1f} / {self.val_caudal_b.get():.1f} L/m):\n"
        content += f"  Tópico: {tenant}/{gw}/{sector}/{sistema}/sensores/caudal\n"
        content += f"  Payload: {{\"caudal_1\": {self.val_caudal_a.get():.1f}, \"caudal_2\": {self.val_caudal_b.get():.1f}}}\n\n"

        content += f"• Temperatura ({self.val_temp.get():.1f} °C):\n"
        content += f"  Tópico: {tenant}/{gw}/{sector}/{sistema}/sensores/temperatura\n"
        content += f"  Payload: {{\"valor\": {self.val_temp.get():.1f}, \"unidad\": \"°C\"}}\n\n"

        content += f"• Presión ({self.val_presion.get():.2f} Bar):\n"
        content += f"  Tópico: {tenant}/{gw}/{sector}/{sistema}/sensores/presion\n"
        content += f"  Payload: {{\"valor\": {self.val_presion.get():.2f}, \"unidad\": \"Bar\"}}\n\n"

        content += "💡 DATOS ENVIADOS DESDE LAS LUCES (ACTUADORES Y MOTORES):\n"
        for dev_id, st in self.actuadores_estado.items():
            est_num = 1 if st else 0
            st_text = "🟢 ON" if st else "🔴 OFF"
            content += f"• {dev_id} [{st_text}]:\n"
            content += f"  Tópico: {tenant}/{gw}/{sector}/{sistema}/actuadores/{dev_id}\n"
            content += f"  Payload: {{\"estado\": {est_num}}}\n"
        
        self.display_text.insert("end", content)
        
        # --- PANEL DERECHO: TÓPICOS DE RECEPCIÓN / COMANDOS Y ACTIVACIÓN LED ---
        info = "📥 TÓPICOS DE RECEPCIÓN (ACCIONES Y COMANDOS WEB)\n"
        info += "=" * 45 + "\n\n"
        info += "🌐 Estructura Estándar de Acción (5 Niveles):\n"
        info += "{tenant}/{gateway_id}/{seccion}/{sistema}/{accion}\n\n"
        
        info += "🟢/🔴 CONTROL DE LUCES LED DESDE LA WEB:\n\n"
        
        info += f"1️⃣ Tópico 'encender':\n"
        info += f"  Tópico: {tenant}/{gw}/{sector}/{sistema}/encender\n"
        info += f"  Payload: {{\"componente\": \"bomba_mezcla\"}}\n"
        info += f"  Payload: {{\"componente\": \"pump-1\"}}\n"
        info += f"  Payload: {{\"componente\": \"mixer-1\"}}\n\n"

        info += f"2️⃣ Tópico 'apagar':\n"
        info += f"  Tópico: {tenant}/{gw}/{sector}/{sistema}/apagar\n"
        info += f"  Payload: {{\"componente\": \"bomba_mezcla\"}}\n"
        info += f"  Payload: {{\"componente\": \"pump-1\"}}\n\n"

        info += f"3️⃣ Tópicos por Actuador Directo:\n"
        info += f"  • {tenant}/{gw}/{sector}/{sistema}/actuadores/pump-1\n"
        info += f"    Payload ON: {{\"estado\": 1}} | OFF: {{\"estado\": 0}}\n"
        info += f"  • {tenant}/{gw}/{sector}/{sistema}/actuadores/bomba_mezcla\n"
        info += f"    Payload ON: {{\"estado\": 1}} | OFF: {{\"estado\": 0}}\n\n"

        info += f"4️⃣ Tópico Estado de Proceso (proceso/mezclado):\n"
        info += f"  Tópico: {tenant}/{gw}/{sector}/{sistema}/proceso/mezclado\n"
        info += f"  Payload: {{\"estado\": 3, \"estado_nombre\": \"Pausado\", \"estado_texto\": \"PAUSADO\", \"error\": 0, \"timestamp\": 1789683456.86567}}\n\n"
        
        self.info_conexion.insert("end", info)

    def mostrar_topicos_dialog(self):
        tenant = self.tenant_var.get() or "rafaela_sa"
        gw = self.gateway_mac_var.get() or "d83add60dbb0"
        sector = self.sector_var.get() or "A1"
        sistema = self.sistema_var.get() or "linea_mezclado_1"
        
        text_info = f"""==================================================
TÓPICOS Y PARÁMETROS MQTT SOPORTADOS - SIMULADOR SCADA
==================================================
Gateway ID / MAC Activo: {gw}
Tenant / Empresa: {tenant}
Sección / Sector: {sector}
Sistema: {sistema}

--------------------------------------------------
1. TELEMETRÍA ENVIADA (SLIDERS Y LUCES LED EN VIVO)
--------------------------------------------------
Estructura: {{tenant}}/{{gateway_id}}/{{seccion}}/{{sistema}}/{{tipo}}/{{nombre}}

🎛️ SLIDERS DE SENSORES:
• Slider Nivel Bombo 1: {tenant}/{gw}/{sector}/{sistema}/sensores/bombo1
  Payload: {{"porcentaje": {self.val_bombo1.get():.1f}, "valor": {self.val_bombo1.get():.1f}, "unidad": "%"}}

• Slider Nivel Bombo 2: {tenant}/{gw}/{sector}/{sistema}/sensores/bombo2
  Payload: {{"porcentaje": {self.val_bombo2.get():.1f}, "valor": {self.val_bombo2.get():.1f}, "unidad": "%"}}

• Slider Nivel Mezcla:  {tenant}/{gw}/{sector}/{sistema}/sensores/mezcla
  Payload: {{"porcentaje": {self.val_mezcla.get():.1f}, "valor": {self.val_mezcla.get():.1f}, "unidad": "%"}}

• Slider Caudal 1:     {tenant}/{gw}/{sector}/{sistema}/sensores/caudal
  Payload: {{"caudal_1": {self.val_caudal_a.get():.1f}, "caudal_2": {self.val_caudal_b.get():.1f}}}

• Slider Caudal 2:     {tenant}/{gw}/{sector}/{sistema}/sensores/caudal
  Payload: {{"caudal_1": {self.val_caudal_a.get():.1f}, "caudal_2": {self.val_caudal_b.get():.1f}}}

• Slider Temperatura:  {tenant}/{gw}/{sector}/{sistema}/sensores/temperatura
  Payload: {{"valor": {self.val_temp.get():.1f}, "unidad": "°C"}}

• Slider Presión:      {tenant}/{gw}/{sector}/{sistema}/sensores/presion
  Payload: {{"valor": {self.val_presion.get():.2f}, "unidad": "Bar"}}

💡 ESTADO DE LUCES Y ACTUADORES:
• Bomba P1 (pump-1):           {tenant}/{gw}/{sector}/{sistema}/actuadores/pump-1 -> {{"estado": {1 if self.actuadores_estado["pump-1"] else 0}}}
• Bomba P2 (pump-2):           {tenant}/{gw}/{sector}/{sistema}/actuadores/pump-2 -> {{"estado": {1 if self.actuadores_estado["pump-2"] else 0}}}
• Bomba de Mezcla:             {tenant}/{gw}/{sector}/{sistema}/actuadores/bomba_mezcla -> {{"estado": {1 if self.actuadores_estado["bomba_mezcla"] else 0}}}
• Mezclador M1 (mixer-1):      {tenant}/{gw}/{sector}/{sistema}/actuadores/mixer-1 -> {{"estado": {1 if self.actuadores_estado["mixer-1"] else 0}}}
• Bomba Reposición:            {tenant}/{gw}/{sector}/{sistema}/actuadores/bomba_reposicion -> {{"estado": {1 if self.actuadores_estado["bomba_reposicion"] else 0}}}
• Electroválvula 1:            {tenant}/{gw}/{sector}/{sistema}/actuadores/electrovalvula-1 -> {{"estado": {1 if self.actuadores_estado["electrovalvula-1"] else 0}}}
• Electroválvula 2:            {tenant}/{gw}/{sector}/{sistema}/actuadores/electrovalvula-2 -> {{"estado": {1 if self.actuadores_estado["electrovalvula-2"] else 0}}}

--------------------------------------------------
2. TÓPICOS DE RECEPCIÓN (ACCIONES DESDE LA WEB)
--------------------------------------------------
Estructura: {{tenant}}/{{gateway_id}}/{{seccion}}/{{sistema}}/{{accion}}

✓ Encender Componente (Acción 'encender'):
  Tópico:  {tenant}/{gw}/{sector}/{sistema}/encender
  Payload: {{"componente": "bomba_mezcla"}}
  (Componentes: pump-1, pump-2, bomba_mezcla, mixer-1, bomba_reposicion, electrovalvula-1, electrovalvula-2)

✓ Apagar Componente (Acción 'apagar'):
  Tópico:  {tenant}/{gw}/{sector}/{sistema}/apagar
  Payload: {{"componente": "bomba_mezcla"}}

✓ Tópico Directo por Componente:
  Tópico:  {tenant}/{gw}/{sector}/{sistema}/actuadores/pump-1
  Payload Encender 🟢: {{"estado": 1}} o {{"comando": "ON"}}
  Payload Apagar 🔴:   {{"estado": 0}} o {{"comando": "OFF"}}

✓ Estado de Proceso (Tópico 'proceso/mezclado'):
  Tópico:  {tenant}/{gw}/{sector}/{sistema}/proceso/mezclado
  Payload: {{"estado": 3, "estado_nombre": "Pausado", "estado_texto": "PAUSADO", "error": 0, "timestamp": 1789683456.86567}}
=================================================="""

        win = tk.Toplevel(self.root)
        win.title("Tópicos MQTT Soportados")
        win.geometry("720x600")
        win.minsize(640, 480)
        
        lbl = ttk.Label(win, text="📡 Esquema Estructurado de Tópicos MQTT Soportados", font=("Segoe UI", 11, "bold"))
        lbl.pack(pady=10)
        
        txt = scrolledtext.ScrolledText(win, font=("Consolas", 9), wrap="word")
        txt.pack(fill="both", expand=True, padx=10, pady=5)
        txt.insert("1.0", text_info)
        # Deshabilitar edición manteniendo la barra de scroll y eventos mouse/teclado interactivos
        txt.bind("<Key>", lambda e: "break")
        
        btn_close = ttk.Button(win, text="Cerrar", command=win.destroy)
        btn_close.pack(pady=10)

    def build_tab_telemetria(self):
        # Crear contenedor scrollable para garantizar visibilidad total de sliders y checkbuttons
        canvas = tk.Canvas(self.tab_telemetria, borderwidth=0, highlightthickness=0)
        scrollbar = ttk.Scrollbar(self.tab_telemetria, orient="vertical", command=canvas.yview)
        scroll_content = ttk.Frame(canvas, padding=10)

        scroll_content.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        canvas_window = canvas.create_window((0, 0), window=scroll_content, anchor="nw")
        
        def _on_canvas_configure(event):
            canvas.itemconfig(canvas_window, width=event.width)
        canvas.bind("<Configure>", _on_canvas_configure)

        canvas.configure(yscrollcommand=scrollbar.set)
        
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        canvas.bind_all("<MouseWheel>", _on_mousewheel)

        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        # Selector de Modo
        mode_frame = ttk.LabelFrame(scroll_content, text="Modo de Generación de Telemetría", padding=10)
        mode_frame.pack(fill="x", pady=5)
        
        ttk.Radiobutton(mode_frame, text="🎛️ Control Manual por Sliders en Vivo", variable=self.modo_telemetria, value="manual").pack(side="left", padx=15)
        ttk.Radiobutton(mode_frame, text="🎲 Modo Sintético Aleatorio (Random)", variable=self.modo_telemetria, value="random").pack(side="left", padx=15)
        
        # Sliders Frame - Disposición Compacta en 2 Columnas
        sliders_frame = ttk.LabelFrame(scroll_content, text="Ajuste Manual de Variables y Sensores (7 Sliders)", padding=15)
        sliders_frame.pack(fill="x", pady=5)
        
        # --- COLUMNA 0 (Izquierda): Temperatura, Presión, Nivel Bombo 1, Nivel Bombo 2 ---
        # 1. Temperatura
        ttk.Label(sliders_frame, text="Temperatura (°C):").grid(row=0, column=0, sticky="w", pady=4)
        s_temp = ttk.Scale(sliders_frame, from_=0.0, to=100.0, variable=self.val_temp, orient="horizontal", length=180)
        s_temp.grid(row=0, column=1, padx=5)
        lbl_v_temp = ttk.Label(sliders_frame, text="", font=("Consolas", 9, "bold"))
        lbl_v_temp.grid(row=0, column=2, sticky="w", padx=(0, 15))
        self.val_temp.trace_add("write", lambda *args: lbl_v_temp.config(text=f"{self.val_temp.get():.1f} °C"))
        lbl_v_temp.config(text=f"{self.val_temp.get():.1f} °C")

        # 2. Presión
        ttk.Label(sliders_frame, text="Presión (Bar):").grid(row=1, column=0, sticky="w", pady=4)
        s_pres = ttk.Scale(sliders_frame, from_=0.0, to=10.0, variable=self.val_presion, orient="horizontal", length=180)
        s_pres.grid(row=1, column=1, padx=5)
        lbl_v_pres = ttk.Label(sliders_frame, text="", font=("Consolas", 9, "bold"))
        lbl_v_pres.grid(row=1, column=2, sticky="w", padx=(0, 15))
        self.val_presion.trace_add("write", lambda *args: lbl_v_pres.config(text=f"{self.val_presion.get():.2f} Bar"))
        lbl_v_pres.config(text=f"{self.val_presion.get():.2f} Bar")

        # 3. Nivel Bombo 1
        ttk.Label(sliders_frame, text="Nivel Bombo 1 (%):").grid(row=2, column=0, sticky="w", pady=4)
        s_b1 = ttk.Scale(sliders_frame, from_=0.0, to=100.0, variable=self.val_bombo1, orient="horizontal", length=180)
        s_b1.grid(row=2, column=1, padx=5)
        lbl_v_b1 = ttk.Label(sliders_frame, text="", font=("Consolas", 9, "bold"))
        lbl_v_b1.grid(row=2, column=2, sticky="w", padx=(0, 15))
        self.val_bombo1.trace_add("write", lambda *args: lbl_v_b1.config(text=f"{self.val_bombo1.get():.1f} %"))
        lbl_v_b1.config(text=f"{self.val_bombo1.get():.1f} %")

        # 4. Nivel Bombo 2
        ttk.Label(sliders_frame, text="Nivel Bombo 2 (%):").grid(row=3, column=0, sticky="w", pady=4)
        s_b2 = ttk.Scale(sliders_frame, from_=0.0, to=100.0, variable=self.val_bombo2, orient="horizontal", length=180)
        s_b2.grid(row=3, column=1, padx=5)
        lbl_v_b2 = ttk.Label(sliders_frame, text="", font=("Consolas", 9, "bold"))
        lbl_v_b2.grid(row=3, column=2, sticky="w", padx=(0, 15))
        self.val_bombo2.trace_add("write", lambda *args: lbl_v_b2.config(text=f"{self.val_bombo2.get():.1f} %"))
        lbl_v_b2.config(text=f"{self.val_bombo2.get():.1f} %")

        # --- COLUMNA 1 (Derecha): Nivel Mezcla, Caudal 1, Caudal 2 ---
        # 5. Nivel Tanque Mezcla
        ttk.Label(sliders_frame, text="Nivel Mezcla (%):").grid(row=0, column=3, sticky="w", pady=4, padx=(15, 0))
        s_mz = ttk.Scale(sliders_frame, from_=0.0, to=100.0, variable=self.val_mezcla, orient="horizontal", length=180)
        s_mz.grid(row=0, column=4, padx=5)
        lbl_v_mz = ttk.Label(sliders_frame, text="", font=("Consolas", 9, "bold"))
        lbl_v_mz.grid(row=0, column=5, sticky="w")
        self.val_mezcla.trace_add("write", lambda *args: lbl_v_mz.config(text=f"{self.val_mezcla.get():.1f} %"))
        lbl_v_mz.config(text=f"{self.val_mezcla.get():.1f} %")

        # 6. Caudal 1
        ttk.Label(sliders_frame, text="Caudal 1 (L/min):").grid(row=1, column=3, sticky="w", pady=4, padx=(15, 0))
        s_c1 = ttk.Scale(sliders_frame, from_=0.0, to=50.0, variable=self.val_caudal_a, orient="horizontal", length=180)
        s_c1.grid(row=1, column=4, padx=5)
        lbl_v_c1 = ttk.Label(sliders_frame, text="", font=("Consolas", 9, "bold"))
        lbl_v_c1.grid(row=1, column=5, sticky="w")
        self.val_caudal_a.trace_add("write", lambda *args: lbl_v_c1.config(text=f"{self.val_caudal_a.get():.1f} L/m"))
        lbl_v_c1.config(text=f"{self.val_caudal_a.get():.1f} L/m")

        # 7. Caudal 2
        ttk.Label(sliders_frame, text="Caudal 2 (L/min):").grid(row=2, column=3, sticky="w", pady=4, padx=(15, 0))
        s_c2 = ttk.Scale(sliders_frame, from_=0.0, to=50.0, variable=self.val_caudal_b, orient="horizontal", length=180)
        s_c2.grid(row=2, column=4, padx=5)
        lbl_v_c2 = ttk.Label(sliders_frame, text="", font=("Consolas", 9, "bold"))
        lbl_v_c2.grid(row=2, column=5, sticky="w")
        self.val_caudal_b.trace_add("write", lambda *args: lbl_v_c2.config(text=f"{self.val_caudal_b.get():.1f} L/m"))
        lbl_v_c2.config(text=f"{self.val_caudal_b.get():.1f} L/m")

        # Frame de Selección Dinámica de Componentes Habilitados
        comp_frame = ttk.LabelFrame(scroll_content, text="⚙️ Componentes Activos en Telemetría (7 Sensores & 7 Actuadores)", padding=10)
        comp_frame.pack(fill="x", pady=5)

        sub_btn_frame = ttk.Frame(comp_frame)
        sub_btn_frame.pack(fill="x", pady=2)
        ttk.Button(sub_btn_frame, text="✅ Habilitar Todos", command=lambda: self.set_all_componentes(True)).pack(side="left", padx=5)
        ttk.Button(sub_btn_frame, text="❌ Deshabilitar Todos", command=lambda: self.set_all_componentes(False)).pack(side="left", padx=5)

        chks_grid = ttk.Frame(comp_frame)
        chks_grid.pack(fill="x", pady=5)

        sensores_list = [
            ("nivel_bombo1", "Nivel Bombo 1 (%)"),
            ("nivel_bombo2", "Nivel Bombo 2 (%)"),
            ("nivel_mezcla", "Nivel Mezcla (%)"),
            ("caudal_1", "Caudal 1 (L/min)"),
            ("caudal_2", "Caudal 2 (L/min)"),
            ("temperatura", "Temperatura (°C)"),
            ("presion", "Presión (Bar)"),
        ]

        actuadores_list = [
            ("pump-1", "Bomba 1 (P1)"),
            ("pump-2", "Bomba 2 (P2)"),
            ("bomba_mezcla", "Bomba Mezcla"),
            ("mixer-1", "Mezclador M1"),
            ("bomba_reposicion", "Bomba Reposición"),
            ("electrovalvula-1", "Válvula 1"),
            ("electrovalvula-2", "Válvula 2"),
        ]

        # Sensores columna 0
        ttk.Label(chks_grid, text="SENSORES (7):", font=("Segoe UI", 9, "bold")).grid(row=0, column=0, sticky="w", padx=5, pady=2)
        for idx, (k, label) in enumerate(sensores_list, start=1):
            ttk.Checkbutton(chks_grid, text=label, variable=self.componentes_habilitados[k]).grid(row=idx, column=0, sticky="w", padx=5)

        # Actuadores columna 1
        ttk.Label(chks_grid, text="ACTUADORES / LUCES (7):", font=("Segoe UI", 9, "bold")).grid(row=0, column=1, sticky="w", padx=25, pady=2)
        for idx, (k, label) in enumerate(actuadores_list, start=1):
            ttk.Checkbutton(chks_grid, text=label, variable=self.componentes_habilitados[k]).grid(row=idx, column=1, sticky="w", padx=25)

        # Botón de disparo manual
        btn_pub = tk.Button(
            scroll_content, text="⚡ Publicar Lecturas Ahora", bg="#2563eb", fg="white", font=("Segoe UI", 9, "bold"),
            command=self.publicar_manual_ahora, padx=12, pady=4
        )
        btn_pub.pack(anchor="e", pady=5)

    def build_tab_actuadores(self):
        # Panel de Luces LED y Selector Manual de Actuadores
        led_frame = ttk.LabelFrame(self.tab_actuadores, text="Luces Indicadoras LED & Control Manual de Actuadores/Motores", padding=15)
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
            item_f.grid(row=row, column=col, sticky="w", padx=8, pady=4)
            
            canvas = tk.Canvas(item_f, width=24, height=24, bg=self.root.cget("bg"), highlightthickness=0)
            canvas.pack(side="left", padx=4)
            circle = canvas.create_oval(3, 3, 21, 21, fill="#6b7280", outline="#374151") # Gris por defecto (inactivo)
            
            lbl = ttk.Label(item_f, text=nombre, font=("Segoe UI", 9, "bold"))
            lbl.pack(side="left", padx=4)
            
            # Botones de Encender / Apagar manual
            btn_on = tk.Button(
                item_f, text="ON", bg="#16a34a", fg="white", font=("Segoe UI", 8, "bold"), padx=5, pady=1,
                command=lambda d=dev_id: self.toggle_actuador_manual(d, True)
            )
            btn_on.pack(side="left", padx=2)

            btn_off = tk.Button(
                item_f, text="OFF", bg="#dc2626", fg="white", font=("Segoe UI", 8, "bold"), padx=5, pady=1,
                command=lambda d=dev_id: self.toggle_actuador_manual(d, False)
            )
            btn_off.pack(side="left", padx=2)

            self.led_canvas_map[dev_id] = canvas
            self.led_circle_map[dev_id] = circle
            
            col += 1
            if col > 1:
                col = 0
                row += 1

        # Consola de Registros de Comandos Recibidos
        log_frame = ttk.LabelFrame(self.tab_actuadores, text="Consola de Comandos Recibidos desde el Frontend SCADA", padding=10)
        log_frame.pack(fill="both", expand=True, pady=10)
        
        self.txt_log = scrolledtext.ScrolledText(log_frame, height=10, font=("Consolas", 9), bg="#1e1e1e", fg="#4ade80")
        self.txt_log.pack(fill="both", expand=True)
        self.log_msg("Esperando conexión con el Broker MQTT...")

    def toggle_actuador_manual(self, dev_id: str, new_state: bool):
        self.actuadores_estado[dev_id] = new_state
        self.update_led(dev_id, new_state)
        # Habilitar transmisión para este actuador si el usuario interactúa manualmente
        if dev_id in self.componentes_habilitados:
            self.componentes_habilitados[dev_id].set(True)
        
        if self.is_connected and self.client:
            tenant = self.tenant_var.get().strip() or "rafaela_sa"
            mac = self.gateway_mac_var.get().strip() or "d83add60dbb0"
            sector = self.sector_var.get().strip() or "A1"
            sistema = self.sistema_var.get().strip() or "linea_mezclado_1"
            base = f"{tenant}/{mac}/{sector}/{sistema}"
            est_val = 1 if new_state else 0
            ts = time.time()
            self.client.publish(f"{base}/actuadores/{dev_id}", json.dumps({"estado": est_val, "timestamp": ts}))
            self.log_msg(f"⚡ Control manual: {dev_id} -> {'ON 🟢' if new_state else 'OFF 🔴'}")

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
        if getattr(self, '_connecting', False):
            return
        self._connecting = True
        self.lbl_status_badge.config(text="🟡 CONECTANDO...", bg="#d97706")
        self.btn_connect.config(state="disabled")

        def _do_connect():
            try:
                host = self.host_var.get().strip()
                port = int(self.port_var.get())
                user = self.user_var.get().strip()
                passwd = self.pass_var.get().strip()
                mac = self.gateway_mac_var.get().strip() or "d83add60dbb0"
                
                if self.client:
                    try:
                        self.client.loop_stop()
                        self.client.disconnect()
                    except Exception:
                        pass
                    self.client = None

                self.client = mqtt.Client(client_id=f"sim_gui_{mac}_{random.randint(100,999)}")
                if user:
                    self.client.username_pw_set(user, passwd)
                    
                self.client.on_connect = self.on_mqtt_connect
                self.client.on_message = self.on_mqtt_message
                self.client.on_disconnect = self.on_mqtt_disconnect
                
                self.client.connect(host, port, keepalive=60)
                self.client.loop_start()
                self.root.after(0, lambda: self.log_msg(f"Conectando a {host}:{port} con Gateway ID: {mac}..."))
            except Exception as e:
                err_msg = str(e)
                self.root.after(0, lambda: self._on_connect_error(err_msg))
            finally:
                self._connecting = False

        threading.Thread(target=_do_connect, daemon=True).start()

    def _on_connect_error(self, err_msg: str):
        self.lbl_status_badge.config(text="🔴 ERROR CONEXIÓN", bg="#dc2626")
        self.btn_connect.config(text="▶ Conectar al Broker MQTT", bg="#16a34a", state="normal")
        messagebox.showerror("Error de Conexión", f"No se pudo conectar al Broker MQTT:\n{err_msg}")

    def disconnect_mqtt(self):
        if not self.is_connected and not getattr(self, '_disconnecting', False):
            return
            
        self._disconnecting = True
        self.is_connected = False
        
        self.lbl_status_badge.config(text="🟡 DESCONECTANDO...", bg="#d97706")
        self.btn_connect.config(text="... Desconectando", state="disabled")

        def _do_disconnect():
            try:
                if self.client:
                    tenant = self.tenant_var.get().strip() or "rafaela_sa"
                    mac = self.gateway_mac_var.get().strip() or "d83add60dbb0"
                    # Publicar estado offline explícito antes del DISCONNECT
                    try:
                        self.client.publish(f"{tenant}/{mac}/status", "offline", retain=True, qos=0)
                        self.client.publish(f"{tenant}/{mac}/estado/general", json.dumps({"estado": "OFFLINE", "online": False}), retain=True, qos=0)
                    except Exception:
                        pass
                    
                    time.sleep(0.05)
                    try:
                        self.client.disconnect()
                        self.client.loop_stop()
                    except Exception:
                        pass
                    self.client = None
            finally:
                self._disconnecting = False
                self.root.after(0, self._ui_set_disconnected)

        threading.Thread(target=_do_disconnect, daemon=True).start()

    def _ui_set_disconnected(self):
        self.lbl_status_badge.config(text="🔴 DESCONECTADO", bg="#dc2626")
        self.btn_connect.config(text="▶ Conectar al Broker MQTT", bg="#16a34a", state="normal")
        self.log_msg("Desconectado del Broker MQTT.")

    def on_mqtt_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.is_connected = True
            tenant = self.tenant_var.get().strip() or "rafaela_sa"
            mac = self.gateway_mac_var.get().strip() or "d83add60dbb0"
            
            # Suscribirse a tópicos de acción
            client.subscribe("#") # Suscripción global para monitorear todas las órdenes del front
            
            self.root.after(0, lambda: self.lbl_status_badge.config(text="🟢 CONECTADO ONLINE", bg="#16a34a"))
            self.root.after(0, lambda: self.btn_connect.config(text="⏹ Desconectar Broker", bg="#dc2626", state="normal"))
            self.root.after(0, lambda: self.log_msg(f"Conectado exitosamente. Suscrito a acciones de {tenant}/{mac}."))
        else:
            self.root.after(0, lambda: self.lbl_status_badge.config(text="🔴 RECHAZADO", bg="#dc2626"))
            self.root.after(0, lambda: self.btn_connect.config(text="▶ Conectar al Broker MQTT", bg="#16a34a", state="normal"))

    def on_mqtt_disconnect(self, client, userdata, rc):
        if not getattr(self, '_disconnecting', False):
            self.is_connected = False
            self.root.after(0, self._ui_set_disconnected)

    def on_mqtt_message(self, client, userdata, msg):
        topic = msg.topic
        payload_raw = msg.payload.decode('utf-8', errors='ignore').strip()
        
        # Ignorar telemetría de sensores enviada desde el propio simulador
        if "/sensores/" in topic or "/nivel/" in topic or "/caudal/" in topic or topic.endswith("/status"):
            return
            
        self.root.after(0, lambda: self.log_msg(f"📩 [{topic}] -> {payload_raw}"))

        # Deserializar JSON
        data = {}
        try:
            data = json.loads(payload_raw)
        except Exception:
            pass

        # 1. Extraer nombre de componente desde el payload JSON o tópico
        comp_name = None
        if isinstance(data, dict):
            comp_name = data.get("componente") or data.get("dispositivo") or data.get("actuador") or data.get("nombre")

        topic_parts = topic.split('/')
        last_topic_part = topic_parts[-1].lower() if topic_parts else ""
        prev_topic_part = topic_parts[-2].lower() if len(topic_parts) >= 2 else ""

        # Verificar si la acción viene en la URL ({tenant}/{gateway}/{seccion}/{sistema}/{accion})
        accion_topico = None
        if last_topic_part in ("encender", "on", "iniciar", "abrir"):
            accion_topico = True
        elif last_topic_part in ("apagar", "off", "detener", "cerrar"):
            accion_topico = False

        # Si el tópico es {base}/actuadores/{dev_id}
        if not comp_name and prev_topic_part == "actuadores":
            comp_name = last_topic_part

        # Si el tópico es {base}/{dev_id}
        if not comp_name:
            for dev_id in self.actuadores_estado.keys():
                if dev_id.lower() == last_topic_part or dev_id.lower().replace('-', '_') == last_topic_part.replace('-', '_'):
                    comp_name = dev_id
                    break

        # Resolver alias a la clave de actuador
        target_dev = None
        if comp_name:
            c_low = str(comp_name).lower().replace('_', '-')
            alias_map = {
                "bomba1": "pump-1",
                "bomba-1": "pump-1",
                "pump1": "pump-1",
                "pump-1": "pump-1",
                "bomba2": "pump-2",
                "bomba-2": "pump-2",
                "pump2": "pump-2",
                "pump-2": "pump-2",
                "bomba-mezcla": "bomba_mezcla",
                "bomba_mezcla": "bomba_mezcla",
                "mezclador": "mixer-1",
                "mixer1": "mixer-1",
                "mixer-1": "mixer-1",
                "bomba-reposicion": "bomba_reposicion",
                "bomba_reposicion": "bomba_reposicion",
                "electrovalvula1": "electrovalvula-1",
                "electrovalvula-1": "electrovalvula-1",
                "valvula1": "electrovalvula-1",
                "valvula-1": "electrovalvula-1",
                "electrovalvula2": "electrovalvula-2",
                "electrovalvula-2": "electrovalvula-2",
                "valvula2": "electrovalvula-2",
                "valvula-2": "electrovalvula-2",
            }
            target_dev = alias_map.get(c_low, comp_name)

        # 2. Determinar nuevo estado (True / False)
        new_state = None
        if accion_topico is not None:
            new_state = accion_topico
        elif isinstance(data, dict):
            if "estado" in data:
                st = data["estado"]
                if isinstance(st, bool):
                    new_state = st
                elif isinstance(st, (int, float)):
                    new_state = (st == 1)
                elif isinstance(st, str):
                    new_state = st.upper() in ("1", "ON", "INICIAR", "ABRIR", "ENCENDER", "TRUE")
            elif "comando" in data:
                cmd = str(data["comando"]).upper()
                new_state = cmd in ("1", "ON", "INICIAR", "ABRIR", "ENCENDER", "TRUE")
            elif "accion" in data:
                acc = str(data["accion"]).upper()
                new_state = acc in ("1", "ON", "INICIAR", "ABRIR", "ENCENDER", "TRUE")
        else:
            p_up = payload_raw.upper()
            if p_up in ("1", "ON", "INICIAR", "ABRIR", "ENCENDER", "TRUE"):
                new_state = True
            elif p_up in ("0", "OFF", "DETENER", "CERRAR", "APAGAR", "FALSE"):
                new_state = False

        if target_dev in self.actuadores_estado and new_state is not None:
            self.actuadores_estado[target_dev] = new_state
            dev_to_upd = target_dev
            st_to_upd = new_state
            self.root.after(0, lambda: self.update_led(dev_to_upd, st_to_upd))

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
        sector = self.sector_var.get().strip() or "A1"
        sistema = self.sistema_var.get().strip() or "linea_mezclado_1"
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

        # Publicar tópicos estándar utilizando la estructura {tenant}/{gateway_id}/{seccion}/{sistema}/{tipo}/{nombre}
        base = f"{tenant}/{mac}/{sector}/{sistema}"
        ts = time.time()
        
        # 1. Niveles de Bombos y Tanque Mezcla
        if self.is_componente_enabled("nivel_bombo1"):
            self.client.publish(f"{base}/sensores/bombo1", json.dumps({"porcentaje": round(b1, 1), "valor": round(b1, 1), "value": round(b1, 1), "unidad": "%", "timestamp": ts}))
            
        if self.is_componente_enabled("nivel_bombo2"):
            self.client.publish(f"{base}/sensores/bombo2", json.dumps({"porcentaje": round(b2, 1), "valor": round(b2, 1), "value": round(b2, 1), "unidad": "%", "timestamp": ts}))
            
        if self.is_componente_enabled("nivel_mezcla"):
            self.client.publish(f"{base}/sensores/mezcla", json.dumps({"porcentaje": round(mz, 1), "valor": round(mz, 1), "value": round(mz, 1), "unidad": "%", "timestamp": ts}))
        
        # 2. Caudales
        if self.is_componente_enabled("caudal_1") or self.is_componente_enabled("caudal_2"):
            self.client.publish(f"{base}/sensores/caudal", json.dumps({"caudal_1": c_a, "caudal_2": c_b, "timestamp": ts}))
        
        # 3. Temperatura & Presión Generales
        if self.is_componente_enabled("temperatura"):
            self.client.publish(f"{base}/sensores/temperatura", json.dumps({"value": temp, "valor": temp, "unidad": "°C", "timestamp": ts}))
            
        if self.is_componente_enabled("presion"):
            self.client.publish(f"{base}/sensores/presion", json.dumps({"value": pres, "valor": pres, "unidad": "Bar", "timestamp": ts}))

        # 4. Estado de Actuadores (si están habilitados)
        actuador_keys = ["pump-1", "pump-2", "bomba_mezcla", "mixer-1", "bomba_reposicion", "electrovalvula-1", "electrovalvula-2"]
        for dev_id in actuador_keys:
            if self.is_componente_enabled(dev_id):
                est_val = 1 if self.actuadores_estado.get(dev_id, False) else 0
                self.client.publish(f"{base}/actuadores/{dev_id}", json.dumps({"estado": est_val, "timestamp": ts}))

        # 5. Estado LWT / Gateway Status
        self.client.publish(f"{tenant}/{mac}/status", "online", retain=True)
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
            try:
                self.root.after(0, self._refresh_tab_conexion)
            except Exception:
                pass
            time.sleep(self.intervalo_envio.get())

    def on_close(self):
        self.running = False
        self.disconnect_mqtt()
        self.root.destroy()


if __name__ == "__main__":
    app = SimuladorGUI()
    app.root.mainloop()
