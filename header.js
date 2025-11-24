(function () {
  const NAME_KEY = "userName";

  window.addEventListener("DOMContentLoaded", initHeader);

  function initHeader() {
    restoreUser();
    updateDateTime();
    setInterval(updateDateTime, 1000);
  }

  // Haalt ALLEEN de naam uit localStorage (geen prompts meer)
  function restoreUser() {
    const user = localStorage.getItem(NAME_KEY);
    const greet = document.getElementById("greeting");

    if (greet && user) {
      greet.textContent = `Welkom, ${user}!`;
    }
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
