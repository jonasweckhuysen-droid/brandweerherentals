// =====================================================
// agenda.js — Voertuigen agenda + goedkeuringen
// =====================================================

const CACHE_KEY = "agendaCacheV6";
const LOCAL_RES_KEY = "reservations";
const MAX_EVENTS = 50;
const REFRESH_INTERVAL = 5 * 60 * 1000;

const API_KEY = "AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE";
const CALENDAR_ID = "df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727@group.calendar.google.com";

const API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?maxResults=${MAX_EVENTS}&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}&key=${API_KEY}`;

// Admin check
const admins = ["Jonas Weckhuysen","Patrick Van Hove","Danny Van den Bergh"];
const currentUser = localStorage.getItem("userName") || "Onbekend";
const isAdmin = admins.includes(currentUser);

// Update datetime
setInterval(()=>{ document.getElementById("datetime").textContent = new Date().toLocaleString("nl-BE"); },1000);

// Load local reservations (goodkeuringen)
let reservations = JSON.parse(localStorage.getItem(LOCAL_RES_KEY)) || [];

// -------------------- RENDER --------------------
function render() {
    const container = document.getElementById("agenda");
    container.innerHTML = "";

    // filter oude events
    const now = new Date();
    reservations = reservations.filter(r => new Date(r.to) > now);
    localStorage.setItem(LOCAL_RES_KEY, JSON.stringify(reservations));

    if(!reservations.length) {
        container.innerHTML = "<p>Geen aankomende voertuigenreservaties.</p>";
        return;
    }

    reservations.forEach(r => {
        const card = document.createElement("div");
        card.className = "agenda-item";
        const dateStr = new Date(r.from).toLocaleDateString("nl-BE", {weekday:"short", day:"2-digit", month:"short"});
        const timeStr = new Date(r.from).toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"}) +
                        " – " + new Date(r.to).toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"});
        card.innerHTML = `
            <div class="agenda-title">${r.vehicle}</div>
            <div class="agenda-datetime">${dateStr}, ${timeStr}</div>
            <div><strong>Doel:</strong> ${r.purpose}</div>
            <div><strong>Aantal personen:</strong> ${r.persons}</div>
            <div><strong>Door:</strong> ${r.user}</div>
            ${isAdmin ? `<button class="call-btn" onclick="deleteReservation(${r.id})">Verwijder</button>` : ""}
        `;
        container.appendChild(card);
    });
}

// -------------------- DELETE --------------------
function deleteReservation(id) {
    reservations = reservations.filter(r => r.id !== id);
    localStorage.setItem(LOCAL_RES_KEY, JSON.stringify(reservations));
    render();
}

// -------------------- APPROVE PUSH --------------------
// Gebruik deze functie vanuit voertuigenreservatie pagina wanneer admin goedkeurt
function approveReservation(reservation) {
    reservation.status = "Goedgekeurd";
    reservations.push(reservation);
    localStorage.setItem(LOCAL_RES_KEY, JSON.stringify(reservations));
    render();

    // push naar Google Calendar via POST (OAuth2 vereist)
    if(isAdmin) {
        gapi.load('client:auth2', initGoogleClient.bind(null,reservation));
    }
}

// -------------------- GOOGLE CLIENT INIT --------------------
function initGoogleClient(reservation) {
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
    }).then(()=> gapi.auth2.getAuthInstance().signIn())
    .then(()=> pushToGoogleCalendar(reservation))
    .catch(err => console.warn("Google Calendar push error:", err));
}

// -------------------- PUSH EVENT --------------------
function pushToGoogleCalendar(r) {
    const event = {
        summary: r.vehicle,
        description: `Doel: ${r.purpose}\nAantal personen: ${r.persons}\nDoor: ${r.user}`,
        start: { dateTime: r.from },
        end: { dateTime: r.to },
    };
    gapi.client.calendar.events.insert({
        calendarId: CALENDAR_ID,
        resource: event
    }).then(response=>{
        console.log("Event toegevoegd aan Google Calendar:", response);
    }).catch(err=>{
        console.warn("Kan niet pushen naar Google Calendar:", err);
    });
}

// Init render
document.addEventListener("DOMContentLoaded", render);
