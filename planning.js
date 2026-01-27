/************ FIREBASE ************/
firebase.initializeApp({
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/"
});
const db = firebase.database();

/************ INGelogde GEBRUIKER ************/
let currentUser = localStorage.getItem("userName");
if(!currentUser){ alert("Niet ingelogd"); location.href="index.html"; }

let currentTeam = localStorage.getItem("userTeam"); // A1,B1,C1,A2,B2,C2

// zet meta tags zodat HTML toegang heeft
document.querySelector("meta[name='wespen-username']").content = currentUser;
document.querySelector("meta[name='wespen-team']").content = currentTeam || "";

/************ HEADER LOGICA ************/
const PLOEG_CYCLE = ["A1","B1","C1","A2","B2","C2"];
const REF_DATE = new Date("2026-01-23T12:00:00"); // B1 op 27/01/2026

function getPloegVanWeek(d){
  const weken = Math.floor((d - REF_DATE)/(7*24*60*60*1000));
  return PLOEG_CYCLE[(weken%6+6)%6];
}

function updateHeader(){
  document.getElementById("greeting").textContent = `Welkom, ${currentUser}!`;
  const now = new Date();
  document.getElementById("datetime").textContent = now.toLocaleString("nl-BE",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
  document.getElementById("ploegOfWeek").textContent = "Ploeg van week: " + getPloegVanWeek(now);
}

/************ FEESTDAGEN ************/
const FEESTDAGEN = ["01-01","01-05","21-07","15-08","01-11","11-11","25-12"];
function isFeestdag(d){
  const key = `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}`;
  return FEESTDAGEN.includes(key);
}

/************ HAAL USER TEAM OP ************/
async function initUserTeam(){
  if(!currentTeam){
    const snap = await db.ref("users/"+currentUser).get();
    if(!snap.exists()){ alert("Gebruiker niet gevonden"); return; }
    currentTeam = snap.val().roles;
    localStorage.setItem("userTeam", currentTeam);
    document.querySelector("meta[name='wespen-team']").content = currentTeam;
  }
}

/************ LADEN DAGEN ************/
async function laadDagen(){
  await initUserTeam();
  const container = document.getElementById("dagenContainer");
  container.innerHTML = "";

  const jaar = new Date().getFullYear();
  for(let m=2;m<=10;m++){ // maart t/m november
    for(let d=1; d<=31; d++){
      const datum = new Date(jaar,m,d);
      if(datum.getMonth()!==m) continue;
      const dow = datum.getDay();
      if(dow!==2 && dow!==6) continue; // di & za
      if(isFeestdag(datum)) continue;
      if(getPloegVanWeek(datum)!==currentTeam) continue;

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
      container.appendChild(kaart);
    }
  }

  if(container.innerHTML==="") container.innerHTML="<em>Geen dagen beschikbaar voor jouw ploeg van week.</em>";
}

/************ BESCHIKBAARHEID OPSLAAN ************/
function opgeven(datumISO, kaart){
  db.ref("users/"+currentUser).get().then(snap=>{
    if(!snap.exists()){ alert("Gebruiker niet gevonden"); return; }
    const user = snap.val();
    db.ref("wespen/availability").push({
      userKey: currentUser,
      naam: user.displayName || currentUser,
      ploeg: user.roles,
      datum: datumISO,
      timestamp: Date.now()
    }).then(()=>{
      kaart.querySelector(".dag-inhoud").innerHTML = `<div class="ingevuld"><i class="fa-solid fa-circle-check"></i> Beschikbaar opgegeven</div>`;
    });
  });
}

/************ AUTOMATISCHE PLANNING ************/
function maakWespenPlanning(){
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

/************ LADEN PLANNING ************/
async function laadPlanning(){
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
  updateHeader();
  setInterval(updateHeader,1000);
  await laadDagen();
  await laadPlanning();
  document.getElementById("generatePlanning").onclick = maakWespenPlanning;
});
