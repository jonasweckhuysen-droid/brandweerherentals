/*************************
 * CONFIG
 *************************/
const firebaseConfig = {
  databaseURL: document
    .querySelector("meta[name='firebase-db']")
    .content
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const currentUser =
  document.querySelector("meta[name='wespen-username']").content;
const currentTeam =
  document.querySelector("meta[name='wespen-team']").content;

document.getElementById("currentUser").textContent = currentUser;
document.getElementById("currentTeam").textContent = currentTeam;

const TEAMS = ["A1","B1","C1","A2","B2","C2"];
const FEESTDAGEN = ["2026-05-01","2026-07-21","2026-08-15"];
const YEAR = new Date().getFullYear();

/*************************
 * PLOEG VAN WEEK
 *************************/
function ploegVanWeek(date){
  const start = new Date(YEAR,0,1);
  start.setHours(12,0,0,0);

  const diffWeeks =
    Math.floor((date - start) / (7*24*3600*1000));

  const index = (TEAMS.indexOf("A2") + diffWeeks) % TEAMS.length;
  return TEAMS[index];
}

/*************************
 * GELDIGE DATA
 *************************/
function geldigeDagen(){
  const days = [];
  for(let m=2;m<=10;m++){
    for(let d=1;d<=31;d++){
      const date = new Date(YEAR,m,d);
      if(date.getMonth()!==m) continue;

      const dow = date.getDay();
      const iso = date.toISOString().slice(0,10);

      if(dow!==2 && dow!==6) continue;
      if(FEESTDAGEN.includes(iso)) continue;
      if(ploegVanWeek(date)!==currentTeam) continue;

      days.push(iso);
    }
  }
  return days;
}

/*************************
 * BESCHIKBAARHEDEN
 *************************/
async function loadAvailability(){
  const dates = geldigeDagen();
  const container = document.getElementById("datesContainer");
  container.innerHTML = "";

  const snap =
    await db.ref(`wespenPlanning/availability/${currentUser}`).get();
  const saved = snap.val() || {};

  dates.forEach(d=>{
    const row = document.createElement("div");
    row.innerHTML = `
      <label>
        <input type="checkbox" data-date="${d}"
        ${saved[d] ? "checked":""}>
        ${d}
      </label>`;
    container.appendChild(row);
  });
}

document.getElementById("saveAvail").onclick = async ()=>{
  const boxes = document.querySelectorAll("input[data-date]");
  const data = {};
  boxes.forEach(b=>{
    if(b.checked) data[b.dataset.date]=true;
  });
  await db.ref(`wespenPlanning/availability/${currentUser}`).set(data);
  alert("Opgeslagen");
};

/*************************
 * PLANNING GENEREREN
 *************************/
async function generatePlanning(){

  const usersSnap = await db.ref("users").get();
  const users = usersSnap.val();

  const availSnap =
    await db.ref("wespenPlanning/availability").get();
  const avail = availSnap.val()||{};

  const counterSnap =
    await db.ref("wespenPlanning/counters").get();
  const counters = counterSnap.val()||{};

  const dates = geldigeDagen();

  for(const date of dates){
    const candidates = [];

    for(const u in users){
      if(users[u].roles !== currentTeam) continue;
      if(!avail[u]?.[date]) continue;

      candidates.push({
        name:u,
        count:counters[u]||0
      });
    }

    candidates.sort((a,b)=>a.count-b.count);

    if(candidates.length<2) continue;

    const selected = candidates.slice(0,2);

    await db.ref(`wespenPlanning/schedule/${date}`).set({
      team: currentTeam,
      users: selected.map(x=>x.name)
    });

    selected.forEach(x=>{
      counters[x.name]=(counters[x.name]||0)+1;
    });
  }

  await db.ref("wespenPlanning/counters").set(counters);
  loadSchedule();
}

/*************************
 * PLANNING TONEN
 *************************/
async function loadSchedule(){
  const snap =
    await db.ref("wespenPlanning/schedule").get();
  const data = snap.val()||{};

  const box = document.getElementById("scheduleContainer");
  box.innerHTML="";

  Object.entries(data).forEach(([date,s])=>{
    if(s.team!==currentTeam) return;

    const div=document.createElement("div");
    div.innerHTML=`
      <b>${date}</b> → ${s.users.join(", ")}
      ${s.users.includes(currentUser)
      ? `<button onclick="requestSwap('${date}')">Ruil</button>`
      : ""}
    `;
    box.appendChild(div);
  });
}

/*************************
 * SWAPS
 *************************/
function requestSwap(date){
  const id="swap_"+Date.now();
  db.ref(`wespenPlanning/swaps/${id}`).set({
    date,
    from: currentUser,
    team: currentTeam,
    status:"open"
  });
}

async function loadSwaps(){
  const snap =
    await db.ref("wespenPlanning/swaps").get();
  const swaps=snap.val()||{};

  const box=document.getElementById("swapsContainer");
  box.innerHTML="";

  Object.entries(swaps).forEach(([id,s])=>{
    if(s.team!==currentTeam) return;
    if(s.status!=="open") return;
    if(s.from===currentUser) return;

    const div=document.createElement("div");
    div.innerHTML=`
      ${s.date}: ${s.from}
      <button onclick="acceptSwap('${id}')">Neem over</button>
      <button onclick="rejectSwap('${id}')">Weiger</button>
    `;
    box.appendChild(div);
  });
}

async function acceptSwap(id){
  const ref=db.ref(`wespenPlanning/swaps/${id}`);
  const snap=await ref.get();
  if(!snap.exists()) return;

  const s=snap.val();
  const schedRef=db.ref(`wespenPlanning/schedule/${s.date}`);
  const sched=(await schedRef.get()).val();

  sched.users=sched.users.map(u=>u===s.from?currentUser:u);
  await schedRef.set(sched);

  await ref.update({
    to: currentUser,
    status:"done"
  });

  loadSchedule();
  loadSwaps();
}

function rejectSwap(id){
  db.ref(`wespenPlanning/swaps/${id}`).remove();
  loadSwaps();
}

/*************************
 * INIT
 *************************/
(async()=>{
  await loadAvailability();
  await loadSchedule();
  await loadSwaps();

  const today=new Date();
  if(today>new Date(YEAR,1,15)){
    await generatePlanning();
  }
})();
