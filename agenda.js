// =====================================================
// agenda.js — TWEEWEG SYNCHRONISATIE + GOOGLE CALENDAR
// =====================================================

const CACHE_KEY = "agendaCacheV7";
const GOOGLE_EVENTS_KEY = "agendaEvents";
const API_KEY = "AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE";
const CALENDAR_ID = "df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727@group.calendar.google.com";

const MAX_EVENTS = 50;
const REFRESH_INTERVAL = 5 * 60 * 1000;

// --------------- INIT ----------------
document.addEventListener("DOMContentLoaded", async () => {
    showToday();
    loadCachedEvents();
    await fetchGoogleEvents();
    setInterval(fetchGoogleEvents, REFRESH_INTERVAL);
});

// -------------------- DATUM TONEN --------------------
function showToday() {
    const el = document.getElementById("today");
    if(el) el.textContent = new Date().toLocaleDateString("nl-BE", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}

// -------------------- CACHE --------------------
function loadCachedEvents() {
    const cached = JSON.parse(localStorage.getItem(GOOGLE_EVENTS_KEY) || "[]");
    displayEvents(cached);
}

// -------------------- GOOGLE FETCH --------------------
async function fetchGoogleEvents() {
    const timeMin = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?maxResults=${MAX_EVENTS}&orderBy=startTime&singleEvents=true&timeMin=${timeMin}&key=${API_KEY}`;

    try {
        const res = await fetch(url);
        if(!res.ok) throw new Error("Kan Google Calendar niet bereiken");
        const data = await res.json();

        const googleEvents = (data.items || []).map(ev => ({
            id: ev.id,
            summary: ev.summary,
            location: ev.location || "",
            from: ev.start?.dateTime || ev.start?.date,
            to: ev.end?.dateTime || ev.end?.date,
            origin: "google"
        }));

        // Bewaar in localStorage
        localStorage.setItem(GOOGLE_EVENTS_KEY, JSON.stringify(googleEvents));

        displayEvents(googleEvents);
    } catch(err) {
        console.error("Google fetch error:", err);
        const errorEl = document.getElementById("agenda-error");
        if(errorEl) { errorEl.textContent = "Kan Google agenda niet laden…"; errorEl.classList.remove("hidden"); }
    }
}

// -------------------- DISPLAY --------------------
function displayEvents(events) {
    const container = document.getElementById("agenda");
    if(!container) return;
    container.innerHTML = "";

    if(!events.length){
        container.innerHTML = "<p>Geen aankomende evenementen.</p>";
        return;
    }

    const now = new Date();

    events.forEach(ev => {
        // Filter oude events
        if(new Date(ev.to) < now) return;

        const dateStr = new Date(ev.from).toLocaleDateString("nl-BE", { weekday:"short", day:"2-digit", month:"short" });
        const timeStr = new Date(ev.from).toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"}) +
                        (ev.to ? " – " + new Date(ev.to).toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"}) : "");

        const div = document.createElement("div");
        div.className = "agenda-item";
        div.innerHTML = `
            <div class="agenda-title">${ev.summary}</div>
            <div class="agenda-datetime">${dateStr}, ${timeStr}</div>
            ${ev.location ? `<div class="agenda-location">${ev.location}</div>` : ""}
            ${isAdmin ? `<button class="call-btn" style="background:#900" onclick="deleteEvent('${ev.id}')">🗑 Verwijderen</button>` : ""}
        `;
        container.appendChild(div);
    });
}

// -------------------- PUSH NAAR GOOGLE --------------------
async function pushToGoogleCalendar(reservation){
    // Vereist OAuth 2.0 token
    if(!gapi.auth2) return console.warn("Google API niet geladen voor push");

    const token = gapi.auth.getToken().access_token;
    if(!token) return console.warn("Geen OAuth token beschikbaar");

    const body = {
        summary: `${reservation.vehicle} - ${reservation.user}`,
        location: `Doel: ${reservation.purpose}`,
        start: { dateTime: new Date(reservation.from).toISOString() },
        end: { dateTime: new Date(reservation.to).toISOString() }
    };

    try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if(!res.ok) throw new Error("Kon event niet pushen");
        const data = await res.json();
        console.log("Event gepusht:", data.id);

        // Voeg toe aan localStorage
        let events = JSON.parse(localStorage.getItem(GOOGLE_EVENTS_KEY) || "[]");
        events.push({
            id: data.id,
            summary: body.summary,
            location: body.location,
            from: body.start.dateTime,
            to: body.end.dateTime,
            origin: "app"
        });
        localStorage.setItem(GOOGLE_EVENTS_KEY, JSON.stringify(events));
        displayEvents(events);

    } catch(err) {
        console.error("Push fout:", err);
    }
}

// -------------------- DELETE EVENT --------------------
async function deleteEvent(id){
    if(!isAdmin) return;

    // Eerst uit localStorage verwijderen
    let events = JSON.parse(localStorage.getItem(GOOGLE_EVENTS_KEY) || "[]");
    events = events.filter(ev => ev.id !== id);
    localStorage.setItem(GOOGLE_EVENTS_KEY, JSON.stringify(events));
    displayEvents(events);

    // Verwijderen via Google Calendar API (OAuth vereist)
    try {
        const token = gapi.auth.getToken().access_token;
        if(token){
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${id}`,{
                method:"DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            console.log("Event verwijderd:", id);
        }
    } catch(err){
        console.error("Kon event niet verwijderen:", err);
    }
}
