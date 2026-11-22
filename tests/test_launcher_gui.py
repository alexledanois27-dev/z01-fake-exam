"""Exercise the real loopback HTTP boundary and read-only update policy."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import threading
import unittest
from unittest.mock import MagicMock, patch
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
import launcher_gui as gui


class UpdateTests(unittest.TestCase):
    def test_update_directions_and_dirty_checkout(self):
        for upstream, expected in [('ahead', 'available'), ('identical', 'current'),
                                   ('behind', 'development'), ('diverged', 'diverged')]:
            with self.subTest(status=upstream), patch.object(gui, 'git_read', side_effect=['a' * 40, 'main', ' M README.md']) as git, patch.object(gui, 'github_json', return_value={'status': upstream}) as remote:
                result = gui.check_updates()
                self.assertEqual(result['state'], expected)
                self.assertTrue(result['dirty'])
                self.assertIn('Modifications locales', result['message'])
                self.assertEqual(remote.call_args.args[0], '/compare/' + 'a' * 40 + '...main?per_page=1')
                self.assertEqual([call.args for call in git.call_args_list],
                                 [('rev-parse', 'HEAD'), ('branch', '--show-current'), ('status', '--porcelain')])

    def test_invalid_local_reference_never_enters_url(self):
        with patch.object(gui, 'git_read', return_value='../../elsewhere'), patch.object(gui, 'github_json') as remote:
            with self.assertRaises(RuntimeError):
                gui.check_updates()
            remote.assert_not_called()

    def test_git_commands_are_read_only_and_bounded(self):
        with patch.object(gui.subprocess, 'run', return_value=MagicMock(returncode=0, stdout='main\n')) as run:
            self.assertEqual(gui.git_read('branch', '--show-current'), 'main')
            self.assertEqual(run.call_args.args[0][:2], ['git', '--no-optional-locks'])
            self.assertEqual(run.call_args.kwargs['timeout'], 15)
            self.assertNotIn('shell', run.call_args.kwargs)

    def test_failed_network_does_not_stop_server(self):
        app = gui.Supervisor()
        event = threading.Event()
        class Immediate:
            def __init__(self, target, **kwargs): self.target = target
            def start(self): self.target(); event.set()
        with patch.object(gui, 'check_updates', side_effect=OSError('offline')), patch.object(gui.threading, 'Thread', Immediate), patch.object(app, 'stop') as stop:
            app.refresh_updates()
            self.assertTrue(event.is_set())
            self.assertEqual(app.update['state'], 'unavailable')
            self.assertFalse(app.checking)
            stop.assert_not_called()


class BoundaryTests(unittest.TestCase):
    def setUp(self):
        self.app = MagicMock()
        self.app.state.return_value = {'ready': True, 'log': '<script>no execution</script>'}
        self.server = gui.LauncherServer(self.app)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(2)

    def request(self, path, method='GET', auth=True, origin=None, host=None, data=None):
        headers = {}
        if auth: headers['Authorization'] = 'Bearer ' + self.server.token
        if origin: headers['Origin'] = origin
        if host: headers['Host'] = host
        request = urllib.request.Request(self.server.origin + path, method=method, headers=headers, data=data)
        try:
            response = urllib.request.urlopen(request, timeout=3)
            return response.status, response.headers, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.headers, error.read()

    def test_real_state_is_authenticated(self):
        self.assertEqual(self.request('/api/state', auth=False)[0], 403)
        code, headers, body = self.request('/api/state')
        self.assertEqual(code, 200)
        self.assertTrue(json.loads(body)['ready'])
        self.assertEqual(headers['Cache-Control'], 'no-store')

    def test_remote_pages_and_dns_rebinding_cannot_control_server(self):
        for args in [{'auth': False}, {'origin': 'https://evil.example'}, {'host': 'evil.example'}]:
            self.assertEqual(self.request('/api/start', 'POST', **args)[0], 403)
        self.app.start.assert_not_called()
        self.assertEqual(self.request('/api/start', 'POST', origin=self.server.origin)[0], 202)
        self.app.start.assert_called_once()

    def test_only_fixed_actions_no_arbitrary_commands_or_files(self):
        self.assertEqual(self.request('/api/start', 'POST', data=b'command=bad')[0], 400)
        self.assertEqual(self.request('/api/execute', 'POST')[0], 404)
        self.assertEqual(self.request('/../launch.py')[0], 404)
        self.app.start.assert_not_called()

    def test_public_assets_cannot_disclose_token_or_run_inline_code(self):
        code, headers, body = self.request('/', auth=False)
        self.assertEqual(code, 200)
        self.assertNotIn(self.server.token.encode(), body)
        self.assertIn("frame-ancestors 'none'", headers['Content-Security-Policy'])
        self.assertNotIn('unsafe-inline', headers['Content-Security-Policy'])
        self.assertIn(b'/launcher.js', body)
        self.assertEqual(self.request('/launcher.js', auth=False)[0], 200)
        self.assertEqual(self.request('/api/state', origin='https://evil.example')[0], 403)

    def test_stopping_never_claims_existing_instance(self):
        app = gui.Supervisor()
        with patch.object(gui.launch, 'probe', return_value=True), patch.object(gui.subprocess, 'Popen') as spawn, patch.object(gui.launch, 'stop_process') as stop:
            app._start()
            app.stop()
            spawn.assert_not_called()
            stop.assert_not_called()
            self.assertIsNone(app.process)


if __name__ == '__main__':
    unittest.main()
