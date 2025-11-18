// =====================================================
// agenda.js — EXTREEM SNEL + GEOPTIMALISEERD
// =====================================================

const CACHE_KEY = "agendaCacheV6";
const ETAG_KEY   = "agendaETagV6";
const API_KEY    = "AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE";
const CALENDAR_ID = "df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727@group.calendar.google.com";
const MAX_EVENTS = 50; // toon max 50 aankomende events
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minuten

const API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?maxResults=${MAX_EVENTS}&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}&key=${API_KEY}`;

document.addEventListener("DOMContentLoaded", () => {
    showToday();
    loadCachedEvents();
    fetchLatestEvents();
    setInterval(fetchLatestEvents, REFRESH_INTERVAL);
});

// --------------------
// Toon datum onderaan
// --------------------
function showToday() {
    const el = document.getElementById("today");
    if (!el) return;

    el.textContent = new Date().toLocaleDateString("nl-BE", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
}

// --------------------
// Gebruik cache direct
// --------------------
function loadCachedEvents() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;

    try {
        const events = JSON.parse(cached);
        displayEvents(events, true);
    } catch {}
}

// --------------------
// Haal nieuwste data met ETag
// --------------------
async function fetchLatestEvents() {
    const lastETag = localStorage.getItem(ETAG_KEY) || "";
    const headers = lastETag ? { "If-None-Match": lastETag } : {};

    try {
        const res = await fetch(API_URL, { headers, cache: "no-store" });
        if (res.status === 304) {
            console.log("Agenda: cache gebruikt (304)");
            return;
        }
        if (!res.ok) throw new Error("Kan Google Calendar niet bereiken");

        const newETag = res.headers.get("ETag");
        if (newETag) localStorage.setItem(ETAG_KEY, newETag);

        const data = await res.json();
        const events = processEvents(data.items || []);

        // Cache en toon
        localStorage.setItem(CACHE_KEY, JSON.stringify(events));
        displayEvents(events, false);

    } catch (err) {
        console.warn("Agenda error:", err);
        const errorEl = document.getElementById("agenda-error");
        if (errorEl) {
            errorEl.textContent = "Kan agenda niet laden…";
            errorEl.classList.remove("hidden");
        }
    }
}

// --------------------
// Verwerk events: filter oud, dedupe, sorteer
// --------------------
function processEvents(items) {
    const now = new Date();
    const seen = new Set();
    const events = [];

    for (const item of items) {
        const start = item.start?.dateTime ? new Date(item.start.dateTime) : new Date(item.start?.date);
        const end   = item.end?.dateTime ? new Date(item.end.dateTime) : new Date(item.end?.date);

        if (!start || start < now) continue;
        // Filter toekomst te ver weg (bv. max 180 dagen)
        const daysAhead = (start - now) / (1000 * 60 * 60 * 24);
        if (daysAhead > 180) continue;

        // unieke key gebaseerd op id (Google Calendar) of start+summary
        const key = item.id || `${start.toISOString()}|${item.summary}`;
        if (seen.has(key)) continue;
        seen.add(key);

        events.push({
            summary: item.summary || "",
            location: item.location || "",
            start,
            end
        });
    }

    // sorteer op starttijd
    return events.sort((a,b) => a.start - b.start);
}

// --------------------
// Toon events
// --------------------
function displayEvents(events, fromCache) {
    const container = document.getElementById("agenda");
    if (!container) return;

    if (!fromCache) {
        const loading = document.getElementById("agenda-loading");
        if (loading) loading.classList.add("hidden");
    }

    container.innerHTML = "";

    if (!events.length) {
        container.innerHTML = "<p>Geen aankomende evenementen.</p>";
        return;
    }

    for (const ev of events) {
        const dateStr = ev.start.toLocaleDateString("nl-BE", { weekday:"short", day:"2-digit", month:"short" });
        const timeStr = ev.start.toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"}) +
                        (ev.end ? " – " + ev.end.toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"}) : "");

        const div = document.createElement("div");
        div.className = "agenda-item";
        div.innerHTML = `
            <div class="agenda-title">${ev.summary}</div>
            <div class="agenda-datetime">${dateStr}, ${timeStr}</div>
            ${ev.location ? `<div class="agenda-location">${ev.location}</div>` : ""}
        `;

        container.appendChild(div);
    }
}
