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
 * HEADER
 *************************************************/
function renderHeader(userName) {
  fetchUserPloeg(userName).then(ploeg => {
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
          Ploeg ${ploeg || "?"} – week ${week}<br>
          <small>${time}</small>
        </div>
      </div>
    `;
  });
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
  const userName = localStorage.getItem("userName");
  if (!userName) {
    alert("Geen gebruiker gevonden, log eerst in via index.html");
    return;
  }

  renderHeader(userName);
  renderForm();
});
