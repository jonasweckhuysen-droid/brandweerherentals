// =====================================================
// agenda.js — 2-WEG SYNC + GOOGLE CALENDAR
// =====================================================

const CACHE_KEY = "agendaCacheV6";
const ETAG_KEY   = "agendaETagV6";
const API_KEY    = "AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE";
const CLIENT_ID  = "440406636112-36khnms08f1bjkol1aqsl6ded5pj39jk.apps.googleusercontent.com";
const CALENDAR_ID = "primary"; // of je specifieke calendar ID

const MAX_EVENTS = 50;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min

let reservations = JSON.parse(localStorage.getItem("reservations")) || [];
const currentUser = localStorage.getItem("userName") || "Onbekend";
const admins = ["Jonas Weckhuysen","Patrick Van Hove","Danny Van den Bergh"];
const isAdmin = admins.includes(currentUser);

// -----------------------------------------------------
// INIT GOOGLE API
// -----------------------------------------------------
let gapiInited = false;
let gapiAuthInstance = null;

function initGapi(){
    gapi.load('client:auth2', async () => {
        await gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
            scope: "https://www.googleapis.com/auth/calendar"
        });
        gapiAuthInstance = gapi.auth2.getAuthInstance();
        gapiInited = true;
        console.log("✅ Google API klaar");
        fetchGoogleEvents();
    });
}

async function googleSignIn(){
    if(!gapiInited) return alert("Google API niet geladen");
    const user = await gapiAuthInstance.signIn();
    console.log("Ingelogd als:", user.getBasicProfile().getName());
}

function googleSignOut(){
    if(!gapiInited) return;
    gapiAuthInstance.signOut();
    console.log("Uitgelogd");
}

// -----------------------------------------------------
// DATETIME UPDATE
// -----------------------------------------------------
setInterval(()=>{
    const el = document.getElementById("datetime");
    if(el) el.textContent = new Date().toLocaleString("nl-BE");
},1000);

// -----------------------------------------------------
// SAVE / RENDER
// -----------------------------------------------------
function save(){
    localStorage.setItem("reservations", JSON.stringify(reservations));
    render();
}

// Verwijder event
function removeReservation(id){
    reservations = reservations.filter(r=>r.id!==id);
    save();
}

// -----------------------------------------------------
// SUBMIT VOERTUIG RESERVATIE
// -----------------------------------------------------
function submitReservation(){
    const r = {
        id: Date.now() + Math.random(),
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
}

// -----------------------------------------------------
// APPROVE RESERVATIE
// -----------------------------------------------------
async function approve(id,status){
    reservations = reservations.map(r => r.id===id ? {...r,status} : r);
    save();
    render();

    if(status==="Goedgekeurd"){
        const approved = reservations.find(r=>r.id===id);
        if(approved) await pushToGoogleCalendar(approved);
    }
}

// -----------------------------------------------------
// PUSH EVENT NAAR GOOGLE CALENDAR
// -----------------------------------------------------
async function pushToGoogleCalendar(reservation){
    if(!gapiInited) return console.warn("gapi niet klaar");
    if(!gapiAuthInstance.isSignedIn.get()) await googleSignIn();

    const event = {
        summary: reservation.vehicle,
        description: `Doel: ${reservation.purpose}\nAantal personen: ${reservation.persons}\nAanvrager: ${reservation.user}`,
        start: { dateTime: new Date(reservation.from).toISOString() },
        end: { dateTime: new Date(reservation.to).toISOString() },
        reminders: { useDefault: true }
    };

    try{
        await gapi.client.calendar.events.insert({
            calendarId: CALENDAR_ID,
            resource: event
        });
        console.log("✔ Reservatie gepusht:", reservation.vehicle);
    } catch(err){
        console.error("⚠️ Fout bij push:", err);
    }
}

// -----------------------------------------------------
// FETCH EVENTS VAN GOOGLE CALENDAR
// -----------------------------------------------------
async function fetchGoogleEvents(){
    if(!gapiInited) return;
    if(!gapiAuthInstance.isSignedIn.get()) await googleSignIn();

    try{
        const nowISO = new Date().toISOString();
        const res = await gapi.client.calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: nowISO,
            maxResults: MAX_EVENTS,
            singleEvents: true,
            orderBy: 'startTime'
        });

        const googleEvents = res.result.items.map(ev=>({
            id: ev.id,
            vehicle: ev.summary || ev.description || "Event",
            summary: ev.summary || ev.description || "",
            purpose: ev.description || "",
            from: ev.start.dateTime || ev.start.date,
            to: ev.end.dateTime || ev.end.date,
            user: "Google Event",
            status: "Goedgekeurd"
        }));

        mergeGoogleEvents(googleEvents);

    } catch(err){
        console.error("⚠️ Kan Google Calendar niet ophalen:", err);
    }
}

// -----------------------------------------------------
// MERGE GOOGLE EVENTS MET LOKALE RESERVATIES
// -----------------------------------------------------
function mergeGoogleEvents(googleEvents){
    const now = new Date();
    // verwijder oude events
    reservations = reservations.filter(r=>new Date(r.from)>=now);

    const existingKeys = new Set(reservations.map(r=>{
        const title = r.vehicle || r.summary || "Event";
        return title + "|" + r.from;
    }));

    googleEvents.forEach(ev=>{
        const title = ev.vehicle || ev.summary || "Event";
        const key = title + "|" + ev.from;
        if(!existingKeys.has(key)){
            reservations.push(ev);
        }
    });

    save();
}

// -----------------------------------------------------
// RENDER FUNCTION
// -----------------------------------------------------
function render(){
    const wrap = document.getElementById("reservations");
    if(!wrap) return;

    wrap.innerHTML = "";

    reservations.forEach(r=>{
        const fromDate = new Date(r.from);
        const toDate = new Date(r.to);
        const dateStr = fromDate.toLocaleDateString("nl-BE",{weekday:"short",day:"2-digit",month:"short"});
        const timeStr = fromDate.toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"}) +
                        (r.to ? " – " + toDate.toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"}) : "");

        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <div class="card-header">
                <h3>${r.vehicle || r.summary}</h3>
            </div>
            <div class="card-body">
                <div><strong>Van:</strong> ${r.from}</div>
                <div><strong>Tot:</strong> ${r.to}</div>
                <div><strong>Door:</strong> ${r.user}</div>
                <div><strong>Doel:</strong> ${r.purpose}</div>
                <div><strong>Status:</strong> ${r.status}</div>

                ${
                    isAdmin && r.status === "In afwachting"
                    ? `<button class="call-btn" onclick="approve(${r.id}, 'Goedgekeurd')">✔ Goedkeuren & push</button>
                       <button class="call-btn" style="background:#444" onclick="approve(${r.id}, 'Afgekeurd')">✖ Afkeuren</button>`
                    : ""
                }

                ${isAdmin ? `<button class="call-btn" style="background:#900;" onclick="removeReservation('${r.id}')">🗑 Verwijderen</button>` : ""}
            </div>
        `;

        wrap.appendChild(card);
    });
}

// -----------------------------------------------------
// INIT
// -----------------------------------------------------
document.addEventListener("DOMContentLoaded",()=>{
    initGapi();
    render();
    setInterval(fetchGoogleEvents, REFRESH_INTERVAL);
});
