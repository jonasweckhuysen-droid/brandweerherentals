// =====================================================
// agenda.js — EXTREEM SNEL + ETag caching
// =====================================================

const CACHE_KEY = "agendaEventsV5";
const ETAG_KEY  = "agendaETagV5";
const ICS_URL   = "https://www.googleapis.com/calendar/v3/calendars/df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727%40group.calendar.google.com/events?key=AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE";

document.addEventListener("DOMContentLoaded", () => {
  showToday();
  loadCachedEvents();
  fetchLatestEvents();
});

// ======================================
// 🎁 Toon cached data onmiddellijk
// ======================================
function loadCachedEvents() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return;

  try {
    const events = JSON.parse(cached);
    displayEvents(events, true);
  } catch {}
}

// ======================================
// 📅 Datum onderaan
// ======================================
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

// ======================================
// ⚡ Supersnelle fetch met ETag support
// ======================================
async function fetchLatestEvents() {
  const lastETag = localStorage.getItem(ETAG_KEY) || "";

  const headers = lastETag ? { "If-None-Match": lastETag } : {};

  let res;
  try {
    res = await fetch(ICS_URL, { headers });
  } catch (err) {
    console.warn("Geen internet of Google niet bereikbaar.");
    return;
  }

  // ⏩ NIETS VERANDERD → gebruik cache
  if (res.status === 304) {
    console.log("Agenda: ongewijzigd (304), cache gebruikt");
    return;
  }

  if (!res.ok) return;

  // Nieuwe ETag opslaan
  const newEtag = res.headers.get("ETag");
  if (newEtag) localStorage.setItem(ETAG_KEY, newEtag);

  // Nieuwe data verwerken
  const data = await res.json();
  const events = cleanEvents(data.items || []);

  // Opslaan
  localStorage.setItem(CACHE_KEY, JSON.stringify(events));

  // Tonen
  displayEvents(events, false);
}

// ======================================
// 🧹 Maak events proper + sorteer
// ======================================
function cleanEvents(items) {
  const now = new Date();
  const result = [];

  const seen = new Set();

  for (const item of items) {
    const start = item.start?.dateTime
      ? new Date(item.start.dateTime)
      : new Date(item.start?.date);

    if (!start || start < now) continue;

    const end = item.end?.dateTime
      ? new Date(item.end.dateTime)
      : new Date(item.end?.date);

    const ev = {
      summary: item.summary || "",
      location: item.location || "",
      start,
      end
    };

    const key = `${ev.summary}|${start.toISOString()}|${end.toISOString()}`;

    if (seen.has(key)) continue;
    seen.add(key);

    result.push(ev);
  }

  return result.sort((a, b) => a.start - b.start);
}

// ======================================
// 🖼️ Display
// ======================================
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
    const start = ev.start;
    const end = ev.end;

    const dateStr = start.toLocaleDateString("nl-BE", {
      weekday: "short",
      day: "2-digit",
      month: "short"
    });

    const timeStr =
      start.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" }) +
      (end
        ? " – " + end.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })
        : "");

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
