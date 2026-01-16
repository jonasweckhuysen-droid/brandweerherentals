/************ FIREBASE ************/
firebase.initializeApp({
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/"
});
const db = firebase.database();

/************ GEBRUIKERS & ROLLEN ************/
const rollen = {
  "Jan Peeters": "chauffeur",
  "Tom Janssens": "bevelvoerder",
  "Bram Verhoeven": "brandweerman",
  "Lisa Maes": "stagiair"
};

const rolIconen = {
  chauffeur: "fa-truck",
  bevelvoerder: "fa-user-tie",
  brandweerman: "fa-fire",
  stagiair: "fa-graduation-cap"
};

/************ DATUMLOGICA ************/
const vandaag = new Date();
const huidigeDag = vandaag.getDate();
const huidigeMaand = vandaag.getMonth();
const huidigeJaar = vandaag.getFullYear();

// DOELMAAND = MAAND + 2 (vanaf 16de)
let doelMaand = huidigeDag >= 16 ? huidigeMaand + 2 : huidigeMaand + 1;
let doelJaar = huidigeJaar;
if (doelMaand > 11) {
  doelMaand -= 12;
  doelJaar++;
}

document.getElementById("doelMaand").innerText =
  new Date(doelJaar, doelMaand).toLocaleDateString("nl-BE", { month: "long", year: "numeric" });

document.getElementById("periodeTitel").innerText =
  `Planning ${new Date(doelJaar, doelMaand).toLocaleDateString("nl-BE", { month: "long" })}`;

/************ FEESTDAGEN (voorbeeld) ************/
const feestdagen = [
  "01-01","01-05","21-07","15-08","01-11","11-11","25-12"
];

/************ HULPFUNCTIES ************/
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

    <div class="dag-inhoud" id="dag-${d}">
      <button class="btn-ik-kan" onclick="opgeven('${datum.toISOString()}')">
        <i class="fa-solid fa-check"></i> Ik ben beschikbaar
      </button>
    </div>
  `;

  dagenContainer.appendChild(kaart);
}

/************ OPSLAAN ************/
function opgeven(datumISO) {
  const naam = prompt("Geef je naam in");
  if (!rollen[naam]) {
    alert("Naam niet gekend");
    return;
  }

  db.ref("permanenties/beschikbaar").push({
    naam,
    rol: rollen[naam],
    datum: datumISO
  });
}

/************ AUTOMATISCHE PLANNING ************/
function maakPlanning() {
  db.ref("permanenties/beschikbaar").once("value", snap => {
    const data = Object.values(snap.val() || {});
    const perDag = {};

    data.forEach(e => {
      perDag[e.datum] ??= [];
      perDag[e.datum].push(e);
    });

    Object.keys(perDag).forEach(datum => {
      const kandidaten = perDag[datum];

      const ploeg = {
        chauffeur: kandidaten.find(k => k.rol==="chauffeur"),
        bevelvoerder: kandidaten.find(k => k.rol==="bevelvoerder"),
        brandweermannen: kandidaten.filter(k => k.rol==="brandweerman").slice(0,4),
        stagiair: kandidaten.find(k => k.rol==="stagiair")
      };

      db.ref("permanenties/planning").push({ datum, ploeg });
    });
  });
}
