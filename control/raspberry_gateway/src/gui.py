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


class GatewayGUI:
    def __init__(self, gateway):
        self.gateway = gateway
        self.root = tk.Tk()
        self.root.title("SCADA Gateway Control")
        self._build()
        self._running = True
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

        # Button to toggle topics view
        self.topics_shown = False
        self.show_topics_btn = ttk.Button(frm, text='Mostrar topics', command=self._toggle_topics)
        self.show_topics_btn.grid(column=0, row=14, columnspan=2, pady=(8,0))

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

    def _toggle_topics(self):
        if self.topics_shown:
            self.topics_frame.grid_forget()
            self.show_topics_btn.config(text='Mostrar topics')
            self.topics_shown = False
            return

        # llenar contenido desde config
        mqtt_cfg = self.gateway.config.get('mqtt', {})
        topics = mqtt_cfg.get('topics', {})
        publish = topics.get('publish', {})
        subscribe = topics.get('subscribe', {})
        subscribe_filters = topics.get('subscribe_filters', [])

        content_lines = []
        content_lines.append('Publish (desde gateway):')
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
        except Exception:
            pass

        # programar siguiente actualización
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
