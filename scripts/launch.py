#!/usr/bin/env python3
"""Local cross-platform launcher: same Go entrypoint as make start, no shell execution."""
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
import webbrowser

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
    if sys.platform == 'darwin':
        subprocess.Popen(['open', url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    elif sys.platform == 'win32':
        if not webbrowser.open(url, new=2):
            print('Ouvre cette adresse dans ton navigateur :', url, flush=True)
    else:
        opener = shutil.which('xdg-open')
        if opener:
            subprocess.Popen([opener, url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            print('Ouvre cette adresse dans ton navigateur :', url, flush=True)


def find_go():
    explicit = os.environ.get('GO_BIN')
    if explicit:
        return explicit
    found = shutil.which('go')
    if found:
        return found
    if sys.platform == 'win32':
        candidates = [Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'Go/bin/go.exe',
                      Path.home() / 'go/bin/go.exe']
    else:
        candidates = [Path('/usr/local/go/bin/go'), Path('/opt/homebrew/bin/go'), Path('/usr/local/bin/go')]
    return next((str(path) for path in candidates if path.is_file()), None)


def process_options():
    if sys.platform == 'win32':
        return {'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP}
    return {'start_new_session': True}


def stop_process(process):
    if process.poll() is not None:
        return
    if sys.platform == 'win32':
        # CTRL_BREAK reaches the group created for go run and its server child.
        try:
            process.send_signal(signal.CTRL_BREAK_EVENT)
            process.wait(timeout=3)
            return
        except (OSError, subprocess.TimeoutExpired):
            # Only the launcher-owned process tree, never a process found on a port.
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
            process.wait(timeout=5)
    else:
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()


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
    go = find_go()
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
    print('Démarrage du fake exam… Ctrl+C arrête cette instance.', flush=True)
    process = subprocess.Popen([go, '-C', str(ROOT / 'backend'), 'run', './cmd/dev'],
                               cwd=ROOT, env=environment, **process_options())
    def terminate(_signal, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, terminate)
    if hasattr(signal, "SIGHUP"):
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
        stop_process(process)


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
