const currentUser = localStorage.getItem("userName") || "Onbekend";
const isAdmin = ["Jonas Weckhuysen","Patrick Van Hove","Danny Van den Bergh"].includes(currentUser);
const agendaEl = document.getElementById("agenda");
const todayEl = document.getElementById("today");
const loadingEl = document.getElementById("agenda-loading");

// -------------------- DATETIME --------------------
setInterval(() => {
  document.getElementById("datetime").textContent = new Date().toLocaleString("nl-BE");
}, 1000);

// -------------------- FIREBASE --------------------
const firebaseConfig = { databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// -------------------- GOOGLE API --------------------
let gapiInited = false;
let gapiAuthInstance = null;
function initGapi() {
    gapi.load('client:auth2', async () => {
        await gapi.client.init({
            apiKey: 'AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE',
            clientId: '440406636112-36khnms08f1bjkol1aqsl6ded5pj39jk.apps.googleusercontent.com',
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
            scope: "https://www.googleapis.com/auth/calendar.readonly"
        });
        gapiAuthInstance = gapi.auth2.getAuthInstance();
        gapiInited = true;
        loadAgenda(); // start laden na init
    });
}
initGapi();

async function googleSignIn() {
    if(!gapiInited) return alert("Google API nog niet geladen");
    if(!gapiAuthInstance.isSignedIn.get()) await gapiAuthInstance.signIn();
}

// -------------------- COMBINED AGENDA --------------------
async function loadAgenda() {
    loadingEl.textContent = "Even geduld…";

    try {
        // 1️⃣ Firebase events
        const fbSnapshot = await db.ref("reservations").once("value");
        const fbData = fbSnapshot.val() || {};
        const fbEvents = Object.keys(fbData).map(key => ({ id: key, ...fbData[key], source: 'firebase' }));

        // 2️⃣ Google Calendar events
        await googleSignIn();
        const now = new Date().toISOString();
        const response = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            timeMin: now,
            showDeleted: false,
            singleEvents: true,
            maxResults: 50,
            orderBy: 'startTime'
        });
        const gcEvents = (response.result.items || []).map(e => ({
            id: e.id,
            summary: e.summary,
            from: e.start.dateTime || e.start.date,
            to: e.end.dateTime || e.end.date,
            user: e.organizer?.displayName || "Google Calendar",
            purpose: e.description || "",
            persons: "",
            status: "Goedgekeurd",
            source: "google"
        }));

        // 3️⃣ Combine & sort
        const allEvents = [...fbEvents, ...gcEvents].sort((a,b)=> new Date(a.from) - new Date(b.from));

        renderAgenda(allEvents);

    } catch(err) {
        console.error("⚠️ Fout bij laden agenda:", err);
        document.getElementById("agenda-error").textContent = "Fout bij laden agenda. Controleer console.";
        loadingEl.style.display = "none";
    }
}

// -------------------- RENDER --------------------
function renderAgenda(events){
    agendaEl.innerHTML = "";
    loadingEl.style.display = "none";
    todayEl.textContent = "Vandaag: " + new Date().toLocaleDateString("nl-BE");

    events.forEach(e => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-header"><h3>${e.summary || e.vehicle}</h3></div>
            <div class="card-body">
                <div><strong>Van:</strong> ${new Date(e.from).toLocaleString("nl-BE")}</div>
                <div><strong>Tot:</strong> ${new Date(e.to).toLocaleString("nl-BE")}</div>
                <div><strong>Door:</strong> ${e.user}</div>
                ${e.purpose ? `<div><strong>Doel:</strong> ${e.purpose}</div>` : ""}
                ${e.persons ? `<div><strong>Personen:</strong> ${e.persons}</div>` : ""}
                ${e.source==='firebase' ? `<div><strong>Status:</strong> ${e.status}</div>` : ""}
            </div>
        `;
        agendaEl.appendChild(card);
    });
}
