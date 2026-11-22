#!/usr/bin/env python3
"""Local Ubuntu launcher: same Go entrypoint as make start, no shell execution."""
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent


def probe(url):
    try:
        with urllib.request.urlopen(url + '/api/version', timeout=1) as response:
            return json.load(response).get('application') == 'z01-fake-exam'
    except (OSError, ValueError, urllib.error.URLError):
        return False


def open_site(url):
    if os.environ.get('Z01_NO_BROWSER') == '1':
        return
    opener = shutil.which('xdg-open')
    if opener:
        subprocess.Popen([opener, url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        print('Ouvre cette adresse dans ton navigateur :', url, flush=True)


def main():
    port = os.environ.get('PORT', '8092')
    if not port.isdecimal() or not 1024 <= int(port) <= 65535:
        raise RuntimeError('PORT doit être compris entre 1024 et 65535.')
    url = 'http://127.0.0.1:' + port
    if probe(url):
        print('Le fake exam est déjà lancé :', url, flush=True)
        open_site(url)
        return
    # Never stop an unrelated process or silently select another browser-storage port.
    with socket.socket() as connection:
        if connection.connect_ex(('127.0.0.1', int(port))) == 0:
            raise RuntimeError(f'Le port {port} est occupé par un autre service. Choisis PORT ou ferme ce service.')
    go = os.environ.get('GO_BIN') or shutil.which('go')
    if not go and Path('/usr/local/go/bin/go').is_file():
        go = '/usr/local/go/bin/go'
    if not go:
        raise RuntimeError('Go est introuvable. Installer Go ou définir GO_BIN.')
    docker = shutil.which('docker')
    try:
        docker_ready = bool(docker) and subprocess.run(
            [docker, 'info'], stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL, timeout=15).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        docker_ready = False
    if not docker_ready:
        print('Docker est indisponible : les cours restent lisibles, mais la correction nécessite Docker démarré.', flush=True)
    environment = os.environ.copy()
    environment['PORT'] = port
    environment['LISTEN_ADDR'] = '127.0.0.1:' + port
    print('Démarrage du fake exam… Fermer ce terminal ou Ctrl+C arrête cette instance.', flush=True)
    process = subprocess.Popen([go, '-C', str(ROOT / 'backend'), 'run', './cmd/dev'],
                               cwd=ROOT, env=environment, start_new_session=True)
    def terminate(_signal, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, terminate)
    signal.signal(signal.SIGHUP, terminate)
    try:
        deadline = time.monotonic() + 90
        while process.poll() is None and time.monotonic() < deadline:
            if probe(url):
                print('Prêt :', url, flush=True)
                open_site(url)
                return process.wait()
            time.sleep(.25)
        if process.poll() is not None:
            raise RuntimeError('Le serveur s’est arrêté. Consulter le message ci-dessus.')
        raise RuntimeError('Le démarrage dépasse 90 secondes. Vérifier Go et la connexion réseau.')
    finally:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()


if __name__ == '__main__':
    try:
        sys.exit(main() or 0)
    except KeyboardInterrupt:
        print('\nFake exam arrêté.')
    except (RuntimeError, OSError, subprocess.TimeoutExpired) as error:
        print('Démarrage impossible :', error, file=sys.stderr)
        if sys.stdin.isatty():
            input('Entrée pour fermer…')
        sys.exit(1)
