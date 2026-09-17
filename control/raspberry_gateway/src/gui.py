"""
<<<<<<< HEAD
Interfaz gráfica mínima usando Tkinter para controlar el gateway en la Raspberry.

Requisitos cubiertos:
- Mostrar MAC/gateway id, uptime, mensajes procesados, comandos enviados, errores.
- Permitir pausar/reanudar procesamiento.
- Permitir modificar parámetros básicos (MQTT broker/port, serial port/baudrate) y persistir en config.yaml.
- Se lanza en el hilo principal (Tkinter) y actualiza el gateway en memoria.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import yaml
import uuid


class GatewayGUI:
    def __init__(self, gateway):
        self.gateway = gateway
        self.root = tk.Tk()
        self.root.title("SCADA Gateway Control")
        self._build()
        self._running = True
        self._last_data_has_content = False
        self._last_data_display_cache = None
        self._last_data_update_time = 0  # Para reducir frecuencia de actualizaciones
        self._update_loop()

    def _build(self):
        frm = ttk.Frame(self.root, padding=12)
        frm.grid()

        # Info
        ttk.Label(frm, text="Gateway ID / MAC:").grid(column=0, row=0, sticky='w')
        self.mac_var = tk.StringVar(value=self._get_mac())
        ttk.Label(frm, textvariable=self.mac_var).grid(column=1, row=0, sticky='w')

        ttk.Label(frm, text="Estado:").grid(column=0, row=1, sticky='w')
        self.state_var = tk.StringVar(value='Iniciando')
        ttk.Label(frm, textvariable=self.state_var).grid(column=1, row=1, sticky='w')

        ttk.Label(frm, text="Uptime (s):").grid(column=0, row=2, sticky='w')
        self.uptime_var = tk.StringVar(value='0')
        ttk.Label(frm, textvariable=self.uptime_var).grid(column=1, row=2, sticky='w')

        ttk.Label(frm, text="Mensajes procesados:").grid(column=0, row=3, sticky='w')
        self.msgs_var = tk.StringVar(value='0')
        ttk.Label(frm, textvariable=self.msgs_var).grid(column=1, row=3, sticky='w')

        # MQTT connection status
        ttk.Label(frm, text="MQTT:").grid(column=0, row=3, sticky='e')
        self.mqtt_status_var = tk.StringVar(value='Desconocido')
        self.mqtt_status_lbl = ttk.Label(frm, textvariable=self.mqtt_status_var, foreground='orange')
        self.mqtt_status_lbl.grid(column=1, row=3, sticky='w')

        ttk.Label(frm, text="Comandos enviados:").grid(column=0, row=4, sticky='w')
        self.cmds_var = tk.StringVar(value='0')
        ttk.Label(frm, textvariable=self.cmds_var).grid(column=1, row=4, sticky='w')

        ttk.Label(frm, text="Errores:").grid(column=0, row=5, sticky='w')
        self.err_var = tk.StringVar(value='0')
        ttk.Label(frm, textvariable=self.err_var).grid(column=1, row=5, sticky='w')

        # Controls
        btn_frame = ttk.Frame(frm)
        btn_frame.grid(column=0, row=6, columnspan=2, pady=(8,0))

        self.pause_btn = ttk.Button(btn_frame, text='Pausar', command=self._toggle_pause)
        self.pause_btn.grid(column=0, row=0, padx=4)

        self.reconnect_btn = ttk.Button(btn_frame, text='Reconectar MQTT', command=self._reconnect_mqtt)
        self.reconnect_btn.grid(column=3, row=0, padx=4)

        self.save_btn = ttk.Button(btn_frame, text='Guardar config', command=self._save_config)
        self.save_btn.grid(column=1, row=0, padx=4)

        self.quit_btn = ttk.Button(btn_frame, text='Salir', command=self._on_quit)
        self.quit_btn.grid(column=2, row=0, padx=4)

        # Config editable
        sep = ttk.Separator(frm, orient='horizontal')
        sep.grid(column=0, row=7, columnspan=2, sticky='ew', pady=(8,8))

        ttk.Label(frm, text='MQTT Broker:').grid(column=0, row=8, sticky='w')
        self.mqtt_broker = tk.StringVar(value=self.gateway.config.get('mqtt', {}).get('broker', ''))
        ttk.Entry(frm, textvariable=self.mqtt_broker, width=30).grid(column=1, row=8, sticky='w')

        ttk.Label(frm, text='MQTT Port:').grid(column=0, row=9, sticky='w')
        self.mqtt_port = tk.StringVar(value=str(self.gateway.config.get('mqtt', {}).get('port', 1883)))
        ttk.Entry(frm, textvariable=self.mqtt_port, width=10).grid(column=1, row=9, sticky='w')

        # MQTT Username / Password
        ttk.Label(frm, text='MQTT Username:').grid(column=0, row=12, sticky='w')
        self.mqtt_username = tk.StringVar(value=self.gateway.config.get('mqtt', {}).get('username', ''))
        ttk.Entry(frm, textvariable=self.mqtt_username, width=20).grid(column=1, row=12, sticky='w')

        ttk.Label(frm, text='MQTT Password:').grid(column=0, row=13, sticky='w')
        # Password field masked
        self.mqtt_password = tk.StringVar(value=self.gateway.config.get('mqtt', {}).get('password', ''))
        ttk.Entry(frm, textvariable=self.mqtt_password, width=20, show='*').grid(column=1, row=13, sticky='w')

        ttk.Label(frm, text='Serial Port:').grid(column=0, row=10, sticky='w')
        self.serial_port = tk.StringVar(value=self.gateway.config.get('serial', {}).get('port', ''))
        ttk.Entry(frm, textvariable=self.serial_port, width=20).grid(column=1, row=10, sticky='w')

        ttk.Label(frm, text='Baudrate:').grid(column=0, row=11, sticky='w')
        self.baudrate = tk.StringVar(value=str(self.gateway.config.get('serial', {}).get('baudrate', 115200)))
        ttk.Entry(frm, textvariable=self.baudrate, width=10).grid(column=1, row=11, sticky='w')

        # Buttons frame - topics and last data buttons side by side
        self.btn_frame_toggles = ttk.Frame(frm)
        self.btn_frame_toggles.grid(column=0, row=14, columnspan=2, pady=(8,0))

        # Button to toggle topics view
        self.topics_shown = False
        self.show_topics_btn = ttk.Button(self.btn_frame_toggles, text='Mostrar topics', command=self._toggle_topics)
        self.show_topics_btn.grid(column=0, row=0, padx=4)

        # Button to toggle last data view
        self.last_data_shown = False
        self.show_last_data_btn = ttk.Button(self.btn_frame_toggles, text='Mostrar últimos datos', command=self._toggle_last_data)
        self.show_last_data_btn.grid(column=1, row=0, padx=4)

        # Frame that will contain topics summary (hidden by default)
        self.topics_frame = ttk.Frame(frm, padding=6, relief='groove')
        # Use a Text widget to present topics (read-only)
        try:
            from tkinter.scrolledtext import ScrolledText
            self.topics_text = ScrolledText(self.topics_frame, width=60, height=12, wrap='word')
        except Exception:
            self.topics_text = tk.Text(self.topics_frame, width=60, height=12, wrap='word')
        self.topics_text.configure(state='disabled')
        self.topics_text.grid(column=0, row=0)

        # Frame that will contain last data summary (hidden by default)
        self.last_data_frame = ttk.Frame(frm, padding=6, relief='groove')
        # Use a Text widget to present last data (read-only)
        try:
            from tkinter.scrolledtext import ScrolledText
            self.last_data_text = ScrolledText(self.last_data_frame, width=60, height=12, wrap='word')
        except Exception:
            self.last_data_text = tk.Text(self.last_data_frame, width=60, height=12, wrap='word')
        self.last_data_text.configure(state='disabled')
        self.last_data_text.grid(column=0, row=0)

    def _toggle_topics(self):
        if self.topics_shown:
            self.topics_frame.grid_forget()
            self.show_topics_btn.config(text='Mostrar topics')
            self.topics_shown = False
            return

        # llenar contenido desde config; el usuario pondrá la fábrica en 'tenant'
        mqtt_cfg = self.gateway.config.get('mqtt', {})
        tenant = mqtt_cfg.get('tenant', '')
        topics = mqtt_cfg.get('topics', {})
        publish = topics.get('publish', {})
        subscribe = topics.get('subscribe', {})
        subscribe_filters = topics.get('subscribe_filters', [])

        content_lines = []
        content_lines.append(f"Publish (desde gateway) — fábrica: {tenant}")
        if publish:
            for k, v in publish.items():
                content_lines.append(f"- {k}: {v}")
        else:
            content_lines.append('  (ninguno configurado)')

        content_lines.append('')
        content_lines.append('Subscribe (a los que escucha el gateway):')
        if subscribe:
            for k, v in subscribe.items():
                content_lines.append(f"- {k}: {v}")
        else:
            content_lines.append('  (ninguno configurado)')

        if subscribe_filters:
            content_lines.append('')
            content_lines.append('Subscribe filters (plantillas):')
            for f in subscribe_filters:
                content_lines.append(f"- {f}")

        # mostrar
        self.topics_text.configure(state='normal')
        self.topics_text.delete('1.0', tk.END)
        self.topics_text.insert(tk.END, '\n'.join(content_lines))
        self.topics_text.configure(state='disabled')

        self.topics_frame.grid(column=0, row=15, columnspan=2, pady=(8,0))
        self.show_topics_btn.config(text='Ocultar topics')
        self.topics_shown = True

    def _toggle_last_data(self):
        if self.last_data_shown:
            self.last_data_frame.grid_forget()
            self.show_last_data_btn.config(text='Mostrar últimos datos')
            self.last_data_shown = False
            self._last_data_has_content = False
            return

        # Show the frame initially
        self.last_data_frame.grid(column=0, row=15, columnspan=2, pady=(8,0))
        self.show_last_data_btn.config(text='Ocultar últimos datos')
        self.last_data_shown = True
        self._last_data_has_content = False
        self._update_last_data_display()

    def _update_last_data_display(self):
        """Actualiza el contenido de últimos datos sin mostrar 'Sin datos aún' si ya hay datos"""
        if not self.last_data_shown:
            return

        try:
            last_data = self.gateway.get_last_data()
        except Exception as e:
            last_data = {}
            print(f"Error obteniendo últimos datos: {e}")

        content_lines = []
        has_any_data = False
        
        # Datos enviados a Arduino
        content_lines.append('=== DATOS ENVIADOS AL ARDUINO ===')
        if last_data.get('arduino_sent'):
            has_any_data = True
            cmd_info = last_data['arduino_sent']
            content_lines.append(f"Comando: {cmd_info.get('command', 'N/A')}")
            if cmd_info.get('timestamp'):
                import datetime
                ts = datetime.datetime.fromtimestamp(cmd_info['timestamp']).strftime('%Y-%m-%d %H:%M:%S')
                content_lines.append(f"Hora: {ts}")
        elif not self._last_data_has_content:
            content_lines.append('(Sin datos aún)')

        # Datos recibidos de Arduino
        content_lines.append('')
        content_lines.append('=== DATOS RECIBIDOS DEL ARDUINO ===')
        if last_data.get('arduino_received'):
            has_any_data = True
            recv_data = last_data['arduino_received']
            if recv_data.get('timestamp'):
                import datetime
                ts = datetime.datetime.fromtimestamp(recv_data['timestamp']).strftime('%Y-%m-%d %H:%M:%S')
                content_lines.append(f"Hora: {ts}")
            # Mostrar los primeros campos importantes
            if recv_data.get('raw'):
                content_lines.append(f"Raw: {recv_data['raw'][:80]}")
            # Mostrar otros campos disponibles (excluyendo timestamp y raw)
            for key, value in recv_data.items():
                if key not in ['timestamp', 'raw'] and value is not None:
                    if isinstance(value, float):
                        content_lines.append(f"{key}: {value:.2f}")
                    else:
                        content_lines.append(f"{key}: {value}")
        elif not self._last_data_has_content:
            content_lines.append('(Sin datos aún)')

        # Datos publicados en MQTT
        content_lines.append('')
        content_lines.append('=== DATOS PUBLICADOS EN MQTT ===')
        if last_data.get('mqtt_published'):
            has_any_data = True
            pub_info = last_data['mqtt_published']
            content_lines.append(f"Topic: {pub_info.get('topic', 'N/A')}")
            content_lines.append(f"Payload: {pub_info.get('payload', 'N/A')[:100]}")
            if pub_info.get('timestamp'):
                import datetime
                ts = datetime.datetime.fromtimestamp(pub_info['timestamp']).strftime('%Y-%m-%d %H:%M:%S')
                content_lines.append(f"Hora: {ts}")
            content_lines.append(f"Retain: {pub_info.get('retain', False)}")
        elif not self._last_data_has_content:
            content_lines.append('(Sin datos aún)')

        # Datos recibidos de MQTT
        content_lines.append('')
        content_lines.append('=== DATOS RECIBIDOS DE MQTT ===')
        if last_data.get('mqtt_received'):
            has_any_data = True
            recv_mqtt = last_data['mqtt_received']
            content_lines.append(f"Topic: {recv_mqtt.get('topic', 'N/A')}")
            content_lines.append(f"Payload: {recv_mqtt.get('payload', 'N/A')[:100]}")
            if recv_mqtt.get('timestamp'):
                import datetime
                ts = datetime.datetime.fromtimestamp(recv_mqtt['timestamp']).strftime('%Y-%m-%d %H:%M:%S')
                content_lines.append(f"Hora: {ts}")
        elif not self._last_data_has_content:
            content_lines.append('(Sin datos aún)')

        # Convertir a texto
        new_content = '\n'.join(content_lines)
        
        # Solo actualizar si el contenido cambió
        if new_content != self._last_data_display_cache:
            self.last_data_text.configure(state='normal')
            self.last_data_text.delete('1.0', tk.END)
            self.last_data_text.insert(tk.END, new_content)
            self.last_data_text.configure(state='disabled')
            self._last_data_display_cache = new_content

        # Marcar que ya tenemos contenido
        if has_any_data:
            self._last_data_has_content = True

    def _get_mac(self):
        try:
            if self.gateway.mqtt:
                return self.gateway.mqtt.gateway_id
            # fallback: use uuid
            mac_int = uuid.getnode()
            return f"{mac_int:012x}"
        except Exception:
            return 'unknown'

    def _toggle_pause(self):
        self.gateway.processing_paused = not getattr(self.gateway, 'processing_paused', False)
        if self.gateway.processing_paused:
            self.pause_btn.config(text='Reanudar')
            try:
                if self.gateway.arduino:
                    self.gateway.arduino.send_command('frenar')
            except Exception:
                pass
        else:
            self.pause_btn.config(text='Pausar')
            try:
                if self.gateway.arduino:
                    self.gateway.arduino.send_command('continuar')
            except Exception:
                pass

    def _save_config(self):
        # Aplicar campos mínimos
        try:
            # Validate port
            broker = self.mqtt_broker.get().strip()
            port = int(self.mqtt_port.get())
            s_port = self.serial_port.get().strip()
            baud = int(self.baudrate.get())

            conf = self.gateway.config
            conf.setdefault('mqtt', {})['broker'] = broker
            conf['mqtt']['port'] = port
            # username / password
            username = self.mqtt_username.get().strip()
            password = self.mqtt_password.get()
            conf['mqtt']['username'] = username
            conf['mqtt']['password'] = password
            conf.setdefault('serial', {})['port'] = s_port
            conf['serial']['baudrate'] = baud

            with open(self.gateway.config_path, 'w') as f:
                yaml.safe_dump(conf, f)

            # Aplicar en ejecución
            try:
                self.gateway.config = conf
                if self.gateway.mqtt:
                    self.gateway.mqtt.broker = broker
                    self.gateway.mqtt.port = port
                    # apply username/password if present
                    try:
                        self.gateway.mqtt.username = self.mqtt_username.get().strip() or None
                        self.gateway.mqtt.password = self.mqtt_password.get() or None
                    except Exception:
                        pass
                    # reconnect to apply new credentials
                    if self.gateway.mqtt.connected:
                        try:
                            self.gateway.mqtt.disconnect()
                        except Exception:
                            pass
                        # small delay then reconnect
                        try:
                            self.gateway.mqtt.connect()
                        except Exception:
                            pass
                if self.gateway.arduino:
                    self.gateway.arduino.port = s_port
                    self.gateway.arduino.baudrate = baud
                    # restart serial connection
                    self.gateway.arduino.stop()
                    self.gateway.arduino.connect()
            except Exception:
                pass

            messagebox.showinfo('Configuración', 'Configuración guardada y aplicada')
        except Exception as e:
            messagebox.showerror('Error', f'Error guardando configuración: {e}')

    def _reconnect_mqtt(self):
        try:
            if self.gateway.mqtt:
                # intentar desconectar y reconectar
                try:
                    self.gateway.mqtt.disconnect()
                except Exception:
                    pass
                ok = self.gateway.mqtt.connect()
                if ok:
                    messagebox.showinfo('MQTT', 'Reconectado con éxito')
                else:
                    rc = getattr(self.gateway.mqtt, 'last_conn_rc', None)
                    if rc == 4:
                        messagebox.showerror('MQTT', 'Fallo de autenticación: usuario/contraseña incorrectos')
                    else:
                        messagebox.showerror('MQTT', 'No se pudo reconectar al broker MQTT')
        except Exception as e:
            messagebox.showerror('MQTT', f'Error reconectando: {e}')

    def _update_loop(self):
        if not self._running:
            return
        try:
            stats = self.gateway.get_stats()
            self.mac_var.set(self._get_mac())
            self.state_var.set('Activo' if stats.get('running') else 'Inactivo')
            self.uptime_var.set(str(int(stats.get('uptime_seconds', 0))))
            self.msgs_var.set(str(stats.get('messages_processed', 0)))
            self.cmds_var.set(str(stats.get('commands_sent', 0)))
            self.err_var.set(str(stats.get('errors', 0)))
            # MQTT status
            try:
                mqtt_stats = stats.get('mqtt', {})
                connected = mqtt_stats.get('connected')
                if connected:
                    self.mqtt_status_var.set('Conectado')
                    self.mqtt_status_lbl.configure(foreground='green')
                else:
                    # revisar código de rc si existe
                    rc = None
                    try:
                        rc = getattr(self.gateway.mqtt, 'last_conn_rc', None)
                    except Exception:
                        rc = None
                    if rc == 4:
                        self.mqtt_status_var.set('Auth fallida')
                        self.mqtt_status_lbl.configure(foreground='red')
                    else:
                        self.mqtt_status_var.set('Desconectado')
                        self.mqtt_status_lbl.configure(foreground='orange')
            except Exception:
                pass
            # update pause btn label
            if getattr(self.gateway, 'processing_paused', False):
                self.pause_btn.config(text='Reanudar')
            else:
                self.pause_btn.config(text='Pausar')
            
            # Actualizar últimos datos si la sección está visible (reducir a cada 2 segundos para evitar congelamiento)
            if self.last_data_shown:
                current_time = time.time()
                if current_time - self._last_data_update_time >= 2.0:
                    self._update_last_data_display()
                    self._last_data_update_time = current_time
        except Exception:
            pass

        # programar siguiente actualización cada 1 segundo
        self.root.after(1000, self._update_loop)

    def _on_quit(self):
        if messagebox.askokcancel('Salir', 'Detener gateway y salir?'):
            self._running = False
            try:
                self.gateway.stop()
            except Exception:
                pass
            self.root.quit()
            self.root.destroy()

    def run(self):
        # Lanzar mainloop (debe correrse en hilo principal)
        self.root.mainloop()


def start_gui(gateway):
    gui = GatewayGUI(gateway)
    gui.run()
=======
GUI Tkinter para monitoreo y control del Gateway SCADA Raspberry Pi
Panel completo con configuración, estado general y datos en tiempo real
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import threading
import time
from typing import Optional, Dict, Any
from serial.tools import list_ports


class GatewayGUI:
    """
    Interfaz gráfica Tkinter para monitoreo y control del gateway SCADA
    """
    
    def __init__(self, gateway):
        """
        Inicializa la GUI
        
        Args:
            gateway: Instancia de SCADAGateway
        """
        self.gateway = gateway
        
        # Crear ventana principal
        self.root = tk.Tk()
        self.root.title("SCADA Gateway - Monitor & Control Completo")
        self.root.geometry("1400x800")
        self.root.minsize(1000, 600)
        
        # Estado de la UI
        self.showing_datos = True  # True: datos, False: tópicos
        self.running = True
        
        # Build UI
        self._build_ui()
        
        # Hilo de actualización
        self.update_thread = threading.Thread(target=self._update_loop, daemon=True)
        self.update_thread.start()
        
        # Protocolo de cierre
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
    
    def _build_ui(self):
        """Construye la interfaz gráfica completa"""
        
        # ===== PANEL SUPERIOR: Configuración =====
        config_panel = ttk.LabelFrame(self.root, text="Configuración del Gateway", padding=10)
        config_panel.pack(fill="x", padx=5, pady=5)
        
        # Fila 1: Broker, Puerto
        ttk.Label(config_panel, text="Broker MQTT:").grid(row=0, column=0, sticky="w", padx=5, pady=3)
        self.entry_broker = ttk.Entry(config_panel, width=20)
        self.entry_broker.grid(row=0, column=1, sticky="w", padx=5)
        
        ttk.Label(config_panel, text="Puerto:").grid(row=0, column=2, sticky="w", padx=5)
        self.entry_port = ttk.Entry(config_panel, width=10)
        self.entry_port.grid(row=0, column=3, sticky="w", padx=5)
        
        ttk.Label(config_panel, text="Usuario:").grid(row=0, column=4, sticky="w", padx=5)
        self.entry_user = ttk.Entry(config_panel, width=15)
        self.entry_user.grid(row=0, column=5, sticky="w", padx=5)
        
        ttk.Label(config_panel, text="Contraseña:").grid(row=0, column=6, sticky="w", padx=5)
        self.entry_pass = ttk.Entry(config_panel, width=15, show="*")
        self.entry_pass.grid(row=0, column=7, sticky="w", padx=5)
        
        # Fila 2: Tenant, Gateway ID/MAC
        ttk.Label(config_panel, text="Tenant/Empresa:").grid(row=1, column=0, sticky="w", padx=5, pady=3)
        self.entry_tenant = ttk.Entry(config_panel, width=20)
        self.entry_tenant.grid(row=1, column=1, sticky="w", padx=5)
        
        ttk.Label(config_panel, text="Gateway ID (MAC):", font=("Arial", 9, "bold")).grid(row=1, column=2, sticky="w", padx=5)
        self.entry_gateway_id = ttk.Entry(config_panel, width=20, font=("Consolas", 10, "bold"))
        self.entry_gateway_id.grid(row=1, column=3, columnspan=2, sticky="w", padx=5)
        
        ttk.Label(config_panel, text="Sector:").grid(row=1, column=5, sticky="w", padx=5)
        self.entry_sector = ttk.Entry(config_panel, width=15)
        self.entry_sector.grid(row=1, column=6, sticky="w", padx=5)
        
        # Fila 3: Puerto Serial Arduino y Sistema
        ttk.Label(config_panel, text="Puerto Serial (Arduino):").grid(row=2, column=0, sticky="w", padx=5, pady=3)
        # Obtener puertos disponibles
        available_ports = self._get_available_ports()
        self.combo_serial_port = ttk.Combobox(config_panel, values=available_ports, width=13, state="readonly")
        self.combo_serial_port.grid(row=2, column=1, sticky="w", padx=5)
        if available_ports:
            self.combo_serial_port.current(0)
        
        ttk.Label(config_panel, text="Nombre del Sistema:").grid(row=2, column=2, sticky="w", padx=5)
        self.entry_system_name = ttk.Entry(config_panel, width=25)
        self.entry_system_name.grid(row=2, column=3, columnspan=2, sticky="w", padx=5)
        
        # Botones de control
        btn_config_frame = ttk.Frame(config_panel)
        btn_config_frame.grid(row=3, column=0, columnspan=8, sticky="w", pady=(10, 0))
        
        btn_apply = tk.Button(
            btn_config_frame, text="💾 Guardar Cambios", bg="#16a34a", fg="white", 
            font=("Arial", 9, "bold"), command=self._apply_config, width=18
        )
        btn_apply.pack(side="left", padx=2)
        
        btn_pause = tk.Button(
            btn_config_frame, text="⏸ Pausar Gateway", bg="#f59e0b", fg="white",
            font=("Arial", 9, "bold"), command=self._toggle_pause, width=15
        )
        btn_pause.pack(side="left", padx=2)
        self.btn_pause = btn_pause
        
        btn_refresh = tk.Button(
            btn_config_frame, text="🔄 Actualizar", bg="#3b82f6", fg="white",
            font=("Arial", 9, "bold"), command=self._refresh_all, width=12
        )
        btn_refresh.pack(side="left", padx=2)
        
        # Cargar valores de configuración
        self._load_config_to_ui()
        
        # ===== PANEL PRINCIPAL: Dos columnas =====
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        # ===== COLUMNA IZQUIERDA: Información Detallada =====
        left_panel = ttk.LabelFrame(main_frame, text="Información Detallada", padding=8)
        left_panel.pack(side="left", fill="both", expand=False, padx=(0, 5))
        
        # ScrolledText para información
        self.info_text = scrolledtext.ScrolledText(
            left_panel, height=35, width=32, font=("Consolas", 8),
            bg="#1e293b", fg="#e2e8f0", wrap="word", relief="solid", borderwidth=1
        )
        self.info_text.pack(fill="both", expand=True)
        self.info_text.config(state="disabled")
        
        # ===== COLUMNA DERECHA: Panel de Alternancia + Estado General =====
        right_frame = ttk.Frame(main_frame)
        right_frame.pack(side="right", fill="both", expand=True, padx=(5, 0))
        
        # --- PANEL SUPERIOR DERECHA: Estado General del Sistema ---
        status_panel = ttk.LabelFrame(right_frame, text="Estado General del Sistema", padding=10)
        status_panel.pack(fill="x", pady=(0, 5))
        
        # Estados compactos
        status_grid = ttk.Frame(status_panel)
        status_grid.pack(fill="x")
        
        ttk.Label(status_grid, text="MQTT:").pack(side="left", padx=5)
        self.lbl_mqtt = tk.Label(status_grid, text="🔴 Desconectado", bg="#dc2626", fg="white", font=("Arial", 9), padx=8, pady=2)
        self.lbl_mqtt.pack(side="left", padx=2)
        
        ttk.Label(status_grid, text="Arduino:").pack(side="left", padx=5)
        self.lbl_arduino = tk.Label(status_grid, text="🔴 Desconectado", bg="#dc2626", fg="white", font=("Arial", 9), padx=8, pady=2)
        self.lbl_arduino.pack(side="left", padx=2)
        
        ttk.Label(status_grid, text="Database:").pack(side="left", padx=5)
        self.lbl_db = tk.Label(status_grid, text="🟢 Online", bg="#16a34a", fg="white", font=("Arial", 9), padx=8, pady=2)
        self.lbl_db.pack(side="left", padx=2)
        
        ttk.Label(status_grid, text="Gateway:").pack(side="left", padx=5)
        self.lbl_gw = tk.Label(status_grid, text="▶ Activo", bg="#16a34a", fg="white", font=("Arial", 9), padx=8, pady=2)
        self.lbl_gw.pack(side="left", padx=2)
        
        # Info adicional
        info_frame = ttk.Frame(status_panel)
        info_frame.pack(fill="x", pady=(10, 0))
        
        ttk.Label(info_frame, text="Mensajes:").pack(side="left", padx=5)
        self.lbl_msgs = ttk.Label(info_frame, text="0", font=("Arial", 9, "bold"))
        self.lbl_msgs.pack(side="left", padx=2)
        
        ttk.Label(info_frame, text="Comandos:").pack(side="left", padx=5)
        self.lbl_cmds = ttk.Label(info_frame, text="0", font=("Arial", 9, "bold"))
        self.lbl_cmds.pack(side="left", padx=2)
        
        ttk.Label(info_frame, text="Errores:").pack(side="left", padx=5)
        self.lbl_errors = ttk.Label(info_frame, text="0", font=("Arial", 9, "bold"), foreground="red")
        self.lbl_errors.pack(side="left", padx=2)
        
        # --- PANEL INFERIOR DERECHA: Alternancia Datos/Tópicos ---
        display_panel = ttk.LabelFrame(right_frame, text="Panel Lateral - Alternancia", padding=10)
        display_panel.pack(fill="both", expand=True, pady=(5, 0))
        
        # Botones de alternancia
        btn_frame = ttk.Frame(display_panel)
        btn_frame.pack(fill="x", pady=(0, 10))
        
        self.btn_show_datos = tk.Button(
            btn_frame, text="📊 Datos", bg="#9333ea", fg="white", font=("Arial", 9, "bold"),
            command=self._show_datos, width=15
        )
        self.btn_show_datos.pack(side="left", padx=2)
        
        self.btn_show_topics = tk.Button(
            btn_frame, text="📋 Tópicos", bg="#2563eb", fg="white", font=("Arial", 9, "bold"),
            command=self._show_topics, width=15
        )
        self.btn_show_topics.pack(side="left", padx=2)
        
        # ScrolledText para alternancia
        self.display_text = scrolledtext.ScrolledText(
            display_panel, height=25, width=45, font=("Consolas", 8),
            bg="#1e293b", fg="#e2e8f0", wrap="word", relief="solid", borderwidth=1
        )
        self.display_text.pack(fill="both", expand=True)
        self.display_text.config(state="disabled")
        
        # Mostrar datos inicialmente
        self._show_datos()
    
    def _show_datos(self):
        """Muestra datos de sensores y tópicos en el panel"""
        self.showing_datos = True
        self.btn_show_datos.config(bg="#a855f7", relief="sunken")
        self.btn_show_topics.config(bg="#2563eb", relief="raised")
        self._refresh_display()
    
    def _show_topics(self):
        """Muestra tópicos MQTT suscritos en el panel"""
        self.showing_datos = False
        self.btn_show_topics.config(bg="#0ea5e9", relief="sunken")
        self.btn_show_datos.config(bg="#9333ea", relief="raised")
        self._refresh_display()
    
    def _refresh_display(self):
        """Actualiza el contenido del panel de alternancia preservando la posición del scroll"""
        try:
            scroll_pos = self.display_text.yview()
        except Exception:
            scroll_pos = None

        self.display_text.config(state="normal")
        self.display_text.delete(1.0, "end")
        
        if self.showing_datos:
            self._display_datos()
        else:
            self._display_topics()
        
        self.display_text.config(state="disabled")
        
        if scroll_pos and scroll_pos[0] > 0.0:
            try:
                self.display_text.yview_moveto(scroll_pos[0])
            except Exception:
                pass
    
    def _display_datos(self):
        """Muestra datos de sensores y telemetría de Arduino"""
        content = "📊 LECTURAS DE SENSORES Y ACTUADORES\n"
        content += "=" * 38 + "\n\n"
        
        # 1. Obtener datos de forma thread-safe desde memoria en vivo, o fallback a base de datos
        data = None
        raw_line = ""
        arduino = getattr(self.gateway, 'arduino', None)
        if arduino and hasattr(arduino, 'last_received_data'):
            lock = getattr(arduino, 'data_lock', None)
            if lock:
                with lock:
                    if arduino.last_received_data:
                        data = dict(arduino.last_received_data)
                    raw_line = getattr(arduino, 'last_raw_line', "") or ""
            else:
                if arduino.last_received_data:
                    data = dict(arduino.last_received_data)
                raw_line = getattr(arduino, 'last_raw_line', "") or ""
        
        if not data and hasattr(self.gateway, 'storage') and self.gateway.storage:
            try:
                db_data = self.gateway.storage.get_latest_measurement()
                if db_data:
                    data = db_data
            except Exception:
                pass
        
        if not raw_line and data:
            raw_line = data.get('raw') or data.get('raw_data') or ""

        content += "📡 CADENA SERIAL RAW (ARDUINO):\n"
        content += "-" * 38 + "\n"
        if raw_line:
            content += f"  {raw_line}\n\n"
        else:
            if self.gateway.arduino and self.gateway.arduino.connected:
                content += "  ⏳ Esperando trama serial...\n\n"
            else:
                content += "  ❌ Arduino desconectado\n\n"
        
        if data:
            # Sensores Principales (Distancias en cm, Niveles en % & Caudales)
            content += "📥 SENSORES (LECTURAS):\n"
            content += "-" * 38 + "\n"
            
            # Distancias en cm (average1, average2, average3)
            d1 = data.get('nivel_bombo1', 'N/A')
            d2 = data.get('nivel_bombo2', 'N/A')
            dmz = data.get('nivel_mezcla', 'N/A')
            content += f"  • Distancia Bombo 1:... {d1} cm\n"
            content += f"  • Distancia Bombo 2:... {d2} cm\n"
            content += f"  • Distancia Mezcla:.... {dmz} cm\n"
            
            # Niveles en %
            p1 = data.get('porcentaje_bombo1', 'N/A')
            p2 = data.get('porcentaje_bombo2', 'N/A')
            pmz = data.get('porcentaje_mezcla', 'N/A')
            content += f"  • Porcentaje Bombo 1:.. {p1} %\n"
            content += f"  • Porcentaje Bombo 2:.. {p2} %\n"
            content += f"  • Porcentaje Mezcla:... {pmz} %\n"
            
            # Caudales
            c1 = data.get('caudal_1', 'N/A')
            c2 = data.get('caudal_2', 'N/A')
            content += f"  • Caudal 1:............ {c1} L/min\n"
            content += f"  • Caudal 2:............ {c2} L/min\n\n"
            
            # Actuadores / Estados
            content += "⚙️ ESTADO DE ACTUADORES:\n"
            content += "-" * 38 + "\n"
            b1 = "🟢 ENCENDIDA" if data.get('estado_bomba1') else "⚪ APAGADA"
            b2 = "🟢 ENCENDIDA" if data.get('estado_bomba2') else "⚪ APAGADA"
            bm = "🟢 ENCENDIDA" if data.get('estado_bomba_mezcla') else "⚪ APAGADA"
            mx = "🟢 ENCENDIDO" if data.get('estado_mezclador') else "⚪ APAGADO"
            br = "🟢 ENCENDIDA" if data.get('estado_bomba_repo') else "⚪ APAGADA"
            v1 = "🟢 ABIERTA" if data.get('estado_electrovalvula1') else "⚪ CERRADA"
            v2 = "🟢 ABIERTA" if data.get('estado_electrovalvula2') else "⚪ CERRADA"
            
            content += f"  • Bomba 1:............. {b1}\n"
            content += f"  • Bomba 2:............. {b2}\n"
            content += f"  • Bomba Mezcla:........ {bm}\n"
            content += f"  • Mezclador:........... {mx}\n"
            content += f"  • Bomba Reposición:.... {br}\n"
            content += f"  • Válvula Rep. A:...... {v1}\n"
            content += f"  • Válvula Rep. B:...... {v2}\n\n"
            
            # Proceso
            hr = data.get('hora_restante', 0)
            mr = data.get('min_restante', 0)
            ep = data.get('estado_proceso', 0)
            err = data.get('error', 0)
            content += f"  • Tiempo Restante:..... {hr:02d}:{mr:02d}\n"
            content += f"  • Estado Proceso:...... {ep}\n"
            content += f"  • Código Error:........ {err}\n"
            
            # Timestamp
            hora = data.get('fecha_hora', '')
            if not hora and 'timestamp' in data:
                hora = time.strftime('%H:%M:%S', time.localtime(data['timestamp']))
            if hora:
                content += f"  ⏱ Timestamp:.......... {hora}\n"
        else:
            if not (self.gateway.arduino and self.gateway.arduino.connected):
                content += "  ❌ Arduino NO conectado (sin mediciones disponibles)\n\n"
        
        content += "\n"
        
        # COMANDOS (Enviados al Arduino / Recibidos por MQTT)
        content += "📤 COMANDOS RECIENTES:\n"
        content += "-" * 38 + "\n"
        
        if hasattr(self.gateway, 'storage') and self.gateway.storage:
            try:
                cmds = self.gateway.storage.get_recent_commands(5)
                if cmds:
                    for i, c in enumerate(cmds[:5], 1):
                        cmd_str = c.get('comando', '')
                        orig = c.get('origen', 'mqtt')
                        hora = c.get('fecha_hora', '').split('T')[-1][:8] if 'fecha_hora' in c else ''
                        content += f"  {i}. [{orig}] {cmd_str} ({hora})\n"
                else:
                    content += "  (sin comandos recientes)\n"
            except Exception:
                content += "  (error al leer comandos)\n"
        else:
            content += "  (almacenamiento no disponible)\n"
        
        content += "\n"
        
        # ESTADÍSTICAS
        content += "📈 ESTADÍSTICAS:\n"
        content += "-" * 38 + "\n"
        
        if hasattr(self.gateway, 'stats'):
            stats = self.gateway.stats
            content += f"  Mensajes MQTT: {stats.get('messages_processed', 0)}\n"
            content += f"  Comandos: {stats.get('commands_sent', 0)}\n"
            content += f"  Errores: {stats.get('errors', 0)}\n"
        
        self.display_text.insert("end", content)
    
    def _display_topics(self):
        """Muestra tópicos MQTT suscritos con JSON esperado"""
        mqtt = self.gateway.mqtt
        config = self.gateway.config.get('mqtt', {})
        
        tenant = config.get('tenant', 'Rafaela_S.A')
        gw_id = config.get('gateway_id', 'd83add60dbb0')
        sector = config.get('default_sector', 'A1')
        sistema = config.get('default_system', 'linea_mezclado_1')
        
        content = "📡 TÓPICOS MQTT Y PAYLOADS\n"
        content += "=" * 38 + "\n\n"
        
        content += f"Tenant: {tenant}\n"
        content += f"Gateway: {gw_id}\n"
        content += f"Sector: {sector} | Sistema: {sistema}\n\n"
        
        # COMANDOS (Suscripción)
        content += "📥 COMANDOS (Suscripción):\n"
        content += "-" * 38 + "\n\n"
        
        commands = [
            ('reposicion', '{"bombo": 1, "limite_porcentaje": 75}'),
            ('freno_reposicion', '{}'),
            ('detener', '{}'),
            ('reanudar', '{}'),
            ('vaciar', '{}'),
            ('desechar', '{}'),
            ('mezcla', '{"liquido_1": 50, "liquido_2": 30, "hora": 0, "minuto": 15}')
        ]
        
        for cmd, payload in commands:
            topic = f"{tenant}/{gw_id}/{sector}/{sistema}/{cmd}"
            content += f"• {cmd}:\n"
            content += f"  {topic}\n"
            content += f"  {payload}\n\n"
        
        # SENSORES (Publicación)
        content += "\n📤 SENSORES (Publicación):\n"
        content += "-" * 38 + "\n\n"
        
        sensors = [
            ('nivel_bombo1', '{"valor": 75.5, "unidad": "%"}'),
            ('nivel_bombo2', '{"valor": 65.3, "unidad": "%"}'),
            ('nivel_mezcla', '{"valor": 45.0, "unidad": "%"}'),
            ('caudal_1', '{"valor": 12.5, "unidad": "L/min"}'),
            ('caudal_2', '{"valor": 8.3, "unidad": "L/min"}')
        ]
        
        for sensor_key, payload in sensors:
            topic = f"{tenant}/{gw_id}/{sector}/{sistema}/sensores/{sensor_key}"
            content += f"• {sensor_key}:\n"
            content += f"  {topic}\n"
            content += f"  {payload}\n\n"
        
        self.display_text.insert("end", content)
    
    def _load_config_to_ui(self):
        """Carga la configuración en los campos de entrada"""
        try:
            mqtt_cfg = self.gateway.config.get('mqtt', {})
            serial_cfg = self.gateway.config.get('serial', {})
            
            self.entry_broker.delete(0, 'end')
            self.entry_broker.insert(0, mqtt_cfg.get('broker', 'localhost'))
            
            self.entry_port.delete(0, 'end')
            self.entry_port.insert(0, str(mqtt_cfg.get('port', 1883)))
            
            self.entry_user.delete(0, 'end')
            self.entry_user.insert(0, mqtt_cfg.get('username', 'admin'))
            
            self.entry_pass.delete(0, 'end')
            self.entry_pass.insert(0, mqtt_cfg.get('password', ''))
            
            self.entry_tenant.delete(0, 'end')
            self.entry_tenant.insert(0, mqtt_cfg.get('tenant', 'Rafaela_S.A'))
            
            self.entry_gateway_id.delete(0, 'end')
            gateway_id = mqtt_cfg.get('gateway_id', 'd83add60dbb0')
            self.entry_gateway_id.insert(0, gateway_id)
            
            self.entry_sector.delete(0, 'end')
            self.entry_sector.insert(0, mqtt_cfg.get('default_sector', 'A1'))
            
            current_port = serial_cfg.get('port', '/dev/ttyACM0')
            available = self._get_available_ports()
            if current_port in available:
                self.combo_serial_port.set(current_port)
            elif available:
                self.combo_serial_port.current(0)
            
            self.entry_system_name.delete(0, 'end')
            self.entry_system_name.insert(0, mqtt_cfg.get('default_system', 'linea_mezclado_1'))
        except Exception as e:
            pass
    
    def _get_available_ports(self):
        """Obtiene lista de puertos seriales disponibles"""
        try:
            ports = [port.device for port in list_ports.comports()]
            return ports if ports else ['/dev/ttyACM0', '/dev/ttyUSB0']
        except:
            return ['/dev/ttyACM0', '/dev/ttyUSB0', 'COM3', 'COM4']
    
    def _apply_config(self):
        """Guarda los cambios de configuración en memoria y en disco (config.yaml y SQLite)"""
        try:
            # Recolectar valores del formulario
            broker = self.entry_broker.get().strip()
            port = int(self.entry_port.get().strip()) if self.entry_port.get().strip() else 1883
            user = self.entry_user.get().strip()
            password = self.entry_pass.get().strip()
            tenant = self.entry_tenant.get().strip()
            gateway_id = self.entry_gateway_id.get().strip()
            sector = self.entry_sector.get().strip()
            serial_port = self.combo_serial_port.get().strip()
            system_name = self.entry_system_name.get().strip()
            
            # Actualizar configuración del gateway en memoria
            if self.gateway.config.get('mqtt'):
                self.gateway.config['mqtt'].update({
                    'broker': broker,
                    'port': port,
                    'username': user,
                    'password': password,
                    'tenant': tenant,
                    'gateway_id': gateway_id,
                    'default_sector': sector,
                    'default_system': system_name
                })
            
            if self.gateway.config.get('serial'):
                self.gateway.config['serial']['port'] = serial_port
            
            # Persistir efectivamente los cambios en disco físico (config.yaml y SQLite)
            guardado = False
            if hasattr(self.gateway, 'save_config'):
                guardado = self.gateway.save_config()
            
            if guardado:
                messagebox.showinfo("✓ Configuración Guardada", 
                                  f"Configuración guardada en disco (config.yaml y base de datos local).\n\n"
                                  f"Broker: {broker}:{port}\n"
                                  f"Tenant: {tenant}\n"
                                  f"Sistema: {system_name}\n"
                                  f"Puerto Serial: {serial_port}\n\n"
                                  f"Los cambios persistirán ante reinicios de la Raspberry Pi.\n"
                                  f"Nota: Para aplicar broker o puerto serial en ejecución activa, reinicia el servicio (gw-restart).")
            else:
                messagebox.showwarning("⚠️ Advertencia",
                                     "Los cambios se aplicaron en memoria pero hubo un problema al escribir en disco.")
        except ValueError as e:
            messagebox.showerror("Error", f"Valor inválido en los campos de configuración")
    
    def _toggle_pause(self):
        """Alterna pausa del gateway"""
        self.gateway.processing_paused = not self.gateway.processing_paused
        status = "⏸ Pausado" if self.gateway.processing_paused else "▶ Activo"
        self.btn_pause.config(text=status)
    
    def _refresh_all(self):
        """Refresca toda la información visual"""
        self._refresh_display()
        self._update_status()
    
    def _update_loop(self):
        """Loop de actualización de estado en tiempo real"""
        while self.running:
            try:
                self.root.after(1000, self._update_status)
                time.sleep(1.0)
            except:
                break
    
    def _update_status(self):
        """Actualiza indicadores de estado"""
        try:
            # Estado MQTT
            if self.gateway.mqtt and self.gateway.mqtt.connected:
                self.lbl_mqtt.config(text="🟢 Conectado", bg="#16a34a")
            else:
                self.lbl_mqtt.config(text="🔴 Desconectado", bg="#dc2626")
            
            # Estado Arduino
            if self.gateway.arduino and self.gateway.arduino.connected:
                self.lbl_arduino.config(text="🟢 Conectado", bg="#16a34a")
            else:
                self.lbl_arduino.config(text="🔴 Desconectado", bg="#dc2626")
            
            # Gateway state
            if self.gateway.processing_paused:
                self.lbl_gw.config(text="⏸ Pausado", bg="#f59e0b")
            else:
                self.lbl_gw.config(text="▶ Activo", bg="#16a34a")
            
            # Estadísticas
            if hasattr(self.gateway, 'stats'):
                stats = self.gateway.stats
                self.lbl_msgs.config(text=str(stats.get('messages_processed', 0)))
                self.lbl_cmds.config(text=str(stats.get('commands_sent', 0)))
                self.lbl_errors.config(text=str(stats.get('errors', 0)))
            
            # Panel de información
            try:
                info_scroll = self.info_text.yview()
            except Exception:
                info_scroll = None

            self.info_text.config(state="normal")
            self.info_text.delete(1.0, "end")
            
            mqtt_cfg = self.gateway.config.get('mqtt', {})
            gw_id = mqtt_cfg.get('gateway_id', 'desconocido')
            
            info = "🖥️ INFORMACIÓN DEL GATEWAY\n"
            info += "=" * 50 + "\n\n"
            
            info += f"📱 Gateway ID (MAC): {gw_id}\n"
            info += f"🏢 Tenant: {mqtt_cfg.get('tenant', 'N/A')}\n"
            info += f"🌐 Broker MQTT: {mqtt_cfg.get('broker', 'N/A')}:{mqtt_cfg.get('port', 'N/A')}\n"
            info += f"🔐 Usuario: {mqtt_cfg.get('username', 'N/A')}\n"
            info += f"📍 Sector: {mqtt_cfg.get('default_sector', 'N/A')}\n"
            info += f"⚙️ Sistema: {mqtt_cfg.get('default_system', 'N/A')}\n\n"
            
            info += " ÚLTIMOS EVENTOS\n"
            info += "-" * 50 + "\n"
            
            if hasattr(self.gateway, 'storage') and self.gateway.storage:
                try:
                    eventos = self.gateway.storage.get_recent_events(limit=4)
                    if eventos:
                        for ev in eventos:
                            desc = ev.get('descripcion', '')[:35]
                            hora = ev.get('fecha_hora', '').split('T')[-1][:8] if 'fecha_hora' in ev else ''
                            info += f"  • [{hora}] {desc}\n"
                    else:
                        info += "  (sin eventos registrados)\n"
                except Exception:
                    info += "  Esperando eventos...\n"
            elif hasattr(self.gateway, 'mqtt') and self.gateway.mqtt:
                if hasattr(self.gateway.mqtt, 'last_received_message') and self.gateway.mqtt.last_received_message:
                    msg = self.gateway.mqtt.last_received_message
                    info += f"  Último msg: {str(msg.get('topic', ''))[:35]}\n"
                else:
                    info += f"  Esperando mensajes MQTT...\n"
            
            info += "\n📋 CONFIGURACIÓN\n"
            info += "-" * 50 + "\n"
            info += f"  QoS: {mqtt_cfg.get('qos', 1)}\n"
            info += f"  Keepalive: {mqtt_cfg.get('keepalive', 60)}s\n"
            info += f"  Puerto Serial: {self.gateway.config.get('serial', {}).get('port', 'N/A')}\n"
            info += f"  Baudrate: {self.gateway.config.get('serial', {}).get('baudrate', 'N/A')}\n"
            
            self.info_text.insert("end", info)
            self.info_text.config(state="disabled")

            if info_scroll and info_scroll[0] > 0.0:
                try:
                    self.info_text.yview_moveto(info_scroll[0])
                except Exception:
                    pass

            # Refrescar en tiempo real el Panel Lateral - Alternancia
            self._refresh_display()
            
        except Exception as e:
            pass
    
    def _on_close(self):
        """Maneja cierre de ventana y detiene el gateway"""
        self.running = False
        try:
            if self.gateway:
                self.gateway.stop()
        except Exception:
            pass
        try:
            self.root.quit()
            self.root.destroy()
        except Exception:
            pass
    
    def start(self):
        """Inicia el loop de GUI"""
        try:
            self.root.mainloop()
        except KeyboardInterrupt:
            self._on_close()


def start_gui(gateway):
    """
    Función de punto de entrada para iniciar la GUI
    
    Args:
        gateway: Instancia de SCADAGateway
    """
    gui = GatewayGUI(gateway)
    gui.start()
>>>>>>> 47cfd00238b716167f1fba74d6ec7a5a96b2b385
