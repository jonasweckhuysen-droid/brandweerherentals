// =======================================
// header.js
// Verantwoordelijk voor greeting, datetime en ploeg van week
// =======================================
(function(){
  const userNameKey = "userName";
  const isVZWKey = "isVZW";

  let userName = localStorage.getItem(userNameKey);
  let isVZW = localStorage.getItem(isVZWKey);

  async function askUser() {
    if (!userName) {
      userName = prompt("Wat is je naam?");
      if(userName) localStorage.setItem(userNameKey, userName);
    }

    if (!isVZW) {
      let vzwInput = prompt("Ben je lid van de VZW? Vul wachtwoord in:");
      if (vzwInput === "Oudstrijder") {
        isVZW = "true";
        localStorage.setItem(isVZWKey, "true");
      } else {
        isVZW = "false";
        localStorage.setItem(isVZWKey, "false");
      }
    }

    const greetingEl = document.getElementById("greeting");
    if(greetingEl) greetingEl.textContent = userName ? `Welkom, ${userName}!` : "";
  }

  askUser();

  // --------------------------
  // Datum/tijd + ploeg van week
  // --------------------------
  const cyclus = ["A1","B1","C1","A2","B2","C2"];
  const referentie = new Date("2025-01-03T12:00:00");
  
  function currentPloeg() {
    const now = new Date();
    const weken = Math.floor((now - referentie)/(7*24*60*60*1000));
    return cyclus[(weken % cyclus.length + cyclus.length) % cyclus.length];
  }

  function updateHeader() {
    const dtEl = document.getElementById("datetime");
    const pEl = document.getElementById("ploegOfWeek");
    if(dtEl) {
      const options = { weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" };
      dtEl.textContent = new Date().toLocaleString("nl-BE", options);
    }
    if(pEl) pEl.textContent = "Ploeg van week: " + currentPloeg();
  }

  setInterval(updateHeader, 1000);
  updateHeader();
})();
