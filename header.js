// =======================================
// header.js — Logo groter + alles rechts
// =======================================

(function () {

  const NAME_KEY = "userName";
  const VZW_KEY = "isVZW";

  window.addEventListener("DOMContentLoaded", initHeader);

  function initHeader() {
    const headerEl = document.getElementById("appHeader");
    if (!headerEl) return;

    // HEADER MARKUP
    headerEl.innerHTML = `
      <!-- LINKER KANT (LOGO) -->
      <div class="header-left">
        <img src="/brandweerherentals/icons/logo.png"
             alt="Brandweer Herentals"
             class="header-logo">
      </div>

      <!-- RECHTER KANT (TEXT) -->
      <div class="header-right">
        <div id="greeting"></div>
        <div id="datetime"></div>
        <div id="ploegOfWeek"></div>
      </div>
    `;

    restoreUser();
    updateDateTime();
    setInterval(updateDateTime, 1000);
  }

  function restoreUser() {
    let user = localStorage.getItem(NAME_KEY);
    let vzw = localStorage.getItem(VZW_KEY);

    if (!user) {
      user = prompt("Wat is je naam?");
      if (user) localStorage.setItem(NAME_KEY, user);
    }

    if (!vzw) {
      const pwd = prompt("Ben je lid van de VZW? Vul wachtwoord in:");
      vzw = pwd === "Oudstrijder" ? "true" : "false";
      localStorage.setItem(VZW_KEY, vzw);
    }

    const greet = document.getElementById("greeting");
    if (greet && user) greet.textContent = `Welkom, ${user}!`;
  }

  function updateDateTime() {
    const dt = document.getElementById("datetime");
    const ploeg = document.getElementById("ploegOfWeek");

    if (dt) {
      dt.textContent = new Date().toLocaleString("nl-BE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    if (ploeg) {
      const cycle = ["A1", "B1", "C1", "A2", "B2", "C2"];
      const ref = new Date("2025-01-03T12:00:00");
      const now = new Date();
      const weeks = Math.floor((now - ref) / (7 * 24 * 60 * 60 * 1000));
      ploeg.textContent = "Ploeg van week: " + cycle[(weeks % 6 + 6) % 6];
    }
  }

})();
