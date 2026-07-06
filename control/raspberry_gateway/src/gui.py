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

        ttk.Label(frm, text='Serial Port:').grid(column=0, row=10, sticky='w')
        self.serial_port = tk.StringVar(value=self.gateway.config.get('serial', {}).get('port', ''))
        ttk.Entry(frm, textvariable=self.serial_port, width=20).grid(column=1, row=10, sticky='w')

        ttk.Label(frm, text='Baudrate:').grid(column=0, row=11, sticky='w')
        self.baudrate = tk.StringVar(value=str(self.gateway.config.get('serial', {}).get('baudrate', 115200)))
        ttk.Entry(frm, textvariable=self.baudrate, width=10).grid(column=1, row=11, sticky='w')

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
                    # reconnect
                    if self.gateway.mqtt.connected:
                        self.gateway.mqtt.disconnect()
                        self.gateway.mqtt.connect()
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
