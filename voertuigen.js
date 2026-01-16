// -------------------- GEBRUIKER --------------------
const currentUser = localStorage.getItem("userName") || "Onbekend";
document.getElementById("userName").textContent = currentUser;

// -------------------- ADMIN CHECK --------------------
const admins = ["Jonas Weckhuysen","Patrick Van Hove","Danny Van den Bergh"];
const isAdmin = admins.includes(currentUser);

// -------------------- DATETIME --------------------
setInterval(()=>{
  document.getElementById("datetime").textContent = new Date().toLocaleString("nl-BE");
},1000);

// -------------------- DATA --------------------
let reservations = JSON.parse(localStorage.getItem("reservations")) || [];

// -------------------- GOOGLE OAUTH --------------------
let gapiInited = false;
let gapiAuthInstance = null;

function initGapi(){
    gapi.load('client:auth2', async () => {
        await gapi.client.init({
            apiKey: 'AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE',
            clientId: 'JOUW_CLIENT_ID_HIER.apps.googleusercontent.com',
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
            scope: "https://www.googleapis.com/auth/calendar"
        });
        gapiAuthInstance = gapi.auth2.getAuthInstance();
        gapiInited = true;
    });
}

document.getElementById("googleSignInBtn").addEventListener("click", async () => {
    if(!gapiInited) return alert("Even wachten tot Google API geladen is...");
    await gapiAuthInstance.signIn();
    alert("Google ingelogd! Push naar agenda is nu mogelijk.");
});

initGapi();

// -------------------- SUBMIT --------------------
function submitReservation(){
  const r = {
    id: Date.now(),
    user: currentUser,
    vehicle: vehicle.value,
    from: from.value,
    to: to.value,
    purpose: purpose.value,
    persons: persons.value,
    status: "In afwachting"
  };
  reservations.push(r);
  save();
  render();
}

// -------------------- SAVE --------------------
function save(){
  localStorage.setItem("reservations", JSON.stringify(reservations));
}

// -------------------- APPROVE --------------------
function approve(id, status){
  reservations = reservations.map(r => r.id===id ? {...r, status} : r);
  save();
  render();

  if(status==="Goedgekeurd"){
      const approved = reservations.find(r=>r.id===id);
      if(approved) pushToGoogleCalendar(approved);
  }
}

// -------------------- RENDER --------------------
function render(){
  const wrap = document.getElementById("reservations");
  wrap.innerHTML="";

  reservations.forEach(r=>{
      const card = document.createElement("div");
      card.className="card";

      card.innerHTML=`
      <div class="card-header">
        <h3>${r.vehicle}</h3>
      </div>
      <div class="card-body">
        <div><strong>Van:</strong> ${r.from}</div>
        <div><strong>Tot:</strong> ${r.to}</div>
        <div><strong>Door:</strong> ${r.user}</div>
        <div><strong>Doel:</strong> ${r.purpose}</div>
        <div><strong>Personen:</strong> ${r.persons}</div>
        <div><strong>Status:</strong> ${r.status}</div>

        ${
          isAdmin && r.status==="In afwachting" 
          ? `<button class="call-btn" onclick="approve(${r.id},'Goedgekeurd')">✔ Goedkeuren & push</button>
             <button class="call-btn" style="background:#444" onclick="approve(${r.id},'Afgekeurd')">✖ Afkeuren</button>`
          : ""
        }
      </div>
      `;
      wrap.appendChild(card);
  });
}

render();

// -------------------- PUSH NAAR GOOGLE --------------------
async function pushToGoogleCalendar(reservation){
    if(!gapiInited || !gapiAuthInstance.isSignedIn.get()){
        return alert("Gelieve eerst in te loggen met Google om te pushen.");
    }

    const body = {
        summary: `${reservation.vehicle} - ${reservation.user}`,
        location: `Doel: ${reservation.purpose}`,
        start: { dateTime: new Date(reservation.from).toISOString() },
        end: { dateTime: new Date(reservation.to).toISOString() }
    };

    try{
        const response = await gapi.client.calendar.events.insert({
            calendarId: 'df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727@group.calendar.google.com',
            resource: body
        });

        alert("Reservatie naar Google Calendar gepusht!");
        fetchGoogleEventsAndDisplay(); // update agenda.html
    }catch(err){
        console.error(err);
        alert("Kon niet pushen naar Google Calendar");
    }
}
