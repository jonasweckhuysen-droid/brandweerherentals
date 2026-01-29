/*************************************************
 * FIREBASE REFERENTIE
 *************************************************/
const db = firebase.database();

/*************************************************
 * HELPERS (DATUM)
 *************************************************/
// Maak een lokale ISO datum (YYYY-MM-DD) zonder UTC-shifts
function toISODateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse "YYYY-MM-DD" veilig als lokale datum (op 12:00 om timezone/DST issues te vermijden)
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

      // Kan array of object zijn afhankelijk van opslag
      if (Array.isArray(roles)) {
        return roles[roles.length - 1] || null; // laatste item is ploeg
      }

      const values = Object.values(roles);
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
const startDate = new Date("2026-01-23T12:00:00"); // referentie vrijdag 12u (lokaal)
const weekMs = 7 * 24 * 60 * 60 * 1000;

function getDienstPloeg(date = new Date()) {
  const diffWeeks = Math.floor((date - startDate) / weekMs);
  return ploegen[((diffWeeks % ploegen.length) + ploegen.length) % ploegen.length];
}

/*************************************************
 * DAGEN VOOR EEN PLOEG
 * (dienstblok: vrijdag 12u -> volgende vrijdag 12u)
 * => relevante dagen in dat blok: zaterdag (+1) en dinsdag (+4)
 *************************************************/
function getDienstDagenForPloeg(ploeg) {
  const dienstDagen = [];
  const year = new Date().getFullYear();

  // buffer iets groter dan 52 (soms 53 weken + overlap naar volgend jaar)
  for (let i = 0; i < 60; i++) {
    const blockStart = new Date(startDate.getTime() + i * weekMs);
    const dienstPloeg = ploegen[i % ploegen.length];

    if (dienstPloeg === ploeg) {
      // ✅ FIX: zaterdag is +1 dag (niet +8!)
      const zaterdag = new Date(blockStart.getTime() + 1 * 24 * 60 * 60 * 1000);
      const dinsdag  = new Date(blockStart.getTime() + 4 * 24 * 60 * 60 * 1000);

      if (zaterdag.getFullYear() === year) dienstDagen.push(zaterdag);
      if (dinsdag.getFullYear() === year)  dienstDagen.push(dinsdag);
    }
  }

  // ✅ FIX: altijd chronologisch sorteren (za 7 feb vóór di 10 feb)
  dienstDagen.sort((a, b) => a - b);

  return dienstDagen;
}

/*************************************************
 * HEADER
 *************************************************/
function renderHeader(userName, ploeg) {
  const header = document.getElementById("appHeader");
  const dienstPloeg = getDienstPloeg();
  const week = getWeekNumber(new Date());
  const time = new Date().toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });

  header.innerHTML = `
    <div class="header-left"><img src="logo.png" class="header-logo"></div>
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

  // Alle dienstmomenten voor deze ploeg (jaar)
  const dagen = getDienstDagenForPloeg(ploeg);

  let html = `<h3>Selecteer je beschikbare dagen</h3><div class="dagen-grid">`;

  dagen.forEach(day => {
    // ✅ FIX: lokale ISO datum (geen UTC-shift)
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

  html += `</div><button id="opslaan" class="btn-actie">Opslaan</button><div id="status"></div>`;

  container.innerHTML = html;
  document.getElementById("opslaan").addEventListener("click", saveData);
}

/*************************************************
 * OPSLAAN
 *************************************************/
function saveData() {
  const userName = localStorage.getItem("userName");

  fetchUserPloeg(userName).then(ploeg => {
    const checked = Array.from(document.querySelectorAll(".dag-card input:checked")).map(el => el.value);

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

      // ✅ FIX: veilig parsen als lokale dag (anders kan getDay() fout zijn)
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
