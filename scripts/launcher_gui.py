#!/usr/bin/env python3
"""Loopback-only graphical supervisor. No third-party Python packages required."""
import hmac
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import urllib.request

import launch

ROOT = Path(__file__).resolve().parent.parent
REPOSITORY = 'https://github.com/alexledanois27-dev/z01-fake-exam'
API = 'https://api.github.com/repos/alexledanois27-dev/z01-fake-exam'


def git_read(*args):
    # Optional locks disabled: checking a version never changes the checkout.
    result = subprocess.run(['git', '--no-optional-locks', '-C', str(ROOT), *args],
                            capture_output=True, text=True, timeout=15)
    if result.returncode:
        raise RuntimeError('Version locale Git indisponible (archive ZIP ou Git absent).')
    return result.stdout.strip()


def github_json(path):
    request = urllib.request.Request(API + path, headers={
        'Accept': 'application/vnd.github+json', 'User-Agent': 'Z01-Fake-Exam-Launcher'})
    with urllib.request.urlopen(request, timeout=8) as response:
        payload = response.read(256 * 1024 + 1)
    if len(payload) > 256 * 1024:
        raise RuntimeError('Réponse GitHub trop volumineuse.')
    return json.loads(payload)


def check_updates():
    """Read-only comparison against the owner's main, never origin or arbitrary URLs."""
    head = git_read('rev-parse', 'HEAD')
    if len(head) != 40 or any(c not in '0123456789abcdef' for c in head):
        raise RuntimeError('Référence locale invalide.')
    branch = git_read('branch', '--show-current') or 'version détachée'
    dirty = bool(git_read('status', '--porcelain'))
    # per_page keeps large comparisons bounded; no remote content is executed.
    comparison = github_json('/compare/' + head + '...main?per_page=1')
    status = comparison.get('status')
    messages = {
        'identical': ('current', 'À jour avec main.'),
        'ahead': ('available', 'Une mise à jour est disponible sur main.'),
        'behind': ('development', 'Cette version locale contient des commits supplémentaires à main.'),
        'diverged': ('diverged', 'La version locale et main ont évolué séparément. Mise à jour manuelle nécessaire.'),
    }
    if status not in messages:
        raise RuntimeError('Comparaison GitHub non reconnue.')
    state, message = messages[status]
    if dirty:
        message += ' Modifications locales présentes : les conserver avant toute mise à jour.'
    return {'state': state, 'message': message, 'version': head[:7], 'branch': branch,
            'dirty': dirty, 'url': REPOSITORY + '/commits/main/'}


def app_browser(url):
    """Use installed Chrome/Edge app mode, fall back to the system browser."""
    candidates = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']
    if sys.platform == 'win32':
        candidates = [str(Path(os.environ.get(root, '')) / suffix)
                      for root in ['ProgramFiles', 'ProgramFiles(x86)', 'LOCALAPPDATA']
                      for suffix in ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe']]
    elif sys.platform == 'darwin':
        candidates = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    for candidate in candidates:
        executable = shutil.which(candidate)
        if executable:
            try:
                subprocess.Popen([executable, '--app=' + url], stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL)
                return
            except OSError:
                continue
    launch.open_site(url)


class Supervisor:
    def __init__(self):
        port = os.environ.get('PORT', '8092')
        if not port.isdecimal() or not 1024 <= int(port) <= 65535:
            raise RuntimeError('PORT doit être compris entre 1024 et 65535.')
        self.url = 'http://127.0.0.1:' + port
        self.process = None
        self.lock = threading.Lock()
        self.starting = False
        self.closing = False
        self.message = 'Prêt à démarrer.'
        self.update = {'state': 'checking', 'message': 'Vérification des mises à jour…'}
        self.checking = False
        self.logfile = ROOT / '.local-runner/launcher.log'

    def start(self):
        with self.lock:
            if self.closing or self.starting or (self.process and self.process.poll() is None):
                return
            self.starting = True
            self.message = 'Démarrage du serveur…'
        threading.Thread(target=self._start, daemon=True).start()

    def _start(self):
        try:
            if launch.probe(self.url):
                self.message = 'Une instance est déjà ouverte. Elle reste indépendante de ce lanceur.'
                return
            self.logfile.parent.mkdir(parents=True, exist_ok=True)
            env = dict(os.environ, Z01_NO_BROWSER='1', PYTHONUNBUFFERED='1')
            with self.lock:
                if self.closing:
                    return
                with self.logfile.open('w', encoding='utf-8') as log:
                    self.process = subprocess.Popen([sys.executable, str(ROOT / 'scripts/launch.py')],
                        cwd=ROOT, env=env, stdin=subprocess.DEVNULL, stdout=log,
                        stderr=subprocess.STDOUT, **launch.process_options())
            deadline = time.monotonic() + 95
            while not self.closing and self.process.poll() is None and time.monotonic() < deadline:
                if launch.probe(self.url):
                    self.message = 'Le site est prêt. Bonne session !'
                    return
                time.sleep(.4)
            if not self.closing:
                self.message = 'Le serveur n’a pas démarré. Consulte les détails ci-dessous.'
                if self.process.poll() is None:
                    launch.stop_process(self.process)
        except (OSError, RuntimeError, subprocess.SubprocessError) as error:
            self.message = str(error)
        finally:
            self.starting = False

    def stop(self):
        # The process handle only ever refers to our own child, never a PID from a port.
        with self.lock:
            process = self.process
            if process:
                try:
                    launch.stop_process(process)
                except ProcessLookupError:
                    pass  # It exited between poll and the stop signal.
                self.message = 'Serveur arrêté.'

    def refresh_updates(self):
        with self.lock:
            if self.checking or self.closing:
                return
            self.checking = True
            self.update = {'state': 'checking', 'message': 'Vérification des mises à jour…'}
        def worker():
            try:
                self.update = check_updates()
            except (OSError, RuntimeError, ValueError, subprocess.SubprocessError):
                self.update = {'state': 'unavailable', 'message':
                    'Vérification indisponible : connexion, limite GitHub ou version locale non publiée. Le site reste utilisable.',
                    'url': REPOSITORY}
            finally:
                self.checking = False
        threading.Thread(target=worker, daemon=True).start()

    def state(self):
        ready = launch.probe(self.url)
        owned = bool(self.process and self.process.poll() is None)
        details = ''
        if self.process and self.logfile.exists():
            with self.logfile.open('rb') as log:
                log.seek(0, 2)
                log.seek(max(0, log.tell() - 16000))
                details = log.read().decode('utf-8', errors='replace')
        return {'ready': ready, 'owned': owned, 'starting': self.starting,
                'message': self.message, 'url': self.url, 'log': details, 'update': self.update}


class LauncherServer(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self, supervisor):
        super().__init__(('127.0.0.1', 0), Handler)
        self.supervisor = supervisor
        self.token = secrets.token_urlsafe(32)
        self.origin = 'http://127.0.0.1:' + str(self.server_port)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def send(self, code, content, mime='application/json; charset=utf-8'):
        body = content.encode('utf-8')
        self.send_response(code)
        for key, value in {'Content-Type': mime, 'Content-Length': str(len(body)),
                           'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
                           'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
                           'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}.items():
            self.send_header(key, value)
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def authorized(self):
        if self.headers.get('Host') != urlsplit(self.server.origin).netloc:
            return False
        origin = self.headers.get('Origin')
        return (not origin or origin == self.server.origin) and hmac.compare_digest(
            self.headers.get('Authorization', ''), 'Bearer ' + self.server.token)

    def do_GET(self):
        if self.headers.get('Host') != urlsplit(self.server.origin).netloc:
            return self.send(403, '{}')
        files = {'/': ('index.html', 'text/html; charset=utf-8'),
                 '/launcher.css': ('launcher.css', 'text/css; charset=utf-8'),
                 '/launcher.js': ('launcher.js', 'application/javascript; charset=utf-8')}
        if self.path in files:
            filename, mime = files[self.path]
            return self.send(200, (ROOT / 'scripts/launcher-ui' / filename).read_text(), mime)
        if self.path == '/api/state':
            if not self.authorized():
                return self.send(403, '{}')
            return self.send(200, json.dumps(self.server.supervisor.state()))
        self.send(404, '{}')

    def do_POST(self):
        if not self.authorized():
            return self.send(403, '{}')
        # Actions accept no arbitrary arguments, paths, commands or destinations.
        if self.headers.get('Content-Length', '0') != '0' or self.headers.get('Transfer-Encoding'):
            return self.send(400, '{}')
        app = self.server.supervisor
        if self.path == '/api/start':
            app.start()
        elif self.path == '/api/stop':
            threading.Thread(target=app.stop, daemon=True).start()
        elif self.path == '/api/check-update':
            app.refresh_updates()
        elif self.path == '/api/quit':
            app.closing = True
            def quit_launcher():
                try:
                    app.stop()
                finally:
                    self.server.shutdown()
            threading.Thread(target=quit_launcher, daemon=True).start()
        else:
            return self.send(404, '{}')
        self.send(202, '{}')


def main():
    app = Supervisor()
    server = LauncherServer(app)
    app.refresh_updates()
    app.start()
    def terminate(_signal, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, terminate)
    if hasattr(signal, 'SIGHUP'):
        signal.signal(signal.SIGHUP, terminate)
    try:
        if os.environ.get('Z01_LAUNCHER_PREVIEW') == '1':
            # Test harness only: normal shortcuts never write a token file.
            Path(os.environ['Z01_LAUNCHER_URL_FILE']).write_text(server.origin + '/#' + server.token)
        else:
            app_browser(server.origin + '/#' + server.token)
        server.serve_forever(poll_interval=.25)
    except KeyboardInterrupt:
        pass
    finally:
        app.closing = True
        app.stop()
        server.server_close()


if __name__ == '__main__':
    main()
