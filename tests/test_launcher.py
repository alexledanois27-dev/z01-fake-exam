"""Launcher lifecycle tests; no browser or real server is started here."""
import importlib.util
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import unittest
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).resolve().parent.parent

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

launcher = load('z01_launcher', 'scripts/launch.py')
installer = load('z01_installer', 'scripts/install-launcher.py')

class LauncherTests(unittest.TestCase):
    def test_existing_instance_only_opens_browser(self):
        with patch.dict(os.environ, {'PORT': '8092'}), patch.object(launcher, 'probe', return_value=True), patch.object(launcher, 'open_site') as open_site, patch.object(launcher.subprocess, 'Popen') as spawn:
            launcher.main()
            open_site.assert_called_once_with('http://127.0.0.1:8092')
            spawn.assert_not_called()

    def test_other_service_is_never_stopped(self):
        socket = MagicMock()
        socket.__enter__.return_value.connect_ex.return_value = 0
        with patch.dict(os.environ, {'PORT': '8092'}), patch.object(launcher, 'probe', return_value=False), patch.object(launcher.socket, 'socket', return_value=socket), patch.object(launcher.subprocess, 'Popen') as spawn:
            with self.assertRaisesRegex(RuntimeError, 'occupé'):
                launcher.main()
            spawn.assert_not_called()

    def test_invalid_port_does_not_spawn(self):
        for port in ['0', '80', '65536', '8092;echo x', 'abc']:
            with self.subTest(port=port), patch.dict(os.environ, {'PORT': port}), patch.object(launcher.subprocess, 'Popen') as spawn:
                with self.assertRaises(RuntimeError):
                    launcher.main()
                spawn.assert_not_called()

    def test_startup_failure_cleans_only_its_process_group(self):
        socket = MagicMock()
        socket.__enter__.return_value.connect_ex.return_value = 1
        child = MagicMock(pid=12345)
        child.poll.return_value = None
        with patch.dict(os.environ, {'PORT': '8092', 'GO_BIN': '/known/go'}), patch.object(launcher, 'probe', return_value=False), patch.object(launcher.socket, 'socket', return_value=socket), patch.object(launcher.shutil, 'which', return_value=None), patch.object(launcher.time, 'monotonic', side_effect=[0, 91]), patch.object(launcher.subprocess, 'Popen', return_value=child) as spawn, patch.object(launcher.os, 'killpg') as stop:
            with self.assertRaisesRegex(RuntimeError, '90 secondes'):
                launcher.main()
            self.assertTrue(spawn.call_args.kwargs['start_new_session'])
            self.assertEqual(spawn.call_args.args[0][0], '/known/go')
            self.assertEqual(spawn.call_args.kwargs['env']['LISTEN_ADDR'], '127.0.0.1:8092')
            stop.assert_called_once_with(12345, signal.SIGTERM)

    def test_install_is_user_scoped_and_desktop_syntax_valid(self):
        with tempfile.TemporaryDirectory(prefix='z01 launcher ') as directory, patch.dict(os.environ, {'XDG_DATA_HOME': directory}):
            installer.main()
            path = Path(directory) / 'applications/z01-fake-exam.desktop'
            content = path.read_text()
            self.assertIn('Terminal=true', content)
            self.assertIn('scripts/launch.py', content)
            self.assertNotIn('sudo', content)
            self.assertEqual(path.stat().st_mode & 0o777, 0o755)
            if launcher.shutil.which('desktop-file-validate'):
                subprocess.run(['desktop-file-validate', str(path)], check=True)

    def test_exec_quoting_preserves_special_paths(self):
        self.assertEqual(installer.desktop_quote('/tmp/a b'), '"/tmp/a b"')
        self.assertIn('%%', installer.desktop_quote('/tmp/100%'))
        self.assertIn('\\\\$', installer.desktop_quote('/tmp/$HOME'))
        with self.assertRaises(ValueError):
            installer.desktop_quote('/tmp/bad\npath')

if __name__ == '__main__':
    unittest.main()
