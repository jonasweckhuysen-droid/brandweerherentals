/************ FIREBASE ************/
firebase.initializeApp({
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/"
});
const db = firebase.database();

/************ INGelogde gebruiker ************/
const userKey = localStorage.getItem("userName"); // genormaliseerde naam

if (!userKey) {
  alert("Niet ingelogd");
  location.href = "index.html";
}

/************ DATUMLOGICA ************/
const vandaag = new Date();
const huidigeDag = vandaag.getDate();
const huidigeMaand = vandaag.getMonth();
const huidigeJaar = vandaag.getFullYear();

// LOGICA: 16 maand 1 → 15 maand 2 = maand 3
let doelMaand = huidigeDag >= 16 ? huidigeMaand + 2 : huidigeMaand + 1;
let doelJaar = huidigeJaar;
if (doelMaand > 11) {
  doelMaand -= 12;
  doelJaar++;
}

document.getElementById("doelMaand").innerText =
  new Date(doelJaar, doelMaand).toLocaleDateString("nl-BE", {
    month: "long",
    year: "numeric"
  });

document.getElementById("periodeTitel").innerText =
  `Planning ${new Date(doelJaar, doelMaand).toLocaleDateString("nl-BE", { month: "long" })}`;

/************ FEESTDAGEN ************/
const feestdagen = ["01-01","01-05","21-07","15-08","01-11","11-11","25-12"];

function isFeestdag(d) {
  const key = `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}`;
  return feestdagen.includes(key);
}
function isWeekend(d) {
  return d.getDay() === 0 || d.getDay() === 6;
}

/************ DAGEN OPBOUW ************/
const dagenContainer = document.getElementById("dagenContainer");

for (let d = 1; d <= 31; d++) {
  const datum = new Date(doelJaar, doelMaand, d);
  if (datum.getMonth() !== doelMaand) continue;
  if (isWeekend(datum) || isFeestdag(datum)) continue;

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

  kaart.querySelector("button").onclick = () =>
    opgeven(datum.toISOString(), kaart);

  dagenContainer.appendChild(kaart);
}

/************ OPSLAAN BESCHIKBAARHEID ************/
function opgeven(datumISO, kaart) {

  // haal gebruiker + rollen op uit firebase
  db.ref("users/" + userKey).once("value", snap => {

    if (!snap.exists()) {
      alert("Gebruiker niet gevonden");
      return;
    }

    const user = snap.val();

    db.ref("permanenties/beschikbaar").push({
      userKey,
      naam: user.displayName,
      rollen: user.roles,
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
function maakPlanning() {

  const maandKey = `${doelJaar}-${String(doelMaand+1).padStart(2,"0")}`;

  db.ref("permanenties/beschikbaar").once("value", snap => {

    const data = Object.values(snap.val() || {});
    const perDag = {};

    data.forEach(e => {
      perDag[e.datum] ??= [];
      perDag[e.datum].push(e);
    });

    Object.keys(perDag).forEach(datumISO => {

      const kandidaten = perDag[datumISO];

      // sorteer op minst aantal permanenties
      kandidaten.sort((a,b) =>
        (a.permanentieCount || 0) - (b.permanentieCount || 0)
      );

      const ploeg = {
        bevelvoerder: kandidaten.find(k => k.rollen.includes("bevelvoerder"))?.naam || "",
        chauffeur: kandidaten.find(k => k.rollen.includes("chauffeur"))?.naam || "",
        brandweer: kandidaten.filter(k => k.rollen.includes("brandweer")).slice(0,4).map(b => b.naam),
        ambulancier: kandidaten.find(k => k.rollen.includes("ambulancier"))?.naam || ""
      };

      const dagKey = datumISO.split("T")[0];

      db.ref(`permanenties/planning/${maandKey}/${dagKey}`).set({
        datum: dagKey,
        ploeg
      });
    });

    alert("✅ Planning is aangemaakt");
  });
}
