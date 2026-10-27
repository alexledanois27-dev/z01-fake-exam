#!/usr/bin/env python3
"""Export the statements already loaded by a local Exam Studio catalogue."""
import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8080')
    parser.add_argument('--track', choices=['go', 'js', 'rust', 'java'], default='go')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    endpoint = args.base_url.rstrip('/') + '/api/exercises?track=' + args.track
    with urlopen(endpoint, timeout=30) as response:
        exercises = json.load(response)
    if not isinstance(exercises, list):
        raise SystemExit('Le catalogue ne renvoie pas une liste.')
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = {'track': args.track, 'catalogue': endpoint,
                'exportedAt': datetime.now(timezone.utc).isoformat(), 'exercises': []}
    for exercise in exercises:
        identifier = exercise.get('id', '')
        statement = exercise.get('statement', '')
        if not re.fullmatch(r'[A-Za-z0-9_-]+', identifier):
            raise SystemExit(f'Identifiant de fichier invalide : {identifier!r}')
        if not isinstance(statement, str):
            raise SystemExit(f'Énoncé invalide : {identifier}')
        filename = identifier + '.md'
        (args.output / filename).write_text(statement, encoding='utf-8')
        manifest['exercises'].append({'id': identifier, 'title': exercise.get('title', identifier),
                                      'file': filename, 'sha256': hashlib.sha256(statement.encode()).hexdigest()})
    (args.output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (args.output / 'ORIGINE.txt').write_text(
        'Énoncés exportés depuis le catalogue de la copie locale de Z01EXAM / Exam Studio.\n'
        'Les énoncés Go, Rust et Java proviennent du catalogue Zone01 et de son API de contenu.\n'
        'Origine des contenus : https://zone01normandie.org/ et contenus pédagogiques 01-edu.\n'
        'Cet export conserve les textes tels que chargés ; il ne contient pas les moulinettes.\n'
        'Les contenus conservent leurs auteurs et conditions respectives.\n', encoding='utf-8')
    print(f'{len(manifest["exercises"])} énoncés {args.track} exportés vers {args.output}')


if __name__ == '__main__':
    main()
