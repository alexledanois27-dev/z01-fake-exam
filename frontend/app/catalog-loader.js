async function loadExercises() {
  try {
    const [goRes, jsRes, rustRes, javaRes] = await Promise.all([
      fetch("/api/exercises"),
      fetch("/api/exercises?track=js"),
      fetch("/api/exercises?track=rust"),
      fetch("/api/exercises?track=java"),
    ]);
    if (!goRes.ok) {
      outputEl.textContent =
        "Erreur chargement exercices Go: HTTP " + goRes.status;
      return;
    }
    exercises = await goRes.json();
    exercises.forEach((ex) => {
      ex.level = getExerciseLevel(exId(ex));
    });
    if (jsRes.ok) {
      const incomingJs = await jsRes.json();
      jsExercises = incomingJs.map((ex) => ({
        ...ex,
        level: Number.isInteger(ex.level) && ex.level > 0 ? ex.level : null,
      }));
    } else {
      jsExercises = [];
      console.warn(
        "Chargement des exercices JS impossible: HTTP",
        jsRes.status,
      );
    }
    if (rustRes.ok) {
      const incomingRust = await rustRes.json();
      rustExercises = incomingRust.map((ex, idx) => ({
        ...ex,
        level: Number(ex.level) || (idx % 10) + 1,
      }));
    } else {
      rustExercises = [];
      console.warn(
        "Chargement des exercices Rust impossible: HTTP",
        rustRes.status,
      );
    }
    if (javaRes.ok) {
      const incomingJava = await javaRes.json();
      javaExercises = incomingJava.map((ex, idx) => ({
        ...ex,
        level: Number(ex.level) || (idx % 10) + 1,
      }));
    } else {
      javaExercises = [];
      console.warn(
        "Chargement des exercices Java impossible: HTTP",
        javaRes.status,
      );
    }
    const saved = personalStore.session(currentTrack);
    examKind = saved?.examKind === "strict" ? "strict" : "free";
    personalReady = true;
    if (saved) {
      currentLevelFilter = saved.filter || "all";
      setAppMode(saved.mode || "exam");
      currentLevelFilter = saved.filter || "all";
    }
    renderLevelFilters();
    renderChips();
    updateTrueExamControls();
    const source = getTrackExercises();
    if (!trueExamMode && source.length) {
      const target = saved && source.find((ex) => exId(ex) === saved.selected);
      selectExercise(exId(target || source[0]));
    } else if (trueExamMode && !trueExamSeries.length) {
      startTrueExamSeries();
    }
    savePersonalSession();
  } catch (e) {
    outputEl.textContent = "Erreur chargement exercices: " + e.message;
  }
}
