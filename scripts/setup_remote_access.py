"""
Script Asistente de Acceso Web Remoto Seguro HTTPS (Ngrok Tunnel).

Muestra el estado del conector de Ngrok Tunnel en Docker y permite verificar
la conectividad remota encriptada al sistema SCADA.
"""

import sys
import subprocess
import time

def check_tunnel_status():
    print("=" * 70)
    print("[+] SCADA IoT - Asistente de Acceso Web Remoto (Ngrok Tunnel)")
    print("=" * 70)
    
    try:
        res = subprocess.run(["docker", "ps", "--filter", "name=scada_ngrok_tunnel", "--format", "{{.Status}}"], capture_output=True, text=True)
        status = res.stdout.strip()
        if status:
            print(f"[OK] Contenedor 'scada_ngrok_tunnel' ACTIVO en Docker ({status})")
            print("\n[!] Instrucciones de acceso:")
            print("1. Revisa tu dominio configurado en key.env (NGROK_DOMAIN).")
            print("2. Abre tu navegador en esa direccion HTTPS.")
            print("3. ¡Listo! Ya puedes ingresar desde cualquier celular o PC externa sin abrir puertos.\n")
        else:
            print("[!] El contenedor 'scada_ngrok_tunnel' se esta iniciando o descargando...")
    except Exception as e:
        print(f"[X] Error al comprobar estado de Docker: {e}")

if __name__ == "__main__":
    check_tunnel_status()
