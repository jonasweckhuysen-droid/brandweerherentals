/************ FIREBASE INIT ************/
firebase.initializeApp({
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/"
});
const db = firebase.database();

/************ GEBRUIKER ************/
const currentUser = localStorage.getItem("userName");
if (!currentUser) { 
  alert("Niet ingelogd"); 
  location.href = "index.html"; 
}

let userTeam = localStorage.getItem("userTeam"); // A1,B1,C1,A2,B2,C2

/************ FEESTDAGEN ************/
const FEESTDAGEN = ["01-01","01-05","21-07","15-08","01-11","11-11","25-12"];
function isFeestdag(d){
  const key = `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}`;
  return FEESTDAGEN.includes(key);
}

/************ PLOEG VAN WEEK ************/
const PLOEG_CYCLE = ["A1","B1","C1","A2","B2","C2"];
const REF_DATE = new Date("2026-01-23T12:00:00"); // B1-week start
const BASE_INDEX = 1; // B1
function getPloegVanWeek(d){
  const weekMs = 7*24*60*60*1000;
  const weken = Math.floor((d - REF_DATE)/weekMs);
  return PLOEG_CYCLE[(BASE_INDEX + ((weken%6 + 6)%6))];
}

/************ USER TEAM LADEN ************/
async function getUserTeam(){
  if(userTeam) return userTeam;

  const snap = await db.ref("users/"+currentUser).get();
  if(!snap.exists()) return null;

  userTeam = snap.val().roles;
  localStorage.setItem("userTeam", userTeam);
  return userTeam;
}

/************ HEADER UPDATEN ************/
async function updateHeader(){
  const greetingEl = document.getElementById("greeting");
  const datetimeEl = document.getElementById("datetime");
  const ploegEl = document.getElementById("ploegOfWeek");

  if(!greetingEl || !datetimeEl || !ploegEl){
    setTimeout(updateHeader, 50);
    return;
  }

  const team = await getUserTeam();
  if(!team){
    greetingEl.textContent = "Gebruiker niet gevonden";
    return;
  }

  const now = new Date();
  greetingEl.textContent = `Welkom, ${currentUser}`;
  datetimeEl.textContent = now.toLocaleString("nl-BE", {
    weekday:"short", day:"2-digit", month:"short",
    hour:"2-digit", minute:"2-digit"
  });
  ploegEl.textContent = "Ploeg van week: " + getPloegVanWeek(now);
}

/************ DAGEN LADEN ************/
async function laadDagen(){
  const container = document.getElementById("dagenContainer");
  container.innerHTML="Laden…";

  const team = await getUserTeam();
  if(!team){
    container.innerHTML="<em>Niet ingelogd of team niet gevonden.</em>";
    return;
  }

  await updateHeader();

  let beschikbaar = await db.ref("wespen/availability").get();
  beschikbaar = beschikbaar.val() || {};

  container.innerHTML="";

  const jaar = new Date().getFullYear();
  const start = new Date(jaar, 2, 1);   // maart
  const eind   = new Date(jaar, 10, 30); // november

  for(let d=new Date(start); d<=eind; d.setDate(d.getDate()+1)){
    const dow = d.getDay();
    if(dow!==2 && dow!==6) continue; // alleen di & za
    if(getPloegVanWeek(d)!==team) continue;
    if(isFeestdag(d)) continue;

    const dagKey = d.toISOString().split("T")[0];
    const kaart = document.createElement("div");
    kaart.className="dag-kaart";

    const alOpgegeven = Object.values(beschikbaar).some(e =>
      e.userKey === currentUser &&
      e.datum.startsWith(dagKey)
    );

    kaart.innerHTML = `
      <div class="dag-header">
        ${d.toLocaleDateString("nl-BE",{weekday:"long",day:"numeric",month:"long"})}
      </div>
      <div class="dag-inhoud">
        <button class="btn-ik-kan" data-datum="${d.toISOString()}" ${alOpgegeven?"disabled":""}>
          <i class="fa-solid fa-check"></i> ${alOpgegeven?"Opgegeven":"Ik ben beschikbaar"}
        </button>
      </div>
    `;
    kaart.querySelector("button").onclick = ()=>opgeven(d.toISOString(), kaart);
    container.appendChild(kaart);
  }

  if(container.innerHTML==="")
    container.innerHTML="<em>Geen dagen beschikbaar voor jouw ploeg van week.</em>";
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
      kaart.querySelector(".dag-inhoud").innerHTML = `
        <div class="ingevuld"><i class="fa-solid fa-circle-check"></i> Beschikbaar opgegeven</div>
      `;
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
      const selected = kandidaten.slice(0,2); // 2 personen per dag

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

  if(container.innerHTML==="")
    container.innerHTML="<em>Geen planning beschikbaar.</em>";
}

/************ INIT ************/
document.addEventListener("DOMContentLoaded", async()=>{
  setInterval(updateHeader, 1000);
  await updateHeader();
  await laadDagen();
  await laadPlanning();

  const generateBtn = document.getElementById("generatePlanning");
  if(generateBtn) generateBtn.onclick = maakWespenPlanning;
});
