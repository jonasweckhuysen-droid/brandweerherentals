firebase.initializeApp({
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/"
});
const db = firebase.database();

const userKey = localStorage.getItem("userName");
if (!userKey) { alert("Niet ingelogd"); location.href="index.html"; }

let userTeam = localStorage.getItem("userTeam"); // A1,B1,C1,A2,B2,C2

/************ FEESTDAGEN ************/
const FEESTDAGEN = ["01-01","01-05","21-07","15-08","01-11","11-11","25-12"];
function isFeestdag(d) {
  const key = `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}`;
  return FEESTDAGEN.includes(key);
}

/************ PLOEG VAN WEEK ************/
const PLOEG_CYCLE = ["A1","B1","C1","A2","B2","C2"];
const REF_DATE = new Date("2026-01-23T12:00:00"); // B1 op 27/01/2026
function getPloegVanWeek(d) {
  const weken = Math.floor((d - REF_DATE) / (7*24*60*60*1000));
  return PLOEG_CYCLE[(weken % 6 + 6) % 6];
}

/************ HAAL USER TEAM OP ALS NODIG ************/
async function initUserTeam() {
  if (!userTeam) {
    const snap = await db.ref("users/"+userKey).get();
    if (!snap.exists()) { alert("Gebruiker niet gevonden"); return; }
    console.log("Gevonden rol:", snap.val().roles);
    userTeam = snap.val().roles;
    localStorage.setItem("userTeam", userTeam);
  }
}

/************ DAGEN WEERGEVEN ************/
async function laadDagen() {
  await initUserTeam();
  const dagenContainer = document.getElementById("dagenContainer");
  dagenContainer.innerHTML = "";

  const vandaag = new Date();
  const startMaand = 2; // maart
  const eindMaand = 10; // november

  for (let m=startMaand; m<=eindMaand; m++) {
    for (let d=1; d<=31; d++) {
      const datum = new Date(vandaag.getFullYear(), m, d);
      if (datum.getMonth()!==m) continue;
      const dow = datum.getDay();
      if (dow!==2 && dow!==6) continue; // di & za
      if (isFeestdag(datum)) continue;
      if (getPloegVanWeek(datum)!==userTeam) continue;

      const kaart = document.createElement("div");
      kaart.className="dag-kaart";
      kaart.innerHTML = `
        <div class="dag-header">${datum.toLocaleDateString("nl-BE",{weekday:"long",day:"numeric",month:"long"})}</div>
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

  if (dagenContainer.innerHTML==="") {
    dagenContainer.innerHTML="<em>Geen dagen beschikbaar voor jouw ploeg van week.</em>";
  }
}

/************ OPSLAAN BESCHIKBAARHEID ************/
function opgeven(datumISO, kaart) {
  db.ref("users/"+userKey).get().then(snap=>{
    if(!snap.exists()){ alert("Gebruiker niet gevonden"); return; }
    const user = snap.val();
    db.ref("wespen/availability").push({
      userKey,
      naam: user.displayName || userKey,
      ploeg: user.roles,
      datum: datumISO,
      timestamp: Date.now()
    }).then(()=>{
      kaart.querySelector(".dag-inhoud").innerHTML = `
        <div class="ingevuld"><i class="fa-solid fa-circle-check"></i> Beschikbaar opgegeven</div>
      `;
    });
  });
}

/************ AUTOMATISCHE PLANNING ************/
function maakWespenPlanning() {
  db.ref("wespen/availability").get().then(snap=>{
    const data = Object.values(snap.val()||{});
    const perDag = {};
    data.forEach(e=>{
      const dagKey = e.datum.split("T")[0];
      perDag[dagKey] ??= [];
      perDag[dagKey].push(e);
    });

    Object.keys(perDag).forEach(dagKey=>{
      const kandidaten = perDag[dagKey].sort((a,b)=>(a.wespenCount||0)-(b.wespenCount||0));
      const selected = kandidaten.slice(0,2); // altijd 2 personen
      db.ref("wespen/planning/"+dagKey).set({
        datum: dagKey,
        users: selected.map(u=>u.naam)
      });
      selected.forEach(u=>u.wespenCount=(u.wespenCount||0)+1);
    });
    alert("✅ Wespenplanning aangemaakt");
    laadPlanning();
  });
}

/************ PLANNING LADEN ************/
async function laadPlanning() {
  const container = document.getElementById("planningContainer");
  container.innerHTML="Laden…";
  const snap = await db.ref("wespen/planning").get();
  const data = snap.val()||{};
  container.innerHTML="";
  Object.keys(data).sort().forEach(dag=>{
    const p = data[dag];
    const div = document.createElement("div");
    div.style.marginBottom="0.5rem";
    div.innerHTML=`<b>${dag}</b> → ${p.users.join(", ")}`;
    container.appendChild(div);
  });
  if(container.innerHTML==="") container.innerHTML="<em>Geen planning beschikbaar.</em>";
}

/************ INIT ************/
document.addEventListener("DOMContentLoaded", async()=>{
  await laadDagen();
  await laadPlanning();
  document.getElementById("generatePlanning").onclick = maakWespenPlanning;
});
