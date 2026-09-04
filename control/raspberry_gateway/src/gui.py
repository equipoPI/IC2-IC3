"""
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
import os
import glob
from loguru import logger

try:
    from serial.tools.list_ports import comports
except ImportError:
    comports = None


class GatewayGUI:
    def __init__(self, gateway):
        self.gateway = gateway
        self.root = tk.Tk()
        self.root.title("SCADA Gateway Control")
        
        # Configurar cierre de ventana para detener gateway también
        self.root.protocol("WM_DELETE_WINDOW", self._on_window_close)
        
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
        ttk.Label(frm, text="Gateway ID / MAC (ID Único SCADA):").grid(column=0, row=0, sticky='w')
        self.mac_var = tk.StringVar(value=self._get_mac())
        ttk.Label(frm, textvariable=self.mac_var).grid(column=1, row=0, sticky='w')

        ttk.Label(frm, text="Uptime (s):").grid(column=0, row=1, sticky='w')
        self.uptime_var = tk.StringVar(value='0')
        ttk.Label(frm, textvariable=self.uptime_var).grid(column=1, row=1, sticky='w')

        ttk.Label(frm, text="Mensajes procesados:").grid(column=0, row=2, sticky='w')
        self.msgs_var = tk.StringVar(value='0')
        ttk.Label(frm, textvariable=self.msgs_var).grid(column=1, row=2, sticky='w')

        # Arduino connection status
        ttk.Label(frm, text="Arduino:").grid(column=0, row=3, sticky='w')
        self.arduino_status_var = tk.StringVar(value='Desconocido')
        self.arduino_status_lbl = ttk.Label(frm, textvariable=self.arduino_status_var, foreground='orange')
        self.arduino_status_lbl.grid(column=1, row=3, sticky='w')

        # MQTT connection status
        ttk.Label(frm, text="MQTT:").grid(column=0, row=4, sticky='w')
        self.mqtt_status_var = tk.StringVar(value='Desconocido')
        self.mqtt_status_lbl = ttk.Label(frm, textvariable=self.mqtt_status_var, foreground='orange')
        self.mqtt_status_lbl.grid(column=1, row=4, sticky='w')

        ttk.Label(frm, text="Comandos enviados:").grid(column=0, row=5, sticky='w')
        self.cmds_var = tk.StringVar(value='0')
        ttk.Label(frm, textvariable=self.cmds_var).grid(column=1, row=5, sticky='w')

        ttk.Label(frm, text="Errores:").grid(column=0, row=6, sticky='w')
        self.err_var = tk.StringVar(value='0')
        ttk.Label(frm, textvariable=self.err_var).grid(column=1, row=6, sticky='w')

        # Controls
        btn_frame = ttk.Frame(frm)
        btn_frame.grid(column=0, row=7, columnspan=2, pady=(8,0))

        self.pause_btn = ttk.Button(btn_frame, text='Pausar', command=self._toggle_pause)
        self.pause_btn.grid(column=0, row=0, padx=4)

        self.reconnect_arduino_btn = ttk.Button(btn_frame, text='Reconectar Arduino', command=self._reconnect_arduino)
        self.reconnect_arduino_btn.grid(column=1, row=0, padx=4)

        self.reconnect_btn = ttk.Button(btn_frame, text='Reconectar MQTT', command=self._reconnect_mqtt)
        self.reconnect_btn.grid(column=2, row=0, padx=4)

        self.save_btn = ttk.Button(btn_frame, text='Guardar config', command=self._save_config)
        self.save_btn.grid(column=3, row=0, padx=4)

        self.quit_btn = ttk.Button(btn_frame, text='Salir', command=self._on_quit)
        self.quit_btn.grid(column=4, row=0, padx=4)

        # Config editable
        sep = ttk.Separator(frm, orient='horizontal')
        sep.grid(column=0, row=8, columnspan=2, sticky='ew', pady=(8,8))

        ttk.Label(frm, text='MQTT Broker:').grid(column=0, row=9, sticky='w')
        self.mqtt_broker = tk.StringVar(value=self.gateway.config.get('mqtt', {}).get('broker', ''))
        ttk.Entry(frm, textvariable=self.mqtt_broker, width=30).grid(column=1, row=9, sticky='w')

        ttk.Label(frm, text='MQTT Port:').grid(column=0, row=10, sticky='w')
        self.mqtt_port = tk.StringVar(value=str(self.gateway.config.get('mqtt', {}).get('port', 1883)))
        ttk.Entry(frm, textvariable=self.mqtt_port, width=10).grid(column=1, row=10, sticky='w')

        ttk.Label(frm, text='MQTT Username:').grid(column=0, row=11, sticky='w')
        self.mqtt_username = tk.StringVar(value=self.gateway.config.get('mqtt', {}).get('username', ''))
        ttk.Entry(frm, textvariable=self.mqtt_username, width=20).grid(column=1, row=11, sticky='w')

        ttk.Label(frm, text='MQTT Password:').grid(column=0, row=12, sticky='w')
        self.mqtt_password = tk.StringVar(value=self.gateway.config.get('mqtt', {}).get('password', ''))
        ttk.Entry(frm, textvariable=self.mqtt_password, width=20, show='*').grid(column=1, row=12, sticky='w')

        ttk.Label(frm, text='Serial Port:').grid(column=0, row=13, sticky='w')
        port_frame = ttk.Frame(frm)
        port_frame.grid(column=1, row=13, sticky='w')
        
        self.serial_port = tk.StringVar(value=self.gateway.config.get('serial', {}).get('port', ''))
        self.port_combo = ttk.Combobox(port_frame, textvariable=self.serial_port, width=17, state='readonly')
        self.port_combo.pack(side=tk.LEFT, padx=(0, 4))
        self._refresh_ports()
        
        self.refresh_ports_btn = ttk.Button(port_frame, text='↻ Detectar', command=self._refresh_ports, width=10)
        self.refresh_ports_btn.pack(side=tk.LEFT)

        ttk.Label(frm, text='Baudrate:').grid(column=0, row=14, sticky='w')
        baud_frame = ttk.Frame(frm)
        baud_frame.grid(column=1, row=14, sticky='w')
        
        self.baudrate = tk.StringVar(value=str(self.gateway.config.get('serial', {}).get('baudrate', 115200)))
        self.baud_combo = ttk.Combobox(baud_frame, textvariable=self.baudrate, width=12, values=['9600', '19200', '38400', '57600', '115200', '230400'], state='readonly')
        self.baud_combo.pack(side=tk.LEFT)

        ttk.Label(frm, text='Planta (Tenant):').grid(column=0, row=15, sticky='w')
        self.mqtt_tenant = tk.StringVar(value=self.gateway.config.get('mqtt', {}).get('tenant', 'rafaela'))
        ttk.Entry(frm, textvariable=self.mqtt_tenant, width=20).grid(column=1, row=15, sticky='w')

        ttk.Label(frm, text='Sección (Sector):').grid(column=0, row=16, sticky='w')
        self.mqtt_sector = tk.StringVar(value=self.gateway.config.get('mqtt', {}).get('default_sector', 'ala_este'))
        ttk.Entry(frm, textvariable=self.mqtt_sector, width=20).grid(column=1, row=16, sticky='w')

        ttk.Label(frm, text='Sistema (System):').grid(column=0, row=17, sticky='w')
        self.mqtt_system = tk.StringVar(value=self.gateway.config.get('mqtt', {}).get('default_system', 'linea_mezclado_1'))
        ttk.Entry(frm, textvariable=self.mqtt_system, width=20).grid(column=1, row=17, sticky='w')

        # Buttons frame - topics and last data buttons side by side
        self.btn_frame_toggles = ttk.Frame(frm)
        self.btn_frame_toggles.grid(column=0, row=18, columnspan=2, pady=(8,0))

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

        self.topics_frame.grid(column=0, row=18, columnspan=2, pady=(8,0))
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
        self.last_data_frame.grid(column=0, row=19, columnspan=2, pady=(8,0))
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
        try:
            scroll_position = self.last_data_text.yview()[0]
        except Exception:
            scroll_position = 0.0
        
        # Solo actualizar si el contenido cambió
        if new_content != self._last_data_display_cache:
            self.last_data_text.configure(state='normal')
            self.last_data_text.delete('1.0', tk.END)
            self.last_data_text.insert(tk.END, new_content)
            self.last_data_text.configure(state='disabled')
            try:
                self.last_data_text.yview_moveto(scroll_position)
            except Exception:
                pass
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

    def _refresh_ports(self):
        """
        Detecta los puertos seriales disponibles y los agrega al Combobox
        Intenta múltiples métodos para ser lo más exhaustivo posible
        """
        available_ports = []
        
        # Método 1: Usar comports() de pyserial (más confiable si disponible)
        if comports is not None:
            try:
                available_ports = [port.device for port in comports()]
            except Exception as e:
                print(f"Error usando comports(): {e}")
        
        # Método 2: Buscar manualmente en /dev/ los puertos más comunes
        # Esto captura puertos que comports() podría perder
        if os.path.exists('/dev'):
            patterns = ['/dev/ttyACM*', '/dev/ttyUSB*', '/dev/ttyS*', '/dev/cu.usbserial*', '/dev/cu.wchusbserial*']
            for pattern in patterns:
                try:
                    matched = glob.glob(pattern)
                    for port in matched:
                        if port not in available_ports:
                            available_ports.append(port)
                except Exception:
                    pass
        
        # Remover duplicados y ordenar
        available_ports = sorted(set(available_ports))
        
        # Si no hay puertos, mostrar mensaje
        if not available_ports:
            available_ports = ['(ninguno detectado)']
        
        self.port_combo['values'] = available_ports
        
        # Si el puerto actual no está en la lista, agregarlo al principio
        current = self.serial_port.get()
        if current and current not in available_ports:
            values = list(self.port_combo['values'])
            values.insert(0, current)
            self.port_combo['values'] = values
            # Seleccionar el puerto actual
            self.port_combo.current(0)
        
        # Debug: mostrar en log qué puertos se encontraron
        print(f"Puertos seriales detectados: {available_ports}")

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
        """
        Guarda configuración de forma asíncrona para no bloquear GUI
        """
        try:
            # Validar y obtener valores
            broker = self.mqtt_broker.get().strip()
            port = int(self.mqtt_port.get())
            s_port = self.serial_port.get().strip()
            baud = int(self.baudrate.get())
            username = self.mqtt_username.get().strip()
            password = self.mqtt_password.get()
            tenant = self.mqtt_tenant.get().strip()
            sector = self.mqtt_sector.get().strip()
            system = self.mqtt_system.get().strip()

            # Preparar configuración
            conf = self.gateway.config
            conf.setdefault('mqtt', {})['broker'] = broker
            conf['mqtt']['port'] = port
            conf['mqtt']['username'] = username
            conf['mqtt']['password'] = password
            conf['mqtt']['tenant'] = tenant
            conf['mqtt']['default_sector'] = sector
            conf['mqtt']['default_system'] = system
            conf.setdefault('serial', {})['port'] = s_port
            conf['serial']['baudrate'] = baud

            # Guardar en archivo (operación rápida)
            try:
                with open(self.gateway.config_path, 'w') as f:
                    yaml.safe_dump(conf, f)
            except Exception as e:
                messagebox.showerror('Error', f'Error guardando archivo: {e}')
                return

            # Aplicar en memoria (rápido)
            self.gateway.config = conf

            # Operaciones de reconexión se hacen en thread separado (no bloquea GUI)
            def apply_config_async():
                try:
                    # Aplicar cambios MQTT
                    if self.gateway.mqtt:
                        self.gateway.mqtt.broker = broker
                        self.gateway.mqtt.port = port
                        self.gateway.mqtt.tenant = self.gateway.mqtt._sanitize_token(tenant)
                        self.gateway.mqtt.default_sector = self.gateway.mqtt._sanitize_token(sector)
                        self.gateway.mqtt.default_system = self.gateway.mqtt._sanitize_token(system)
                        
                        try:
                            self.gateway.mqtt.rebuild_subscribe_filters()
                        except Exception as e:
                            logger.warning(f"Error reconstruyendo filtros MQTT: {e}")
                        
                        # Reconectar MQTT si credenciales cambiaron
                        try:
                            self.gateway.mqtt.username = username or None
                            self.gateway.mqtt.password = password or None
                            if self.gateway.mqtt.connected:
                                self.gateway.mqtt.disconnect()
                                time.sleep(0.3)  # En thread, sleep es OK
                                self.gateway.mqtt.connect()
                        except Exception as e:
                            logger.warning(f"Error reconectando MQTT: {e}")
                    
                    # Aplicar cambios Arduino
                    if self.gateway.arduino:
                        self.gateway.arduino.port = s_port
                        self.gateway.arduino.baudrate = baud
                        
                        try:
                            # Detener threads
                            self.gateway.arduino.stop()
                            time.sleep(0.2)  # En thread, sleep es OK
                            
                            # Reconectar
                            if self.gateway.arduino.connect():
                                self.gateway.arduino.start()
                        except Exception as e:
                            logger.warning(f"Error reconectando Arduino: {e}")
                
                except Exception as e:
                    logger.error(f"Error en apply_config_async: {e}")
            
            # Ejecutar en thread background (no bloquea mainloop)
            config_thread = threading.Thread(target=apply_config_async, daemon=True, name="ConfigApply")
            config_thread.start()

            messagebox.showinfo('Configuración', 'Configuración guardada. Aplicando cambios...')
        
        except ValueError as e:
            messagebox.showerror('Error', f'Error en valores de configuración: {e}')
        except Exception as e:
            messagebox.showerror('Error', f'Error guardando configuración: {e}')

    def _reconnect_mqtt(self):
        """
        Desconecta y reconecta el cliente MQTT (asíncrono, no bloquea GUI)
        """
        def reconnect_async():
            try:
                if self.gateway.mqtt:
                    try:
                        self.gateway.mqtt.disconnect()
                        time.sleep(0.2)
                    except Exception:
                        pass
                    
                    ok = self.gateway.mqtt.connect()
                    
                    def show_result():
                        if ok:
                            messagebox.showinfo('MQTT', 'Reconectado con éxito')
                        else:
                            rc = getattr(self.gateway.mqtt, 'last_conn_rc', None)
                            if rc == 4:
                                messagebox.showerror('MQTT', 'Fallo de autenticación: usuario/contraseña incorrectos')
                            else:
                                messagebox.showerror('MQTT', 'No se pudo reconectar al broker MQTT')
                    
                    self.root.after(0, show_result)
                else:
                    self.root.after(0, lambda: messagebox.showerror('MQTT', 'Cliente MQTT no inicializado'))
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror('Error MQTT', f'Error: {e}'))
        
        # Ejecutar en thread para no bloquear GUI
        mqtt_thread = threading.Thread(target=reconnect_async, daemon=True, name="MQTTReconnect")
        mqtt_thread.start()

    def _reconnect_arduino(self):
        """
        Desconecta y reconecta el Arduino Serial (asíncrono)
        """
        def reconnect_async():
            try:
                if self.gateway.arduino:
                    # Detener threads
                    self.gateway.arduino.stop()
                    time.sleep(0.3)
                    
                    # Intentar conectar
                    ok = self.gateway.arduino.connect()
                    
                    def show_result():
                        if ok:
                            # Iniciar threads
                            ok_start = self.gateway.arduino.start()
                            if ok_start:
                                port = self.gateway.config.get('serial', {}).get('port', 'puerto desconocido')
                                messagebox.showinfo('Arduino', f'Reconectado con éxito en {port}')
                            else:
                                messagebox.showerror('Arduino', 'Se conectó pero falló iniciar threads')
                        else:
                            puerto = self.gateway.config.get('serial', {}).get('port', '/dev/ttyACM0')
                            messagebox.showerror('Arduino', f'No se pudo conectar en {puerto}.\n\nVerifica:\n- Dispositivo conectado\n- Puerto correcto\n- Permisos (/dev/ttyACM*)')
                    
                    self.root.after(0, show_result)
                else:
                    self.root.after(0, lambda: messagebox.showerror('Arduino', 'Arduino no inicializado'))
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror('Error Arduino', f'Error: {e}'))
        
        # Ejecutar en thread para no bloquear GUI
        arduino_thread = threading.Thread(target=reconnect_async, daemon=True, name="ArduinoReconnect")
        arduino_thread.start()

    def _update_loop(self):
        """
        Loop de actualización de la GUI que NO debe bloquear el mainloop
        """
        if not self._running:
            return
        
        try:
            # Usar try-except para cada operación potencialmente lenta
            try:
                stats = self.gateway.get_stats()
                self.mac_var.set(self._get_mac())
                self.uptime_var.set(str(int(stats.get('uptime_seconds', 0))))
                self.msgs_var.set(str(stats.get('messages_processed', 0)))
                self.cmds_var.set(str(stats.get('commands_sent', 0)))
                self.err_var.set(str(stats.get('errors', 0)))
            except Exception as e:
                logger.warning(f"Error actualizando stats: {e}")
            
            # Arduino status (separado para no bloquear)
            try:
                arduino_stats = stats.get('arduino', {})
                connected = arduino_stats.get('connected')
                if connected:
                    self.arduino_status_var.set('Conectado')
                    self.arduino_status_lbl.configure(foreground='green')
                else:
                    self.arduino_status_var.set('Desconectado')
                    self.arduino_status_lbl.configure(foreground='red')
            except Exception as e:
                logger.warning(f"Error actualizando Arduino status: {e}")
                self.arduino_status_var.set('Desconocido')
                self.arduino_status_lbl.configure(foreground='orange')
            
            # MQTT status (separado)
            try:
                mqtt_stats = stats.get('mqtt', {})
                connected = mqtt_stats.get('connected')
                if connected:
                    self.mqtt_status_var.set('Conectado')
                    self.mqtt_status_lbl.configure(foreground='green')
                else:
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
            except Exception as e:
                logger.warning(f"Error actualizando MQTT status: {e}")
            
            # Update pause button label
            try:
                if getattr(self.gateway, 'processing_paused', False):
                    self.pause_btn.config(text='Reanudar')
                else:
                    self.pause_btn.config(text='Pausar')
            except Exception as e:
                logger.warning(f"Error actualizando pause button: {e}")
            
            # Actualizar últimos datos si la sección está visible
            try:
                if self.last_data_shown:
                    current_time = time.time()
                    if current_time - self._last_data_update_time >= 2.0:
                        self._update_last_data_display()
                        self._last_data_update_time = current_time
            except Exception as e:
                logger.warning(f"Error actualizando last data: {e}")
        
        except Exception as e:
            logger.error(f"Error inesperado en update_loop: {e}")
        
        # Programar siguiente actualización (usar after, nunca sleep o blocking calls)
        self.root.after(1000, self._update_loop)

    def _on_window_close(self):
        """
        Manejador cuando el usuario cierra la ventana
        """
        if messagebox.askokcancel('Salir', 'Detener gateway y salir?'):
            self._running = False
            try:
                self.gateway.stop()
            except Exception as e:
                logger.error(f"Error al detener gateway: {e}")
            self.root.quit()
            self.root.destroy()

    def _on_quit(self):
        self._on_window_close()

    def run(self):
        # Lanzar mainloop (debe correrse en hilo principal)
        self.root.mainloop()


def start_gui(gateway):
    gui = GatewayGUI(gateway)
    gui.run()
