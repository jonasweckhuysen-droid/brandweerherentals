const db = firebase.database();
const ploegen = ["B1", "C1", "A2", "B2", "C2", "A1"];
const startDate = new Date("2026-01-23T12:00:00"); // vrijdag 23 jan 12u

function fetchUserPloeg(userName) {
  return db.ref("users/" + userName + "/roles").once("value")
    .then(snapshot => {
      if (snapshot.exists()) {
        const roles = snapshot.val();
        const keys = Object.keys(roles);
        return roles[keys[keys.length - 1]]; // laatste item is ploeg
      }
      return null;
    });
}

function fetchUserRoles(userName) {
  return db.ref("users/" + userName + "/roles").once("value")
    .then(snapshot => {
      if (snapshot.exists()) {
        return Object.values(snapshot.val()); // alle rollen incl. ploeg
      }
      return [];
    });
}

function getDienstDagenForPloeg(ploeg) {
  const dienstDagen = [];
  const year = new Date().getFullYear();

  // loop over 52 rotatieblokken
  for (let i = 0; i < 52; i++) {
    const blockStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const dienstPloeg = ploegen[i % ploegen.length];

    if (dienstPloeg === ploeg) {
      const dinsdag = new Date(blockStart.getTime() + 4 * 24 * 60 * 60 * 1000);
      const zaterdag = new Date(blockStart.getTime() + 8 * 24 * 60 * 60 * 1000);
      if (dinsdag.getFullYear() === year) dienstDagen.push(dinsdag);
      if (zaterdag.getFullYear() === year) dienstDagen.push(zaterdag);
    }
  }
  return dienstDagen;
}

function renderHeader(userName, ploeg) {
  const header = document.getElementById("appHeader");
  const week = getWeekNumber(new Date());
  const time = new Date().toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });

  header.innerHTML = `
    <div class="header-left"><img src="logo.png" class="header-logo"></div>
    <div class="header-right">
      <div class="header-greeting">${userName}</div>
      <div class="header-name">
        Jouw ploeg: ${ploeg}<br>
        Week ${week}<br>
        <small>${time}</small>
      </div>
    </div>
  `;
}

function renderDagen(ploeg) {
  const container = document.getElementById("dagenContainer");
  const dagen = getDienstDagenForPloeg(ploeg);

  let html = `<h3>Selecteer je beschikbare dagen</h3><div class="dagen-grid">`;
  dagen.forEach(day => {
    const iso = day.toISOString().split("T")[0];
    const label = day.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" });
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

function generatePlanning(ploeg) {
  const container = document.getElementById("planningContainer");
  container.innerHTML = "⏳ Planning wordt geladen...";

  db.ref("beschikbaarheid").once("value").then(snapshot => {
    if (!snapshot.exists()) {
      container.innerHTML = "Geen beschikbaarheden gevonden.";
      return;
    }

    const data = snapshot.val();
    const planning = {};

    Object.values(data).forEach(entry => {
      if (entry.ploeg !== ploeg) return;
      const datum = entry.datum;
      const user = entry.user || "Onbekend";
      if (!planning[datum]) planning[datum] = [];
      planning[datum].push(user);
    });

    let html = `<h3>Planning voor ploeg ${ploeg}</h3><table class="planning-table"><tr><th>Datum</th><th>Beschikbaar</th></tr>`;
    Object.keys(planning).sort().forEach(datum => {
      html += `<tr><td>${datum}</td><td>${planning[datum].join(", ")}</td></tr>`;
    });
    html += "</table>";

    container.innerHTML = html;
  });
}

window.addEventListener("load", () => {
  const userName = localStorage.getItem("userName");
  if (!userName) {
    alert("Geen gebruiker gevonden, log eerst in via index.html");
    return;
  }
  fetchUserPloeg(userName).then(ploeg => {
    renderHeader(userName, ploeg);
    renderDagen(ploeg);

    // check of user admin is
    fetchUserRoles(userName).then(roles => {
      if (roles.includes("admin")) {
        const btn = document.getElementById("generatePlanning");
        if (btn) {
          btn.style.display = "block";
          btn.addEventListener("click", () => generatePlanning(ploeg));
        }
      } else {
        const btn = document.getElementById("generatePlanning");
        if (btn) btn.style.display = "none";
      }
    });
  });
});
