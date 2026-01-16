// =====================================================
// agenda.js — GOOGLE + LOKALE RESERVATIES
// =====================================================

const CACHE_KEY = "agendaCacheV6";
const ETAG_KEY  = "agendaETagV6";
const API_KEY   = "AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE";
const CALENDAR_ID = "df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727@group.calendar.google.com";

const MAX_EVENTS = 50;
const REFRESH_INTERVAL = 5 * 60 * 1000;

const API_URL =
`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
`?maxResults=${MAX_EVENTS}&orderBy=startTime&singleEvents=true` +
`&timeMin=${new Date().toISOString()}&key=${API_KEY}`;

// --------------------
// ADMIN CHECK
// --------------------
const currentUser = localStorage.getItem("userName") || "";
const admins = [
  "Jonas Weckhuysen",
  "Patrick Van Hove",
  "Danny Van den Bergh"
];
const isAdmin = admins.includes(currentUser);

// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    showToday();
    loadCachedEvents();
    fetchLatestEvents();
    loadApprovedReservations();
    setInterval(fetchLatestEvents, REFRESH_INTERVAL);
});

// --------------------
// Datum onderaan
// --------------------
function showToday() {
    const el = document.getElementById("today");
    if (!el) return;

    el.textContent = new Date().toLocaleDateString("nl-BE", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
}

// =====================================================
// GOOGLE AGENDA
// =====================================================
function loadCachedEvents() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;

    try {
        const events = JSON.parse(cached);
        displayEvents(events, true);
    } catch {}
}

async function fetchLatestEvents() {
    const lastETag = localStorage.getItem(ETAG_KEY) || "";
    const headers = lastETag ? { "If-None-Match": lastETag } : {};

    try {
        const res = await fetch(API_URL, { headers, cache: "no-store" });
        if (res.status === 304) return;
        if (!res.ok) throw new Error();

        const newETag = res.headers.get("ETag");
        if (newETag) localStorage.setItem(ETAG_KEY, newETag);

        const data = await res.json();
        const events = processGoogleEvents(data.items || []);

        localStorage.setItem(CACHE_KEY, JSON.stringify(events));
        displayEvents(events, false);

    } catch {
        const errorEl = document.getElementById("agenda-error");
        if (errorEl) errorEl.classList.remove("hidden");
    }
}

function processGoogleEvents(items) {
    const now = new Date();
    return items
        .map(item => {
            const start = new Date(item.start?.dateTime || item.start?.date);
            const end   = new Date(item.end?.dateTime || item.end?.date);
            if (start < now) return null;

            return {
                type: "google",
                summary: item.summary || "",
                location: item.location || "",
                start,
                end
            };
        })
        .filter(Boolean)
        .sort((a,b) => a.start - b.start);
}

// =====================================================
// LOKALE RESERVATIES (GOEDGEKEURD)
// =====================================================
function loadApprovedReservations() {
    let reservations = JSON.parse(localStorage.getItem("reservations")) || [];
    const now = new Date();

    // automatisch oude reservaties verwijderen
    reservations = reservations.filter(r => new Date(r.to) > now);
    localStorage.setItem("reservations", JSON.stringify(reservations));

    const approved = reservations
        .filter(r => r.status === "Goedgekeurd")
        .map(r => ({
            type: "local",
            id: r.id,
            summary: `${r.vehicle} — ${r.user}`,
            location: r.purpose,
            start: new Date(r.from),
            end: new Date(r.to)
        }));

    displayEvents(approved, true);
}

// =====================================================
// WEERGAVE
// =====================================================
function displayEvents(events, fromCache) {
    const container = document.getElementById("agenda");
    if (!container) return;

    if (!fromCache) {
        const loading = document.getElementById("agenda-loading");
        if (loading) loading.classList.add("hidden");
    }

    if (!events.length && container.children.length === 0) {
        container.innerHTML = "<p>Geen aankomende reservaties.</p>";
        return;
    }

    for (const ev of events) {
        const dateStr = ev.start.toLocaleDateString("nl-BE", {
            weekday:"short", day:"2-digit", month:"short"
        });

        const timeStr =
            ev.start.toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"}) +
            " – " +
            ev.end.toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"});

        const div = document.createElement("div");
        div.className = "agenda-item";

        div.innerHTML = `
            <div class="agenda-title">${ev.summary}</div>
            <div class="agenda-datetime">${dateStr}, ${timeStr}</div>
            ${ev.location ? `<div class="agenda-location">${ev.location}</div>` : ""}
            ${
              isAdmin && ev.type === "local"
              ? `<button class="call-btn danger"
                    onclick="deleteReservation(${ev.id})">🗑 Verwijderen</button>`
              : ""
            }
        `;

        container.appendChild(div);
    }
}

// =====================================================
// ADMIN VERWIJDEREN
// =====================================================
function deleteReservation(id) {
    if (!confirm("Reservatie definitief verwijderen?")) return;

    let reservations = JSON.parse(localStorage.getItem("reservations")) || [];
    reservations = reservations.filter(r => r.id !== id);
    localStorage.setItem("reservations", JSON.stringify(reservations));

    location.reload();
}
