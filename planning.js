/*************************************************
 * FIREBASE REFERENTIE (GEEN INIT!)
 *************************************************/
const db = firebase.database();

/*************************************************
 * DATUM & PLOEG LOGICA
 *************************************************/
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getCurrentPloeg(date = new Date()) {
  const start = new Date("2026-01-02"); // vrijdag referentie
  const ploegen = ["A1", "B1", "C1"];
  const diffWeeks = Math.floor((date - start) / (7 * 24 * 60 * 60 * 1000));
  return ploegen[((diffWeeks % 3) + 3) % 3];
}

/*************************************************
 * HEADER
 *************************************************/
function renderHeader(userName, ploeg) {
  const header = document.getElementById("appHeader");
  const week = getWeekNumber(new Date());
  const time = new Date().toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit"
  });

  header.innerHTML = `
    <div class="header-left">
      <img src="logo.png" class="header-logo">
    </div>
    <div class="header-right">
      <div class="header-greeting">${userName}</div>
      <div class="header-name">
        Ploeg ${ploeg} – week ${week}<br>
        <small>${time}</small>
      </div>
    </div>
  `;
}

/*************************************************
 * FORM
 *************************************************/
function renderForm() {
  const container = document.getElementById("planningContainer");

  container.innerHTML = `
    <h3>Beschikbaarheid</h3>

    <label>Datum</label>
    <input type="date" id="datum">

    <label>Van</label>
    <input type="time" id="van">

    <label>Tot</label>
    <input type="time" id="tot">

    <button id="opslaan">Opslaan</button>

    <div id="status"></div>
  `;

  document.getElementById("opslaan").addEventListener("click", saveData);
}

/*************************************************
 * OPSLAAN
 *************************************************/
function saveData() {
  const datum = document.getElementById("datum").value;
  const van = document.getElementById("van").value;
  const tot = document.getElementById("tot").value;

  if (!datum || !van || !tot) {
    document.getElementById("status").innerText = "❌ Alles invullen";
    return;
  }

  db.ref("beschikbaarheid").push({
    datum,
    van,
    tot,
    created: Date.now()
  });

  document.getElementById("status").innerText = "✅ Opgeslagen";
}

/*************************************************
 * INIT
 *************************************************/
window.addEventListener("load", () => {
  const userName = "Gebruiker"; // later auth
  const ploeg = getCurrentPloeg();

  renderHeader(userName, ploeg);
  renderForm();
});
