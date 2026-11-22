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
            self.assertIn('Terminal=false', content)
            self.assertIn('scripts/launcher_gui.py', content)
            self.assertNotIn('sudo', content)
            self.assertEqual(path.stat().st_mode & 0o777, 0o755)
            if launcher.shutil.which('desktop-file-validate'):
                subprocess.run(['desktop-file-validate', str(path)], check=True)

    def test_plasma_pinned_copy_is_updated_with_application_shortcut(self):
        with tempfile.TemporaryDirectory(prefix='z01 kde ') as directory, patch.dict(os.environ, {'XDG_DATA_HOME': directory}):
            cached = Path(directory) / 'plasma_icons/z01-fake-exam.desktop'
            cached.parent.mkdir()
            cached.write_text('Name=Z01 Fake Exam\nExec="' + str(installer.ROOT / 'scripts/launch.py') + '"\nTerminal=true\n')
            installer.main()
            content = cached.read_text()
            self.assertIn('launcher_gui.py', content)
            self.assertIn('Terminal=false', content)
            self.assertNotIn('Terminal=true', content)
            self.assertEqual(content, (Path(directory) / 'applications/z01-fake-exam.desktop').read_text())

    def test_plasma_copy_for_another_checkout_is_not_overwritten(self):
        with tempfile.TemporaryDirectory(prefix='z01 kde ') as directory, patch.dict(os.environ, {'XDG_DATA_HOME': directory}):
            cached = Path(directory) / 'plasma_icons/z01-fake-exam.desktop'
            cached.parent.mkdir()
            content = 'Name=Z01 Fake Exam\nExec=/another/project/scripts/launch.py\n'
            cached.write_text(content)
            installer.main()
            self.assertEqual(cached.read_text(), content)

    def test_exec_quoting_preserves_special_paths(self):
        self.assertEqual(installer.desktop_quote('/tmp/a b'), '"/tmp/a b"')
        self.assertIn('%%', installer.desktop_quote('/tmp/100%'))
        self.assertIn('\\\\$', installer.desktop_quote('/tmp/$HOME'))
        with self.assertRaises(ValueError):
            installer.desktop_quote('/tmp/bad\npath')


class PortableLauncherTests(unittest.TestCase):
    def test_browser_dispatch_for_mac_and_windows(self):
        with patch.dict(os.environ, {'Z01_NO_BROWSER': '0'}):
            with patch.object(launcher.sys, 'platform', 'darwin'), patch.object(launcher.subprocess, 'Popen') as spawn:
                launcher.open_site('http://127.0.0.1:8092')
                self.assertEqual(spawn.call_args.args[0], ['open', 'http://127.0.0.1:8092'])
            with patch.object(launcher.sys, 'platform', 'win32'), patch.object(launcher.webbrowser, 'open', return_value=True) as browser:
                launcher.open_site('http://127.0.0.1:8092')
                browser.assert_called_once_with('http://127.0.0.1:8092', new=2)

    def test_windows_group_and_break_event(self):
        with patch.object(launcher.sys, 'platform', 'win32'), patch.object(launcher.subprocess, 'CREATE_NEW_PROCESS_GROUP', 512, create=True), patch.object(launcher.signal, 'CTRL_BREAK_EVENT', 1, create=True):
            self.assertEqual(launcher.process_options(), {'creationflags': 512})
            process = MagicMock(pid=7123)
            process.poll.return_value = None
            launcher.stop_process(process)
            process.send_signal.assert_called_once_with(1)
            process.wait.assert_called_once_with(timeout=3)

    def test_windows_forced_cleanup_is_only_owned_tree(self):
        with patch.object(launcher.sys, 'platform', 'win32'), patch.object(launcher.signal, 'CTRL_BREAK_EVENT', 1, create=True), patch.object(launcher.subprocess, 'run') as run:
            process = MagicMock(pid=7123)
            process.poll.return_value = None
            process.wait.side_effect = [subprocess.TimeoutExpired('go', 3), 0]
            launcher.stop_process(process)
            self.assertEqual(run.call_args.args[0], ['taskkill', '/PID', '7123', '/T', '/F'])
            self.assertNotIn('/IM', run.call_args.args[0])

    def test_mac_and_windows_shortcuts_use_quoted_python_and_script(self):
        import plistlib
        for platform, suffix in [('darwin', '.app'), ('win32', '.vbs')]:
            with self.subTest(platform=platform), tempfile.TemporaryDirectory(prefix='z01 shortcut ') as directory, patch.object(installer.sys, 'platform', platform):
                target = installer.main(directory)
                self.assertEqual(target.suffix, suffix)
                if platform == 'darwin':
                    executable = target / 'Contents/MacOS/launcher'
                    content = executable.read_text()
                    self.assertEqual(executable.stat().st_mode & 0o777, 0o755)
                    subprocess.run(['bash', '-n', str(executable)], check=True)
                    with (target / 'Contents/Info.plist').open('rb') as info:
                        self.assertEqual(plistlib.load(info)['CFBundleExecutable'], 'launcher')
                else:
                    content = target.read_text(encoding='utf-16')
                    self.assertIn('0, False', content)
                    self.assertIn('WScript.Shell', content)
                self.assertIn(str(installer.ROOT / 'scripts/launcher_gui.py'), content)
                self.assertIn(installer.sys.executable, content)
                self.assertNotIn('sudo', content)

    def test_windows_paths_escape_percent_and_reject_line_breaks(self):
        self.assertEqual(installer.batch_quote('C:\\A B\\100%\\python.exe'), '"C:\\A B\\100%%\\python.exe"')
        for bad in ['bad\npath', 'bad"path', 'bad\rpath']:
            with self.assertRaises(ValueError):
                installer.batch_quote(bad)

    def test_finished_process_is_never_killed(self):
        process = MagicMock()
        process.poll.return_value = 0
        with patch.object(launcher.os, 'killpg') as kill, patch.object(launcher.subprocess, 'run') as run:
            launcher.stop_process(process)
            kill.assert_not_called()
            run.assert_not_called()

if __name__ == '__main__':
    unittest.main()
