"""Configuration checks, no Docker daemon or real credentials needed.
Run: python3 tests/compose-config.test.py (Docker Compose CLI required).
"""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parent.parent

class ComposeConfigTests(unittest.TestCase):
    def resolve(self, **changes):
        env = {k: v for k, v in os.environ.items() if k not in {
            'EXAM_DOMAIN', 'ACCESS_USERNAME', 'ACCESS_PASSWORD', 'RUNNER_UID',
            'RUNNER_GID', 'RUNNER_DOCKER_SOCKET', 'RUNNER_WORK_DIR', 'APP_PORT',
            'CATALOG_MODE', 'COMPOSE_FILE', 'COMPOSE_ENV_FILES', 'COMPOSE_PROFILES',
        }}
        env.update(EXAM_DOMAIN='exam.invalid', ACCESS_USERNAME='tester',
                   ACCESS_PASSWORD='validation-only-password', RUNNER_UID='1001',
                   RUNNER_GID='1001', RUNNER_DOCKER_SOCKET='/run/user/1001/docker.sock',
                   RUNNER_WORK_DIR='/var/lib/z01-corrections')
        env.update(changes)
        return subprocess.run(['docker', 'compose', '--env-file', '/dev/null',
                               '--profile', 'https', 'config', '--format', 'json'],
                              cwd=ROOT, env=env, capture_output=True, text=True)

    def test_limits_mounts_and_exposure(self):
        result = self.resolve()
        self.assertEqual(result.returncode, 0, result.stderr)
        services = json.loads(result.stdout)['services']
        app, proxy = services['app'], services['https']
        self.assertEqual(app['user'], '1001:1001')
        self.assertEqual(app['environment']['APP_ENV'], 'production')
        self.assertEqual(app['environment']['CATALOG_MODE'], 'offline')
        self.assertEqual(app['environment']['DOCKER_HOST'], 'unix:///run/correction-docker.sock')
        self.assertTrue(all(p['host_ip'] == '127.0.0.1' for p in app['ports']))
        for service in (app, proxy):
            self.assertTrue(service['read_only'])
            self.assertIn('ALL', service['cap_drop'])
            self.assertIn('no-new-privileges:true', service['security_opt'])
            self.assertNotIn(str(service['mem_limit']), ('0', '', '-1'))
            self.assertEqual(service['memswap_limit'], service['mem_limit'])
            self.assertGreater(service['pids_limit'], 0)
            self.assertFalse(service.get('privileged', False))
        mounts = {v['target']: v for v in app['volumes']}
        work = mounts['/var/lib/z01-corrections']
        self.assertEqual(work['source'], work['target'])
        self.assertFalse(work['bind'].get('create_host_path', False))
        self.assertEqual(mounts['/run/correction-docker.sock']['source'], '/run/user/1001/docker.sock')
        self.assertFalse(any('sock' in v['target'] for v in proxy['volumes']))
        self.assertEqual(proxy['profiles'], ['https'])

    def test_missing_password_or_paths_fail_closed(self):
        for key in ('ACCESS_PASSWORD', 'RUNNER_DOCKER_SOCKET', 'RUNNER_WORK_DIR', 'RUNNER_UID'):
            with self.subTest(key=key):
                self.assertNotEqual(self.resolve(**{key: ''}).returncode, 0)

    def test_custom_work_path_is_identical_on_both_sides(self):
        app = json.loads(self.resolve(RUNNER_WORK_DIR='/srv/z01-corrections').stdout)['services']['app']
        self.assertEqual(app['environment']['TMPDIR'], '/srv/z01-corrections')
        self.assertTrue(any(v['source'] == v['target'] == '/srv/z01-corrections' for v in app['volumes']))

if __name__ == '__main__':
    unittest.main()
