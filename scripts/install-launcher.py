#!/usr/bin/env python3
"""Register a user-only desktop shortcut. No sudo, no autostart, no deployment."""
import os
from pathlib import Path
import sys
import shlex
import argparse
import plistlib

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
                      'Exec=' + desktop_quote(sys.executable) + ' ' + desktop_quote(str(ROOT / 'scripts/launcher_gui.py')) + '\n'
                      'Icon=' + str(ROOT / 'assets/z01-logo.png') + '\n'
                      'Terminal=false\nCategories=Education;\nStartupNotify=false\n', encoding='utf-8')
    target.chmod(0o755)
    # Plasma pins can hold their own copy instead of rereading applications/.
    cached = target.parent.parent / 'plasma_icons/z01-fake-exam.desktop'
    if cached.is_file():
        previous = cached.read_text(encoding='utf-8')
        owned_paths = [str(ROOT / 'scripts' / name) for name in ('launch.py', 'launcher_gui.py')]
        if 'Name=Z01 Fake Exam\n' in previous and any(path in previous for path in owned_paths):
            cached.write_text(target.read_text(encoding='utf-8'), encoding='utf-8')
            cached.chmod(0o755)
            print('Raccourci épinglé KDE actualisé :', cached)
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
    script = str(ROOT / 'scripts/launcher_gui.py')
    if sys.platform == 'win32':
        target = destination / 'Z01 Fake Exam.vbs'
        python = Path(sys.executable)
        windowed = python.with_name('pythonw.exe')
        executable = str(windowed if windowed.is_file() else python)
        # VBScript doubles string quotes; Run window style 0 hides the console.
        command = '"' + executable + '" "' + script + '"'
        if any(c in command for c in '\r\n'):
            raise ValueError('Chemin invalide.')
        target.write_text('Set shell = CreateObject("WScript.Shell")\n'
                          'shell.Run "' + command.replace('"', '""') + '", 0, False\n', encoding='utf-16')
    elif sys.platform == 'darwin':
        target = destination / 'Z01 Fake Exam.app'
        contents = target / 'Contents'
        binary = contents / 'MacOS/launcher'
        binary.parent.mkdir(parents=True, exist_ok=True)
        # Finder launches an application bundle without opening Terminal.
        binary.write_text('#!/bin/bash\nexec ' + shlex.quote(sys.executable) + ' ' + shlex.quote(script) + '\n')
        binary.chmod(0o755)
        with (contents / 'Info.plist').open('wb') as info:
            plistlib.dump({'CFBundleName': 'Z01 Fake Exam', 'CFBundleIdentifier': 'local.z01.fakeexam.launcher',
                          'CFBundleExecutable': 'launcher', 'CFBundlePackageType': 'APPL',
                          'CFBundleVersion': '1', 'LSUIElement': True}, info)
    else:
        raise RuntimeError('Système non pris en charge.')
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
