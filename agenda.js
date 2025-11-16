// =====================================================
// agenda.js — ULTRA SNEL + ETag + Cache + Skeleton
// =====================================================

const CACHE_KEY = "agendaEventsV6";
const ETAG_KEY  = "agendaETagV6";
const API_KEY   = "AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE";
const CALENDAR_ID = "df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727@group.calendar.google.com";
const MAX_EVENTS = 20;

const API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?maxResults=${MAX_EVENTS}&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}&key=${API_KEY}`;

// ----------------------------
// INIT
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  showToday();
  loadCachedEvents();
  fetchLatestEvents();
});

// ----------------------------
// Toon datum onderaan
// ----------------------------
function showToday() {
  const el = document.getElementById("today");
  if (!el) return;

  el.textContent = new Date().toLocaleDateString("nl-BE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

// ----------------------------
// Toon cached data direct
// ----------------------------
function loadCachedEvents() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return;

  try {
    const events = JSON.parse(cached);
    displayEvents(events, true);
  } catch {}
}

// ----------------------------
// Fetch nieuwste events met ETag
// ----------------------------
async function fetchLatestEvents() {
  const lastETag = localStorage.getItem(ETAG_KEY) || "";
  const headers = lastETag ? { "If-None-Match": lastETag } : {};

  try {
    const res = await fetch(API_URL, { headers });
    
    if (res.status === 304) return; // ongewijzigd, cache blijft
    if (!res.ok) throw new Error("Google Calendar niet bereikbaar");

    const newETag = res.headers.get("ETag");
    if (newETag) localStorage.setItem(ETAG_KEY, newETag);

    const data = await res.json();
    const events = cleanEvents(data.items || []);

    localStorage.setItem(CACHE_KEY, JSON.stringify(events));
    displayEvents(events, false);

  } catch (err) {
    console.warn("Agenda error:", err);
    const container = document.getElementById("agenda-error");
    if (container) {
      container.textContent = "Kan agenda niet laden…";
      container.classList.remove("hidden");
    }
  }
}

// ----------------------------
// Clean & sort events
// ----------------------------
function cleanEvents(items) {
  const now = new Date();
  const seen = new Set();
  const events = [];

  for (const item of items) {
    const start = item.start?.dateTime ? new Date(item.start.dateTime) : new Date(item.start?.date);
    const end   = item.end?.dateTime   ? new Date(item.end.dateTime)   : new Date(item.end?.date);

    if (!start || start < now) continue;

    const key = `${item.summary}|${start.toISOString()}|${end.toISOString()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      summary: item.summary || "",
      location: item.location || "",
      start,
      end
    });
  }

  return events.sort((a,b) => a.start - b.start);
}

// ----------------------------
// Display events met fragment
// ----------------------------
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

  const frag = document.createDocumentFragment();

  for (const ev of events) {
    const start = ev.start;
    const end   = ev.end;

    const dateStr = start.toLocaleDateString("nl-BE", { weekday:"short", day:"2-digit", month:"short" });
    const timeStr = start.toLocaleTimeString("nl-BE", { hour:"2-digit", minute:"2-digit" }) +
                    (end ? " – " + end.toLocaleTimeString("nl-BE", { hour:"2-digit", minute:"2-digit" }) : "");

    const div = document.createElement("div");
    div.className = "agenda-item";
    div.innerHTML = `
      <div class="agenda-title">${ev.summary}</div>
      <div class="agenda-datetime">${dateStr}, ${timeStr}</div>
      ${ev.location ? `<div class="agenda-location">${ev.location}</div>` : ""}
    `;

    frag.appendChild(div);
  }

  container.appendChild(frag);
}
