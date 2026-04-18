#!/usr/bin/env python3
"""
Tierra Print Agent — per stampante Sunmi Cloud Printer (80mm).

Uso:
    1) Assicurati che Python 3 sia installato sul Mac (è già incluso su macOS).
    2) Apri il Terminale e digita:
         python3 tierra_print_agent.py
    3) Tieni la finestra aperta. Stampa le comande appena gli ordini vengono pagati.

Configurazione: modifica le 3 variabili sotto oppure usa variabili d'ambiente.

Variabili d'ambiente supportate:
    TIERRA_API_URL       es. https://tierra-bistro-menu.preview.emergentagent.com
    TIERRA_PRINT_TOKEN   token fornito dall'amministratore
    PRINTER_IP           IP della Sunmi sulla tua Wi-Fi (es. 192.168.1.50)
    PRINTER_PORT         default 9100

Per trovare l'IP della Sunmi: tieni premuto il tasto FEED/Alimentazione
alla base della stampante, verrà stampato un foglietto di auto-test.
"""
import base64
import os
import socket
import sys
import time
import urllib.request
import urllib.error
import json

API_URL = os.environ.get("TIERRA_API_URL", "https://tierra-bistro-menu.preview.emergentagent.com")
PRINT_TOKEN = os.environ.get("TIERRA_PRINT_TOKEN", "tierra-print-agent-8f2c3d5e")
PRINTER_IP = os.environ.get("PRINTER_IP", "192.168.1.50")
PRINTER_PORT = int(os.environ.get("PRINTER_PORT", "9100"))

POLL_SECONDS = 3
TIMEOUT = 10


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def http_json(method: str, path: str, body: dict | None = None) -> dict:
    url = f"{API_URL.rstrip('/')}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "X-Print-Token": PRINT_TOKEN,
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def send_to_printer(payload: bytes) -> bool:
    try:
        with socket.create_connection((PRINTER_IP, PRINTER_PORT), timeout=10) as s:
            s.sendall(payload)
        return True
    except Exception as e:
        log(f"⚠️  Stampante non raggiungibile ({PRINTER_IP}:{PRINTER_PORT}): {e}")
        return False


def run_once() -> None:
    try:
        resp = http_json("GET", "/api/print/pending")
    except urllib.error.HTTPError as e:
        log(f"HTTP {e.code} da /api/print/pending: {e.read().decode('utf-8', 'ignore')[:200]}")
        return
    except Exception as e:
        log(f"Errore collegamento al sito: {e}")
        return

    jobs = resp.get("jobs", [])
    if not jobs:
        return
    log(f"🧾 {len(jobs)} comanda(e) in coda")
    for job in jobs:
        try:
            data = base64.b64decode(job["escpos_base64"])
        except Exception as e:
            log(f"Payload non valido per job {job.get('job_id')}: {e}")
            continue
        ok = send_to_printer(data)
        try:
            http_json("POST", f"/api/print/ack/{job['job_id']}?success={'true' if ok else 'false'}")
        except Exception as e:
            log(f"ACK fallito per {job['job_id']}: {e}")
        log(f"{'✅ stampato' if ok else '❌ fallito'} · ordine {job['order_id'][:8]}")


def main() -> None:
    log("Tierra Print Agent avviato")
    log(f"API        = {API_URL}")
    log(f"Printer    = {PRINTER_IP}:{PRINTER_PORT}")
    log(f"Poll every = {POLL_SECONDS}s")
    log("Premi Ctrl+C per fermare.\n")
    while True:
        try:
            run_once()
        except KeyboardInterrupt:
            log("Arresto agente.")
            sys.exit(0)
        except Exception as e:
            log(f"Errore ciclo: {e}")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
