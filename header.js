(function () {

  const NAME_KEY = "userName";
  const TEAM_KEY = "userTeam"; // optioneel, indien je dit opslaat

  const TEAM_CYCLE = ["A1", "B1", "C1", "A2", "B2", "C2"];

  // 👉 REFERENTIE: 1 januari = A2, shift elke vrijdag 12u
  const REFERENCE = new Date("2026-01-02T12:00:00"); 
  // 2 jan 2026 = vrijdag 12u → startpunt

  window.addEventListener("DOMContentLoaded", initHeader);

  function initHeader() {
    restoreUser();
    updateDateTime();
    updatePloegVanWeek();
    injectMeta();
    setInterval(updateDateTime, 1000);
  }

  /* -----------------------------
     GEBRUIKER
  ----------------------------- */
  function restoreUser() {
    const user = localStorage.getItem(NAME_KEY);
    const greet = document.getElementById("greeting");

    if (greet && user) {
      greet.textContent = `Welkom, ${user}!`;
    }

    // beschikbaar maken voor andere scripts
    window.currentUser = user;
  }

  /* -----------------------------
     DATUM & TIJD
  ----------------------------- */
  function updateDateTime() {
    const dt = document.getElementById("datetime");

    if (dt) {
      dt.textContent = new Date().toLocaleString("nl-BE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  }

  /* -----------------------------
     PLOEG VAN WEEK
  ----------------------------- */
  function getPloegVanWeek(date = new Date()) {
    const diffWeeks = Math.floor(
      (date - REFERENCE) / (7 * 24 * 60 * 60 * 1000)
    );

    return TEAM_CYCLE[
      ((TEAM_CYCLE.indexOf("A2") + diffWeeks) % TEAM_CYCLE.length + 6) % 6
    ];
  }

  function updatePloegVanWeek() {
    const ploegEl = document.getElementById("ploegOfWeek");
    const ploeg = getPloegVanWeek();

    if (ploegEl) {
      ploegEl.textContent = "Ploeg van week: " + ploeg;
    }

    // globaal beschikbaar maken
    window.ploegVanWeek = ploeg;
  }

  /* -----------------------------
     META TAGS VOOR PLANNING
  ----------------------------- */
  function injectMeta() {

    const user = localStorage.getItem(NAME_KEY);
    const ploeg = window.ploegVanWeek;

    if (user) {
      setMeta("wespen-username", user);
    }

    if (ploeg) {
      setMeta("wespen-team", ploeg);
    }
  }

  function setMeta(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", name);
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }

})();
