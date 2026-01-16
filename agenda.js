const GOOGLE_EVENTS_KEY = "agendaEvents";
const API_KEY = "AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE";
const CALENDAR_ID = "df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727@group.calendar.google.com";

document.addEventListener("DOMContentLoaded", ()=>{
    fetchGoogleEventsAndDisplay();
});

async function fetchGoogleEventsAndDisplay(){
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?maxResults=50&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}&key=${API_KEY}`;
    try{
        const res = await fetch(url);
        const data = await res.json();
        let events = (data.items || []).map(ev=>({
            id: ev.id,
            summary: ev.summary,
            location: ev.location || "",
            from: ev.start?.dateTime || ev.start?.date,
            to: ev.end?.dateTime || ev.end?.date,
            origin: "google"
        }));

        // Voeg goedgekeurde app-reservaties toe
        const appReservations = JSON.parse(localStorage.getItem("reservations")||"[]")
            .filter(r=>r.status==="Goedgekeurd")
            .map(r=>({
                id: r.id,
                summary: `${r.vehicle} - ${r.user}`,
                location: `Doel: ${r.purpose}`,
                from: r.from,
                to: r.to,
                origin: "app"
            }));

        events = [...events, ...appReservations];
        localStorage.setItem(GOOGLE_EVENTS_KEY, JSON.stringify(events));
        displayEvents(events);

    }catch(err){
        console.error(err);
    }
}

function displayEvents(events){
    const container = document.getElementById("agenda");
    if(!container) return;
    container.innerHTML = "";

    const now = new Date();

    events.forEach(ev=>{
        if(new Date(ev.to)<now) return; // filter oud
        const dateStr = new Date(ev.from).toLocaleDateString("nl-BE",{ weekday:"short", day:"2-digit", month:"short" });
        const timeStr = new Date(ev.from).toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"}) +
                        " – "+ new Date(ev.to).toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"});
        const div = document.createElement("div");
        div.className = "agenda-item";
        div.innerHTML=`
            <div class="agenda-title">${ev.summary}</div>
            <div class="agenda-datetime">${dateStr}, ${timeStr}</div>
            ${ev.location? `<div class="agenda-location">${ev.location}</div>` : ""}
            ${isAdmin? `<button class="call-btn" style="background:#900" onclick="deleteEvent('${ev.id}')">🗑 Verwijderen</button>` : ""}
        `;
        container.appendChild(div);
    });
}

// -------------------- DELETE --------------------
async function deleteEvent(id){
    if(!isAdmin) return;

    let events = JSON.parse(localStorage.getItem(GOOGLE_EVENTS_KEY)||"[]");
    events = events.filter(ev=>ev.id!==id);
    localStorage.setItem(GOOGLE_EVENTS_KEY, JSON.stringify(events));
    displayEvents(events);

    // Google delete (OAuth vereist)
    if(gapi.auth2.getAuthInstance().isSignedIn.get()){
        try{
            await gapi.client.calendar.events.delete({calendarId:CALENDAR_ID,eventId:id});
        }catch(err){
            console.error("Kon niet verwijderen:",err);
        }
    }
}
