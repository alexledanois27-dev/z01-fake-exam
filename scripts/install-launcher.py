#!/usr/bin/env python3
"""Register a user-only desktop shortcut. No sudo, no autostart, no deployment."""
import os
from pathlib import Path
import sys
import shlex
import argparse

ROOT = Path(__file__).resolve().parent.parent

def desktop_quote(value):
    if any(char in value for char in '\n\r'):
        raise ValueError('Le chemin du projet contient un retour à la ligne.')
    # Desktop Exec has its own escaping and % field codes; no shell is involved.
    value = value.replace('\\', '\\\\\\\\').replace('"', '\\\\"').replace('`', '\\\\`').replace('$', '\\\\$').replace('%', '%%')
    return '"' + value + '"'

def install_linux():
    target = Path(os.environ.get('XDG_DATA_HOME', str(Path.home() / '.local/share'))) / 'applications/z01-fake-exam.desktop'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text('[Desktop Entry]\nType=Application\nName=Z01 Fake Exam\n'
                      'Comment=Apprendre et préparer les checkpoints\n'
                      'Exec=' + desktop_quote(sys.executable) + ' ' + desktop_quote(str(ROOT / 'scripts/launch.py')) + '\n'
                      'Icon=' + str(ROOT / 'assets/z01-logo.png') + '\n'
                      'Terminal=true\nCategories=Education;\nStartupNotify=false\n', encoding='utf-8')
    target.chmod(0o755)
    print('Lanceur installé :', target)
    print('Cherche « Z01 Fake Exam » dans les applications Ubuntu. Tu peux l’épingler aux favoris.')
    print('Après déplacement du dossier, relance cet installateur. Pour retirer le raccourci, supprime ce fichier .desktop.')


def batch_quote(value):
    if any(char in value for char in '\n\r"'):
        raise ValueError('Chemin Windows non représentable dans un raccourci batch.')
    return '"' + value.replace('%', '%%') + '"'


def desktop_dir():
    # A destination can be supplied explicitly for redirected or managed desktops.
    cloud = os.environ.get('OneDrive')
    if sys.platform == 'win32' and cloud and (Path(cloud) / 'Desktop').is_dir():
        return Path(cloud) / 'Desktop'
    return Path.home() / 'Desktop'


def install_portable(destination):
    destination.mkdir(parents=True, exist_ok=True)
    script = str(ROOT / 'scripts/launch.py')
    if sys.platform == 'win32':
        target = destination / 'Z01 Fake Exam.cmd'
        content = '@echo off\r\nsetlocal\r\n' + batch_quote(sys.executable) + ' ' + batch_quote(script) + '\r\nif errorlevel 1 pause\r\n'
    elif sys.platform == 'darwin':
        target = destination / 'Z01 Fake Exam.command'
        content = '#!/bin/bash\nexec ' + shlex.quote(sys.executable) + ' ' + shlex.quote(script) + '\n'
    else:
        raise RuntimeError('Système non pris en charge.')
    target.write_bytes(content.encode('utf-8'))
    if sys.platform != 'win32':
        target.chmod(0o755)
    print('Raccourci créé :', target)
    print('Double-clique ce fichier pour lancer le site. Go, Python 3 et Docker restent nécessaires.')
    return target


def main(destination=None):
    if sys.platform.startswith('linux'):
        return install_linux()
    return install_portable(Path(destination) if destination else desktop_dir())


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Créer un raccourci Z01 Fake Exam pour ce système.')
    parser.add_argument('--destination', type=Path, help='Dossier du raccourci Windows/macOS (Bureau par défaut).')
    main(parser.parse_args().destination)
