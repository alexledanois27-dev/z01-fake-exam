#!/usr/bin/env python3
"""Read Compose's resolved configuration without displaying its secrets."""
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent

def fail(message):
    raise SystemExit("Préparation Compose refusée : " + message)

def docker_json(*args):
    result = subprocess.run(["docker", *args], cwd=ROOT, capture_output=True, text=True)
    if result.returncode:
        fail("commande Docker impossible ; vérifier la configuration, les accès et le daemon (aucun secret affiché).")
    return json.loads(result.stdout)

if len(sys.argv) != 2:
    fail("utiliser python3 scripts/check-compose.py /chemin/prive/compose.env")
config = docker_json("compose", "--env-file", str(Path(sys.argv[1]).resolve()), "--profile", "https", "config", "--format", "json")
app = config["services"]["app"]
env = app["environment"]
uid, gid = map(int, app["user"].split(":"))
if uid == 0 or gid == 0:
    fail("le compte du correcteur doit être non root, avec un groupe non root.")
work = Path(env["TMPDIR"])
if not work.is_absolute() or any(c in str(work) for c in (":", ",")):
    fail("RUNNER_WORK_DIR doit être un chemin absolu sans ':' ni ','.")
resolved = work.resolve()
if resolved != work or any(resolved == p or p in resolved.parents for p in map(Path, ("/tmp", "/app", "/run"))) or len(resolved.parts) < 3:
    fail("utiliser un dossier dédié canonique hors de /tmp, /app, /run et des racines système.")
try:
    metadata = work.stat()
except OSError:
    fail("créer le dossier de corrections avant de continuer.")
if not stat.S_ISDIR(metadata.st_mode) or metadata.st_uid != uid or metadata.st_gid != gid or stat.S_IMODE(metadata.st_mode) != 0o700:
    fail("le dossier doit appartenir à RUNNER_UID:RUNNER_GID avec les droits 0700.")
mount = next(v for v in app["volumes"] if v["target"] == "/run/correction-docker.sock")
socket = Path(mount["source"])
try:
    metadata = socket.stat()
except OSError:
    fail("socket rootless absent ou inaccessible.")
if not stat.S_ISSOCK(metadata.st_mode) or metadata.st_uid != uid:
    fail("le socket doit appartenir au compte rootless du correcteur.")
endpoint = "unix://" + str(socket)
context = docker_json("context", "inspect")
infrastructure = os.environ.get("DOCKER_HOST") or context[0]["Endpoints"]["docker"]["Host"]
if infrastructure == endpoint:
    fail("utiliser un daemon d’infrastructure distinct de celui des corrections.")
info = docker_json("--host", endpoint, "info", "--format", "{{json .}}")
if not any("rootless" in option for option in info.get("SecurityOptions", [])):
    fail("le daemon de correction doit être rootless.")
if str(info.get("CgroupVersion")) != "2" or not all(info.get(k) for k in ("MemoryLimit", "SwapLimit", "CPUCfsQuota", "PidsLimit")):
    fail("cgroup v2 et limites mémoire/swap/CPU/processus actifs requis.")
print("Préparation vérifiée : compte, dossier partagé, daemon rootless et limites. Le démarrage et les corrections restent à tester.")
