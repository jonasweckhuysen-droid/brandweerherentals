/************ PLOEG LOGICA ************/

// Jouw cyclus:
// Week 1: A1
// Week 2: B1
// Week 3: C1
// Week 4: A2
// Week 5: B2
// Week 6: C2
const PLOEG_CYCLE = ["A1","B1","C1","A2","B2","C2"];

// B1-week start op vrijdag 23/01/2026 om 12:00
const REF_DATE = new Date("2026-01-23T12:00:00");

function getPloegVanWeek(d){
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weken = Math.floor((d - REF_DATE) / weekMs);
  return PLOEG_CYCLE[(weken % 6 + 6) % 6];
}

/************ GEBRUIKERSTEAM LADEN ************/
async function getUserTeam() {
  const currentUser = localStorage.getItem("userName");
  if (!currentUser) return null;

  const snap = await firebase.database().ref("users/" + currentUser).get();
  if (!snap.exists()) return null;

  const team = snap.val().roles; // bv "A2"
  localStorage.setItem("userTeam", team);
  return team;
}

/************ HEADER UPDATEN ************/
async function updateHeader(){
  if (!document.getElementById("greeting")) {
    setTimeout(updateHeader, 50);
    return;
  }

  const currentUser = localStorage.getItem("userName");
  if (!currentUser) {
    alert("Niet ingelogd");
    location.href = "index.html";
    return;
  }

  await getUserTeam();
  const now = new Date();

  document.getElementById("greeting").textContent = `Welkom, ${currentUser}`;
  document.getElementById("datetime").textContent =
    now.toLocaleString("nl-BE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });

  document.getElementById("ploegOfWeek").textContent =
    "Ploeg van week: " + getPloegVanWeek(now);
}

/************ LADEN DAGEN ************/
async function laadDagen(){
  const container = document.getElementById("dagenContainer");
  container.innerHTML="Laden…";

  await updateHeader();

  const currentTeam = await getUserTeam();
  const jaar = new Date().getFullYear();

  let beschikbaar = await firebase.database().ref("wespen/availability").get();
  beschikbaar = beschikbaar.val() || {};

  container.innerHTML="";

  const start = new Date(jaar, 0, 1);
  const eind = new Date(jaar, 11, 31);

  for(let d = new Date(start); d <= eind; d.setDate(d.getDate()+1)){

    const dow = d.getDay();

    // Alleen dinsdag (2) en donderdag (4)
    if(dow !== 2 && dow !== 4) continue;

    // Alleen dagen van de ploeg van week van de gebruiker
    if(getPloegVanWeek(d) !== currentTeam) continue;

    const dagKey = d.toISOString().split("T")[0];

    const kaart = document.createElement("div");
    kaart.className="dag-kaart";

    const alOpgegeven = Object.values(beschikbaar).some(e =>
      e.userKey === localStorage.getItem("userName") &&
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
  const userKey = localStorage.getItem("userName");

  firebase.database().ref("users/"+userKey).get().then(snap=>{
    if(!snap.exists()){ alert("Gebruiker niet gevonden"); return; }
    const user = snap.val();

    firebase.database().ref("wespen/availability").push({
      userKey: userKey,
      naam: user.displayName || userKey,
      ploeg: user.roles,
      datum: datumISO,
      timestamp: Date.now()
    }).then(()=>{
      kaart.querySelector(".dag-inhoud").innerHTML =
        `<div class="ingevuld"><i class="fa-solid fa-circle-check"></i> Beschikbaar opgegeven</div>`;
    });
  });
}

/************ AUTOMATISCHE PLANNING ************/
function maakWespenPlanning(){
  firebase.database().ref("wespen/availability").get().then(snap=>{
    const data = Object.values(snap.val()||{});
    const perDag = {};

    data.forEach(e=>{
      const dagKey = e.datum.split("T")[0];
      perDag[dagKey] ??= [];
      perDag[dagKey].push(e);
    });

    Object.keys(perDag).forEach(dagKey=>{
      const kandidaten = perDag[dagKey].sort((a,b)=>(a.wespenCount||0)-(b.wespenCount||0));
      const selected = kandidaten.slice(0,2);

      firebase.database().ref("wespen/planning/"+dagKey).set({
        datum: dagKey,
        users: selected.map(u=>u.naam)
      });

      selected.forEach(u=>u.wespenCount=(u.wespenCount||0)+1);
    });

    alert("Planning aangemaakt");
    laadPlanning();
  });
}

/************ LADEN PLANNING ************/
async function laadPlanning(){
  const container = document.getElementById("planningContainer");
  container.innerHTML="Laden…";

  const snap = await firebase.database().ref("wespen/planning").get();
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
document.addEventListener("DOMContentLoaded", async () => {
  setInterval(updateHeader, 1000);
  await updateHeader();
  await laadDagen();
  await laadPlanning();
  document.getElementById("generatePlanning").onclick = maakWespenPlanning;
});
