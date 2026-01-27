/************ FIREBASE ************/
firebase.initializeApp({
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/"
});
const db = firebase.database();

/************ INGelogde gebruiker ************/
const userKey = localStorage.getItem("userName");
if (!userKey) {
  alert("Niet ingelogd");
  location.href = "index.html";
}

/************ DATUMLOGICA ************/
const vandaag = new Date();
const huidigeDag = vandaag.getDate();
const huidigeMaand = vandaag.getMonth();
const huidigeJaar = vandaag.getFullYear();

// vanaf 1 maart t/m november
let startMaand = 2; // maart
let eindMaand = 10;  // november

/************ FEESTDAGEN ************/
const feestdagen = ["01-01","01-05","21-07","15-08","01-11","11-11","25-12"];
function isFeestdag(d) {
  const key = `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}`;
  return feestdagen.includes(key);
}

/************ PLOEG VAN WEEK ************/
const PLOEG_CYCLE = ["A1","B1","C1","A2","B2","C2"];
const REF_DATE = new Date("2026-01-23T12:00:00"); // 27/01/2026 is B1

function getPloegVanWeek(d) {
  const weken = Math.floor((d - REF_DATE) / (7*24*60*60*1000));
  return PLOEG_CYCLE[(weken % 6 + 6) % 6];
}

/************ DAGEN OPBOUW ************/
const dagenContainer = document.getElementById("dagenContainer");

for (let m = startMaand; m <= eindMaand; m++) {
  for (let d=1; d<=31; d++) {
    const datum = new Date(huidigeJaar, m, d);
    if (datum.getMonth() !== m) continue;

    const dow = datum.getDay();
    if (dow !== 2 && dow !== 6) continue; // alleen dinsdag & zaterdag
    if (isFeestdag(datum)) continue;
    if (getPloegVanWeek(datum) !== localStorage.getItem("userTeam")) continue;

    const kaart = document.createElement("div");
    kaart.className = "dag-kaart";
    kaart.innerHTML = `
      <div class="dag-header">
        ${datum.toLocaleDateString("nl-BE",{weekday:"long",day:"numeric",month:"long"})}
      </div>
      <div class="dag-inhoud">
        <button class="btn-ik-kan" data-datum="${datum.toISOString()}">
          <i class="fa-solid fa-check"></i> Ik ben beschikbaar
        </button>
      </div>
    `;
    kaart.querySelector("button").onclick = () => opgeven(datum.toISOString(), kaart);
    dagenContainer.appendChild(kaart);
  }
}

/************ OPSLAAN BESCHIKBAARHEID ************/
function opgeven(datumISO, kaart) {
  db.ref("users/" + userKey).once("value", snap => {
    if (!snap.exists()) { alert("Gebruiker niet gevonden"); return; }
    const user = snap.val();

    db.ref("wespen/availability").push({
      userKey,
      naam: user.displayName,
      ploeg: user.roles, // A1, B1 etc
      datum: datumISO,
      timestamp: Date.now()
    });

    // visuele feedback
    kaart.querySelector(".dag-inhoud").innerHTML = `
      <div class="ingevuld">
        <i class="fa-solid fa-circle-check"></i>
        Beschikbaar opgegeven
      </div>
    `;
  });
}

/************ AUTOMATISCHE PLANNING ************/
function maakWespenPlanning() {
  db.ref("wespen/availability").once("value", snap => {
    const data = Object.values(snap.val() || {});
    const perDag = {};

    // per datum groeperen
    data.forEach(e => {
      const dagKey = e.datum.split("T")[0];
      perDag[dagKey] ??= [];
      perDag[dagKey].push(e);
    });

    Object.keys(perDag).forEach(dagKey => {
      const kandidaten = perDag[dagKey];

      // sorteer op minst aantal verdelgingen (counter)
      kandidaten.sort((a,b) => (a.wespenCount||0) - (b.wespenCount||0));

      // selecteer maximaal 2 personen
      const selected = kandidaten.slice(0,2);

      db.ref(`wespen/planning/${dagKey}`).set({
        datum: dagKey,
        users: selected.map(u => u.naam)
      });

      // update teller
      selected.forEach(u=>{
        u.wespenCount = (u.wespenCount||0)+1;
      });
    });

    alert("✅ Wespenplanning aangemaakt");
  });
}
