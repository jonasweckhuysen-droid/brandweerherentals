/* -------------------- GEBRUIKER -------------------- */
const currentUser = window.currentUser;
const admins = ["Jonas Weckhuysen","Patrick Van Hove","Danny Van den Bergh"];
const isAdmin = admins.includes(currentUser);

/* -------------------- DATETIME -------------------- */
setInterval(() => {
    document.getElementById("datetime").textContent = new Date().toLocaleString("nl-BE");
}, 1000);

/* -------------------- DATA -------------------- */
let reservations = JSON.parse(localStorage.getItem("reservations")) || [];

/* -------------------- GOOGLE API INIT -------------------- */
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
        console.log("✅ Google API klaar");
        fetchGoogleEvents();
    });
}
initGapi();

async function googleSignIn() {
    if (!gapiInited) return alert("Google API nog niet geladen");
    if (!gapiAuthInstance.isSignedIn.get()) {
        await gapiAuthInstance.signIn();
    }
}

/* -------------------- PUSH NAAR GOOGLE -------------------- */
async function pushToGoogleCalendar(reservation) {
    if (!gapiInited) return console.warn("Google API nog niet klaar");
    await googleSignIn();

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
        console.log("✔ Reservatie gepusht:", reservation.vehicle);
    } catch (err) {
        console.error("⚠️ Fout bij push:", err);
    }
}

/* -------------------- FETCH VAN GOOGLE -------------------- */
async function fetchGoogleEvents() {
    if (!gapiInited) return;

    await googleSignIn();

    const now = new Date().toISOString();
    try {
        const response = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            timeMin: now,
            maxResults: 50,
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.result.items;
        if (events) {
            events.forEach(ev => {
                // Check of event al in localStorage staat
                if (!reservations.some(r => r.id == ev.id)) {
                    reservations.push({
                        id: ev.id,
                        vehicle: ev.summary,
                        from: ev.start.dateTime,
                        to: ev.end.dateTime,
                        purpose: ev.description.split('\n')[0].replace('Doel: ',''),
                        persons: ev.description.split('\n')[1].replace('Aantal personen: ',''),
                        user: ev.description.split('\n')[2].replace('Aanvrager: ',''),
                        status: "Goedgekeurd"
                    });
                }
            });
            save();
            renderAgenda();
        }
    } catch (err) {
        console.error("⚠️ Fout bij ophalen Google events:", err);
    }
}

/* -------------------- AUTOREMOVE VERLOPEN -------------------- */
function removeExpired() {
    const now = new Date();
    reservations = reservations.filter(r => new Date(r.to) >= now);
    save();
}
setInterval(removeExpired, 60*1000);

/* -------------------- SAVE -------------------- */
function save() {
    localStorage.setItem("reservations", JSON.stringify(reservations));
}

/* -------------------- RENDER AGENDA -------------------- */
function renderAgenda() {
    const wrap = document.getElementById("agenda");
    wrap.innerHTML = "";

    // Filter: admin ziet alles, gewone gebruiker alleen goedgekeurd
    const visibleReservations = isAdmin ? reservations : reservations.filter(r => r.status === "Goedgekeurd");

    visibleReservations.sort((a,b) => new Date(a.from) - new Date(b.from));

    visibleReservations.forEach(r => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-header"><h3>${r.vehicle}</h3></div>
            <div class="card-body">
                <div><strong>Van:</strong> ${new Date(r.from).toLocaleString()}</div>
                <div><strong>Tot:</strong> ${new Date(r.to).toLocaleString()}</div>
                <div><strong>Door:</strong> ${r.user}</div>
                <div><strong>Doel:</strong> ${r.purpose}</div>
                <div><strong>Personen:</strong> ${r.persons}</div>
                <div><strong>Status:</strong> ${r.status}</div>
                ${
                  isAdmin
                  ? `<button class="call-btn" style="background:#900;" onclick="removeReservation('${r.id}')">🗑 Verwijderen</button>`
                  : ""
                }
            </div>
        `;
        wrap.appendChild(card);
    });

    // Datum van vandaag
    document.getElementById("today").textContent = "Vandaag: " + new Date().toLocaleDateString("nl-BE");
}

/* -------------------- INIT -------------------- */
renderAgenda();
