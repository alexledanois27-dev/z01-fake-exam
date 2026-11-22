#!/usr/bin/env python3
"""Register a user-only desktop shortcut. No sudo, no autostart, no deployment."""
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

def desktop_quote(value):
    if any(char in value for char in '\n\r'):
        raise ValueError('Le chemin du projet contient un retour à la ligne.')
    # Desktop Exec has its own escaping and % field codes; no shell is involved.
    value = value.replace('\\', '\\\\\\\\').replace('"', '\\\\"').replace('`', '\\\\`').replace('$', '\\\\$').replace('%', '%%')
    return '"' + value + '"'

def main():
    if not sys.platform.startswith('linux'):
        raise RuntimeError('Ce raccourci est prévu pour les bureaux Linux, notamment Ubuntu.')
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

if __name__ == '__main__':
    main()
