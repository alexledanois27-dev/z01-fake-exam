const executionCooldowns = { test: 0, run: 0 };
function cooldownRemaining(kind) {
  return Math.max(0, Math.ceil((executionCooldowns[kind] - Date.now()) / 1000));
}
function updateExecutionCooldowns() {
  const testWait = cooldownRemaining("test");
  const runWait = cooldownRemaining("run");
  if (testWait) exampleBtn.disabled = true;
  if (runWait) runBtn.disabled = true;
  exampleBtn.textContent = testWait ? `Tester (${testWait}s)` : "Tester";
  if (!submissionRunning) {
    runBtn.textContent =
      (trueExamMode ? "Soumettre l’exercice" : "Exécuter") +
      (runWait ? ` (${runWait}s)` : "");
  }
}
setInterval(() => updateTrueExamControls(), 250);

// Parse arguments only: never evaluate a shell, variables or substitutions.
function parseProgramArgs(raw) {
  const args = [];
  let value = "",
    quote = "",
    escaped = false,
    active = false;
  for (const ch of raw) {
    if (escaped) {
      value += ch;
      escaped = false;
      active = true;
    } else if (ch === "\\" && quote !== "'") {
      escaped = true;
      active = true;
    } else if (quote) {
      if (ch === quote) quote = "";
      else value += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      active = true;
    } else if (/\s/.test(ch)) {
      if (active) {
        args.push(value);
        value = "";
        active = false;
      }
    } else {
      value += ch;
      active = true;
    }
  }
  if (quote || escaped)
    throw Error("Args : ferme les guillemets ou complète l’échappement.");
  if (active) args.push(value);
  return args;
}

function runCode(options = {}) {
  if (submissionRunning) return pendingRun || Promise.resolve(false);
  const finalSubmission = options.finalSubmission === true;
  const example = options.example === true;
  if (!finalSubmission && cooldownRemaining(example ? "test" : "run"))
    return Promise.resolve(false);
  let testOptions = {};
  if (example) {
    try {
      testOptions = {
        mode: "preview",
        args: parseProgramArgs(document.getElementById("program-args").value),
      };
    } catch (error) {
      outputEl.textContent = error.message;
      return Promise.resolve(false);
    }
  }
  if (
    !currentExercise ||
    (trueExamMode &&
      (!currentExam ||
        currentExam.phase === "finished" ||
        (!finalSubmission &&
          (currentExam.phase !== "running" || examRepo.expired(currentExam)))))
  )
    return Promise.resolve(false);
  saveCurrentDraft();
  const session = trueExamMode ? currentExam : null;
  const submitted = {
    track: currentTrack,
    id: exId(currentExercise),
    scope: editorIdentity?.scope,
    session,
  };
  const previouslyPassed = session
    ? examRepo.passed(session, submitted.id)
    : !!personalStore.result(submitted.track, submitted.id)?.success;
  const code =
    finalSubmission && session
      ? examRepo.draft(session, submitted.id)
      : codeEditorEl.value;
  const visible = () =>
    editorIdentity?.track === submitted.track &&
    editorIdentity?.id === submitted.id &&
    editorIdentity?.scope === submitted.scope;
  if (!finalSubmission)
    executionCooldowns[example ? "test" : "run"] =
      Date.now() + (example ? 10000 : 15000);
  submissionRunning = true;
  runBtn.disabled = true;
  outputEl.textContent = example
    ? "Exécution du test…"
    : "Compilation et exécution des tests…";
  renderRunState("running");
  updateTrueExamControls();
  let advanceAfterSuccess = false;
  pendingRun = (async () => {
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: submitted.id,
          code,
          ...testOptions,
        }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.success !== "boolean")
        throw Error(
          data.output || `Correction refusée (HTTP ${response.status})`,
        );
      const out = String(data.output || "");
      if (!example) {
        if (session)
          examRepo.record(
            session,
            submitted.id,
            code,
            data.success,
            out,
            hardcodingEvidence(code, session.results[submitted.id]),
          );
        else personalStore.result(submitted.track, submitted.id, data.success);
      }
      advanceAfterSuccess = !!(
        session &&
        !example &&
        !finalSubmission &&
        data.success
      );
      persistPersonal();
      renderChips();
      updateTrueExamControls();
      if (visible()) {
        renderRunState(data.success ? "success" : "error");
        if (example) {
          document.getElementById("run-status").textContent = data.success
            ? "Test exécuté"
            : "Erreur de test";
          outputEl.textContent =
            (data.success
              ? "Sortie du programme (sans validation) :\n\n"
              : "Erreur lors du test :\n\n") + (out || "(aucune sortie)");
        } else
          outputEl.textContent = data.success
            ? out.startsWith("OK:")
              ? out
              : "OK: tous les tests sont validés.\n\n" + out
            : out || "Tests non validés.";
        if (!example && data.success && !previouslyPassed && !finalSubmission)
          celebrateExercise();
        if (!example && !data.success && !finalSubmission)
          showFailureReaction();
      }
      return true;
    } catch (error) {
      if (session && !example) {
        examRepo.record(session, submitted.id, code, null, error.message);
        persistPersonal();
      }
      if (visible()) {
        renderRunState("error");
        outputEl.textContent = "Correction indisponible : " + error.message;
      }
      return false;
    } finally {
      submissionRunning = false;
      pendingRun = null;
      runBtn.disabled = false;
      updateTrueExamControls();
      if (advanceAfterSuccess) {
        window.setTimeout(() => {
          if (
            trueExamMode &&
            currentExam === session &&
            session.phase === "running" &&
            !examRepo.expired(session) &&
            !submissionRunning &&
            !finishingExam &&
            visible() &&
            examRepo.passed(session, submitted.id)
          ) {
            nextTrueExamExercise(false);
          }
        }, 900);
      }
    }
  })();
  return pendingRun;
}

function clearConsole() {
  outputEl.textContent = "";
  renderRunState(submissionRunning ? "running" : "ready");
}
