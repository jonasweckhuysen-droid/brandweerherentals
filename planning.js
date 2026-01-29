/*************************************************
 * FIREBASE REFERENTIE
 *************************************************/
const db = firebase.database();

/*************************************************
 * WEEKNUMMER
 *************************************************/
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/*************************************************
 * PLOEG OPHALEN UIT FIREBASE
 *************************************************/
function fetchUserPloeg(userName) {
  return db.ref("users/" + userName + "/roles").once("value")
    .then(snapshot => {
      if (snapshot.exists()) {
        const roles = snapshot.val();
        const keys = Object.keys(roles);
        const lastKey = keys[keys.length - 1];
        return roles[lastKey]; // laatste item is ploeg
      } else {
        return null;
      }
    });
}

/*************************************************
 * ROTATIE LOGICA
 *************************************************/
const ploegen = ["B1", "C1", "A2", "B2", "C2", "A1"];
const startDate = new Date("2026-01-23T12:00:00"); 
// referentie: vrijdag 23 jan 2026 om 12:00 start B1

function getDienstPloeg(date = new Date()) {
  const diffWeeks = Math.floor((date - startDate) / (7 * 24 * 60 * 60 * 1000));
  return ploegen[((diffWeeks % ploegen.length) + ploegen.length) % ploegen.length];
}

/*************************************************
 * DAGEN VOOR EEN PLOEG
 *************************************************/
function getDienstDagenForPloeg(ploeg) {
  const dienstDagen = [];

  // loop over alle weken van het jaar
  const year = new Date().getFullYear();
  for (let week = 1; week <= 52; week++) {
    // bereken start van de week (maandag)
    const firstDayOfYear = new Date(year, 0, 1);
    const daysOffset = (week - 1) * 7;
    const monday = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);

    // bepaal welke ploeg van dienst is die week
    const dienstPloeg = getDienstPloeg(monday);

    if (dienstPloeg === ploeg) {
      // dinsdag (maandag + 1)
      const dinsdag = new Date(monday.getTime() + 1 * 24 * 60 * 60 * 1000);
      // zaterdag (maandag + 5)
      const zaterdag = new Date(monday.getTime() + 5 * 24 * 60 * 60 * 1000);

      dienstDagen.push({ week, dinsdag, zaterdag });
    }
  }
  return dienstDagen;
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
  const dienstPloeg = getDienstPloeg();

  header.innerHTML = `
    <div class="header-left">
      <img src="logo.png" class="header-logo">
    </div>
    <div class="header-right">
      <div class="header-greeting">${userName}</div>
      <div class="header-name">
        Jouw ploeg: ${ploeg}<br>
        Huidige dienstploeg: ${dienstPloeg} – week ${week}<br>
        <small>${time}</small>
      </div>
    </div>
  `;
}

/*************************************************
 * DAGEN RENDEREN
 *************************************************/
function renderDagen(userName, ploeg) {
  const container = document.getElementById("dagenContainer");
  const dienstDagen = getDienstDagenForPloeg(ploeg);

  let html = "<ul>";
  dienstDagen.forEach(d => {
    html += `<li>Week ${d.week}: ${d.dinsdag.toLocaleDateString("nl-BE")} & ${d.zaterdag.toLocaleDateString("nl-BE")}</li>`;
  });
  html += "</ul>";

  container.innerHTML = html;
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

  if (!datum) {
    document.getElementById("status").innerText = "❌ Datum invullen";
    return;
  }

  db.ref("beschikbaarheid").push({
    datum,
    created: Date.now()
  });

  document.getElementById("status").innerText = "✅ Opgeslagen";
}

/*************************************************
 * INIT
 *************************************************/
window.addEventListener("load", () => {
  const userName = localStorage.getItem("userName");
  if (!userName) {
    alert("Geen gebruiker gevonden, log eerst in via index.html");
    return;
  }

  fetchUserPloeg(userName).then(ploeg => {
    renderHeader(userName, ploeg);
    renderDagen(userName, ploeg);
    renderForm();
  });
});
