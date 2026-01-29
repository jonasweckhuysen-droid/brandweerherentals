const db = firebase.database();
const ploegen = ["B1", "C1", "A2", "B2", "C2", "A1"];
const startDate = new Date("2026-01-23T12:00:00"); // referentie vrijdag 12u

function getDienstPloeg(date = new Date()) {
  const diffWeeks = Math.floor((date - startDate) / (7 * 24 * 60 * 60 * 1000));
  return ploegen[((diffWeeks % ploegen.length) + ploegen.length) % ploegen.length];
}

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

function getDienstDagenForPloeg(ploeg) {
  const dienstDagen = [];
  const year = new Date().getFullYear();

  for (let week = 1; week <= 52; week++) {
    const firstDayOfYear = new Date(year, 0, 1);
    const monday = new Date(firstDayOfYear.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    const dienstPloeg = getDienstPloeg(monday);

    if (dienstPloeg === ploeg) {
      const dinsdag = new Date(monday.getTime() + 1 * 24 * 60 * 60 * 1000);
      const zaterdag = new Date(monday.getTime() + 5 * 24 * 60 * 60 * 1000);
      dienstDagen.push({ week, dagen: [dinsdag, zaterdag] });
    }
  }
  return dienstDagen;
}

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

function renderDagen(ploeg) {
  const container = document.getElementById("dagenContainer");
  const dienstDagen = getDienstDagenForPloeg(ploeg);

  let html = `<h3>Selecteer je beschikbare dagen</h3><div class="dagen-grid">`;
  dienstDagen.forEach(d => {
    d.dagen.forEach(day => {
      const iso = day.toISOString().split("T")[0];
      const label = day.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" });
      html += `
        <label class="dag-card">
          <input type="checkbox" value="${iso}">
          <span>${label}</span>
        </label>
      `;
    });
  });
  html += `</div><button id="opslaan" class="btn-actie">Opslaan</button><div id="status"></div>`;

  container.innerHTML = html;
  document.getElementById("opslaan").addEventListener("click", saveData);
}

function saveData() {
  const checked = Array.from(document.querySelectorAll(".dag-card input:checked")).map(el => el.value);
  if (checked.length === 0) {
    document.getElementById("status").innerText = "❌ Selecteer minstens één dag";
    return;
  }
  checked.forEach(datum => {
    db.ref("beschikbaarheid").push({ datum, created: Date.now() });
  });
  document.getElementById("status").innerText = "✅ Opgeslagen";
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
  });
});
