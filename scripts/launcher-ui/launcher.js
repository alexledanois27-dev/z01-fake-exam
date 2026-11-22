"use strict";
const token = location.hash.slice(1);
const $ = (id) => document.getElementById(id);
let finished = false;
async function api(path, method = "GET") {
  const response = await fetch("/api/" + path, {
    method,
    headers: { Authorization: "Bearer " + token },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Connexion au lanceur impossible.");
  return response.json();
}
async function refresh() {
  if (finished) return;
  try {
    const state = await api("state");
    $("status").textContent = state.ready
      ? "Ton espace est prêt"
      : state.starting
        ? "Démarrage en cours…"
        : "Serveur arrêté";
    $("indicator").className =
      "indicator " + (state.ready ? "ready" : state.starting ? "" : "off");
    $("message").textContent = state.message;
    $("open").classList.toggle("disabled", !state.ready);
    $("open").setAttribute("aria-disabled", String(!state.ready));
    if (state.ready && /^http:\/\/127\.0\.0\.1:\d+$/.test(state.url))
      $("open").href = state.url;
    else $("open").removeAttribute("href");
    $("start").hidden = state.ready || state.starting;
    $("start").disabled = state.starting;
    $("stop").disabled = !state.owned || state.starting;
    $("log").textContent = state.log || "Aucun message pour le moment.";
    $("update-message").textContent = state.update.message;
    $("update-message").dataset.state = state.update.state;
    $("check").disabled = state.update.state === "checking";
    $("version").textContent = state.update.version
      ? state.update.branch + " · " + state.update.version
      : "Version locale";
  } catch (_) {
    $("status").textContent = "Lanceur déconnecté";
    $("message").textContent = "Rouvre le raccourci du lanceur pour reprendre.";
    $("open").classList.add("disabled");
    $("open").removeAttribute("href");
    $("start").disabled = $("stop").disabled = $("check").disabled = true;
  }
  if (!finished) setTimeout(refresh, 2000);
}
for (const [id, action] of [
  ["start", "start"],
  ["stop", "stop"],
  ["check", "check-update"],
]) {
  $(id).addEventListener("click", async () => {
    $(id).disabled = true;
    try {
      await api(action, "POST");
    } catch (_) {
      $("message").textContent = "Action indisponible. Rouvre le lanceur.";
    } finally {
      $(id).disabled = false;
    }
  });
}
$("quit").addEventListener("click", async () => {
  $("quit").disabled = true;
  try {
    await api("quit", "POST");
    finished = true;
    document.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
    $("open").removeAttribute("href");
    $("open").classList.add("disabled");
    $("status").textContent = "Fermeture du lanceur";
    $("message").textContent =
      "L’arrêt du serveur est demandé. Tu peux fermer cette fenêtre.";
  } catch (_) {
    $("message").textContent = "Le lanceur est déjà fermé ou inaccessible.";
  }
});
refresh();
