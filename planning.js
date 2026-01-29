/*************************************************
 * VERSION (debug: zie in console of nieuwe file laadt)
 *************************************************/
const VERSION = "2026-01-29_16-33_FIX-A2-DATES";
console.log("✅ planning.js loaded:", VERSION);

/*************************************************
 * FIREBASE REFERENTIE
 *************************************************/
const db = firebase.database();

/*************************************************
 * HELPERS (DATUM)
 *************************************************/
function toISODateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse "YYYY-MM-DD" als lokale datum (12:00 om timezone/DST issues te vermijden)
function parseLocalISODate(iso) {
  return new Date(`${iso}T12:00:00`);
}

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
      if (!snapshot.exists()) return null;
      const roles = snapshot.val();
      const values = Array.isArray(roles) ? roles : Object.values(roles);
      return values[values.length - 1] || null; // laatste item is ploeg
    });
}

function fetchUserRoles(userName) {
  return db.ref("users/" + userName + "/roles").once("value")
    .then(snapshot => {
      if (!snapshot.exists()) return [];
      const roles = snapshot.val();
      return Array.isArray(roles) ? roles : Object.values(roles);
    });
}

/*************************************************
 * ROTATIE LOGICA
 *************************************************/
const ploegen = ["B1", "C1", "A2", "B2", "C2", "A1"];

// ⚠️ Zet timezone expliciet om parsing-verschillen tussen browsers te vermijden.
// 23 jan 2026 is winteruur in BE => +01:00
const startDate = new Date("2026-01-23T12:00:00+01:00"); // referentie: vrijdag 12u

const weekMs = 7 * 24 * 60 * 60 * 1000;

function getDienstPloeg(date = new Date()) {
  // Zorg dat we rond DST geen randgevallen krijgen: werk op 12:00
  const safe = new Date(date);
  safe.setHours(12, 0, 0, 0);

  const diffWeeks = Math.floor((safe - startDate) / weekMs);
  const idx = ((diffWeeks % ploegen.length) + ploegen.length) % ploegen.length;
  return ploegen[idx];
}

/*************************************************
 * DAGEN VOOR EEN PLOEG (ROBUSTE KALENDER-METHODE)
 * We lopen alle dagen van het jaar af en nemen:
 * - dinsdag (2) en zaterdag (6)
 * - waarbij getDienstPloeg(datum) == ploeg
 *************************************************/
function getDienstDagenForPloeg(ploeg, year = new Date().getFullYear()) {
  const dienstDagen = [];

  const d = new Date(year, 0, 1, 12, 0, 0, 0);   // 1 jan, 12:00
  const end = new Date(year, 11, 31, 12, 0, 0, 0); // 31 dec, 12:00

  while (d <= end) {
    const dayOfWeek = d.getDay(); // 0 zo,1 ma,2 di,...,6 za
    if ((dayOfWeek === 2 || dayOfWeek === 6) && getDienstPloeg(d) === ploeg) {
      dienstDagen.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }

  // altijd chronologisch (veilig)
  dienstDagen.sort((a, b) => a - b);

  // Debug: toon de eerste 6 in console
  console.log(`📌 Dienstdagen voor ${ploeg} (${year}) - eerste 6:`,
    dienstDagen.slice(0, 6).map(x => x.toLocaleDateString("nl-BE"))
  );

  return dienstDagen;
}

/*************************************************
 * HEADER
 *************************************************/
function renderHeader(userName, ploeg) {
  const header = document.getElementById("appHeader");
  const dienstPloeg = getDienstPloeg(new Date());
  const week = getWeekNumber(new Date());
  const time = new Date().toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });

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
function renderDagen(ploeg) {
  const container = document.getElementById("dagenContainer");
  const dagen = getDienstDagenForPloeg(ploeg);

  let html = `<h3>Selecteer je beschikbare dagen</h3><div class="dagen-grid">`;

  dagen.forEach(day => {
    const iso = toISODateLocal(day);
    const label = day.toLocaleDateString("nl-BE", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });

    html += `
      <label class="dag-card">
        <input type="checkbox" value="${iso}">
        <span>${label}</span>
      </label>
    `;
  });

  html += `</div>
    <button id="opslaan" class="btn-actie">Opslaan</button>
    <div id="status"></div>`;

  container.innerHTML = html;
  document.getElementById("opslaan").addEventListener("click", saveData);
}

/*************************************************
 * OPSLAAN
 *************************************************/
function saveData() {
  const userName = localStorage.getItem("userName");
  fetchUserPloeg(userName).then(ploeg => {
    const checked = Array.from(document.querySelectorAll(".dag-card input:checked"))
      .map(el => el.value);

    if (checked.length === 0) {
      document.getElementById("status").innerText = "❌ Selecteer minstens één dag";
      return;
    }

    checked.forEach(datum => {
      db.ref("beschikbaarheid").push({
        datum,
        user: userName,
        ploeg,
        created: Date.now()
      });
    });

    document.getElementById("status").innerText = "✅ Opgeslagen";
  });
}

/*************************************************
 * PLANNING GENEREREN (ADMIN)
 *************************************************/
function generatePlanning() {
  const container = document.getElementById("planningContainer");
  container.innerHTML = "⏳ Planning wordt geladen...";

  db.ref("beschikbaarheid").once("value").then(snapshot => {
    if (!snapshot.exists()) {
      container.innerHTML = "Geen beschikbaarheden gevonden.";
      return;
    }

    const data = snapshot.val();
    const planning = {};
    const shifts = {};

    Object.values(data).forEach(entry => {
      const datum = entry.datum;
      const user = entry.user;
      const ploeg = entry.ploeg;

      // ✅ veilig dag van de week bepalen
      const day = parseLocalISODate(datum).getDay(); // 2 = dinsdag, 6 = zaterdag
      if (day !== 2 && day !== 6) return;

      if (!planning[datum]) planning[datum] = {};
      if (!planning[datum][ploeg]) planning[datum][ploeg] = [];
      planning[datum][ploeg].push(user);

      if (!shifts[user]) shifts[user] = 0;
    });

    let html = `<h3>Gegenereerde planning</h3>
      <table class="planning-table">
        <tr><th>Datum</th><th>Ingezet</th></tr>`;

    Object.keys(planning).sort().forEach(datum => {
      const ploegKeys = Object.keys(planning[datum]);
      let assigned = [];

      ploegKeys.slice(0, 2).forEach(ploeg => {
        const kandidaten = planning[datum][ploeg].sort((a, b) => shifts[a] - shifts[b]);
        const gekozen = kandidaten.slice(0, 2);
        gekozen.forEach(u => shifts[u]++);
        assigned = assigned.concat(gekozen.map(u => `${u} (${ploeg})`));
      });

      html += `<tr><td>${datum}</td><td>${assigned.join(", ")}</td></tr>`;
    });

    html += `</table>`;
    container.innerHTML = html;
  });
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
    renderDagen(ploeg);

    fetchUserRoles(userName).then(roles => {
      const btn = document.getElementById("generatePlanning");
      if (roles.includes("admin")) {
        btn.style.display = "block";
        btn.addEventListener("click", generatePlanning);
      } else {
        btn.style.display = "none";
      }
    });
  });
});
``
