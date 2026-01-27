(function () {

  const NAME_KEY = "userName";

  const TEAM_CYCLE = ["A1", "B1", "C1", "A2", "B2", "C2"];

  // 🔑 REFERENTIE:
  // Vrijdag 23 januari 2026 om 12:00 → ploeg B1
  const REFERENCE_DATE = new Date("2026-01-23T12:00:00");

  window.addEventListener("DOMContentLoaded", initHeader);

  function initHeader() {
    restoreUser();
    updateDateTime();
    updatePloegVanWeek();
    injectMetaTags();
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
      (date - REFERENCE_DATE) / (7 * 24 * 60 * 60 * 1000)
    );

    const startIndex = TEAM_CYCLE.indexOf("B1");

    return TEAM_CYCLE[
      ((startIndex + diffWeeks) % TEAM_CYCLE.length + TEAM_CYCLE.length)
      % TEAM_CYCLE.length
    ];
  }

  function updatePloegVanWeek() {
    const ploegEl = document.getElementById("ploegOfWeek");
    const ploeg = getPloegVanWeek();

    if (ploegEl) {
      ploegEl.textContent = "Ploeg van week: " + ploeg;
    }

    window.ploegVanWeek = ploeg;
  }

  /* -----------------------------
     META TAGS (voor planning.js)
  ----------------------------- */
  function injectMetaTags() {
    const user = localStorage.getItem(NAME_KEY);
    const ploeg = window.ploegVanWeek;

    if (user) setMeta("wespen-username", user);
    if (ploeg) setMeta("wespen-team", ploeg);
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
