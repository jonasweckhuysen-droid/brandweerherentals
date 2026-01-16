// =======================
// AGENDA.JS — 2-WEG SYNC
// =======================

const currentUser = localStorage.getItem("userName") || "Onbekend";
document.getElementById("userName").textContent = currentUser;

const admins = ["Jonas Weckhuysen","Patrick Van Hove","Danny Van den Bergh"];
const isAdmin = admins.includes(currentUser);

setInterval(()=>document.getElementById("datetime").textContent = new Date().toLocaleString("nl-BE"),1000);

let reservations = JSON.parse(localStorage.getItem("reservations")) || [];

// -------------------- GOOGLE API INIT --------------------
let gapiInited = false;
let gapiAuthInstance = null;

function initGapi() {
    gapi.load('client:auth2', async () => {
        await gapi.client.init({
            apiKey: 'AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE',
            clientId: '440406636112-36khnms08f1bjkol1aqsl6ded5pj39jk.apps.googleusercontent.com',
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
            scope: "https://www.googleapis.com/auth/calendar"
        });
        gapiAuthInstance = gapi.auth2.getAuthInstance();
        gapiInited = true;
        fetchGoogleEvents();
    });
}

initGapi();

async function googleSignIn() {
    if (!gapiInited) return alert("Google API nog niet geladen");
    const user = await gapiAuthInstance.signIn();
    console.log("Ingelogd als:", user.getBasicProfile().getName());
}

// -------------------- PUSH NAAR GOOGLE --------------------
async function pushToGoogleCalendar(reservation){
    if(!gapiInited) return console.warn("gapi nog niet klaar");
    if(!gapiAuthInstance.isSignedIn.get()) await googleSignIn();

    const event = {
        summary: reservation.vehicle,
        description: `Doel: ${reservation.purpose}\nAantal personen: ${reservation.persons}\nAanvrager: ${reservation.user}`,
        start: { dateTime: new Date(reservation.from).toISOString() },
        end: { dateTime: new Date(reservation.to).toISOString() },
        reminders: { useDefault: true }
    };

    try {
        await gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });
        console.log("✔ Reservatie naar Google Calendar gepusht:", reservation.vehicle);
    } catch(err){
        console.error("⚠️ Fout bij push:", err);
    }
}

// -------------------- HAAL EVENTS VAN GOOGLE --------------------
async function fetchGoogleEvents() {
    if(!gapiInited) return;
    const nowISO = new Date().toISOString();
    try {
        const res = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            maxResults: 50,
            orderBy: 'startTime',
            singleEvents: true,
            timeMin: nowISO
        });

        const googleEvents = res.result.items.map(ev=>({
            id: ev.id,
            vehicle: ev.summary,
            purpose: ev.description || "",
            from: ev.start.dateTime || ev.start.date,
            to: ev.end.dateTime || ev.end.date,
            user: "Google Event",
            status: "Goedgekeurd"
        }));

        mergeGoogleEvents(googleEvents);

    } catch(err){
        console.warn("Agenda error:", err);
        const errorEl = document.getElementById("agenda-error");
        if(errorEl){
            errorEl.textContent = "Kan Google agenda niet laden…";
            errorEl.classList.remove("hidden");
        }
    }
}

// -------------------- MERGE GOOGLE + APP --------------------
function mergeGoogleEvents(googleEvents){
    // verwijder duplicaten (zelfde vehicle + start)
    const existingKeys = new Set(reservations.map(r=>r.vehicle+"|"+r.from));
    googleEvents.forEach(ev=>{
        const key = ev.vehicle+"|"+ev.from;
        if(!existingKeys.has(key)) reservations.push(ev);
    });

    save();
    render();
}

// -------------------- SAVE --------------------
function save(){ localStorage.setItem("reservations", JSON.stringify(reservations)); }

// -------------------- AUTOREMOVE VERLOPEN --------------------
function removeExpired(){
    const now = new Date();
    reservations = reservations.filter(r => new Date(r.to) >= now);
    save();
}
setInterval(removeExpired,60*1000);

// -------------------- RENDER --------------------
function render(){
    const wrap = document.getElementById("agenda");
    wrap.innerHTML = "";

    if(!reservations.length){
        wrap.innerHTML="<p>Geen aankomende evenementen.</p>";
        return;
    }

    reservations.forEach(r=>{
        const card = document.createElement("div");
        card.className="agenda-item";

        const dateStr = new Date(r.from).toLocaleDateString("nl-BE",{ weekday:"short", day:"2-digit", month:"short" });
        const timeStr = new Date(r.from).toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"}) +
                        " – " + new Date(r.to).toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"});

        card.innerHTML = `
            <div class="agenda-title">${r.vehicle}</div>
            <div class="agenda-datetime">${dateStr}, ${timeStr}</div>
            <div class="agenda-location">${r.purpose} | Aanvrager: ${r.user}</div>
            ${isAdmin ? `<button class="call-btn" style="background:#900;" onclick="removeReservation(${r.id})">🗑 Verwijderen</button>` : ""}
        `;
        wrap.appendChild(card);
    });
}

// -------------------- REMOVE RESERVATION --------------------
function removeReservation(id){
    if(!confirm("Weet je zeker dat je deze reservatie wil verwijderen?")) return;
    reservations = reservations.filter(r => r.id !== id);
    save();
    render();
}

// -------------------- INIT --------------------
render();
removeExpired();

// Als admin de pagina open, fetch Google events
if(isAdmin){
    setInterval(fetchGoogleEvents,5*60*1000);
}
