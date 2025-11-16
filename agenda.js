// =======================================================
// agenda.js — Ultra-fast Google Calendar loader + cache
// =======================================================

const CACHE_KEY = "agendaCacheV4";
const ICS_URL = "https://www.googleapis.com/calendar/v3/calendars/df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727%40group.calendar.google.com/events?key=AIzaSyDLOdqVeA-SSjSN-0RtzDP4R451nqov0lE";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minuten

document.addEventListener("DOMContentLoaded", () => {
  // Toon huidige datum in footer
  const todayEl = document.getElementById("today");
  if (todayEl) {
    todayEl.textContent = new Date().toLocaleDateString("nl-BE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  loadAgenda(); // eerste keer laden
  setInterval(loadAgenda, REFRESH_INTERVAL); // auto-refresh
});

// ===========================
// ⚡ Laad agenda
// ===========================
async function loadAgenda() {
  const now = Date.now();
  const cachedRaw = localStorage.getItem(CACHE_KEY);
  let cached = null;

  if (cachedRaw) {
    try {
      cached = JSON.parse(cachedRaw);
      // Toon cached events direct
      displayEvents(cached.events, true);
    } catch {}
  }

  try {
    const response = await fetch(ICS_URL);
    if (!response.ok) throw new Error("Google Calendar niet bereikbaar");

    const data = await response.json();

    // Converteer naar intern formaat
    const events = (data.items || [])
      .map(item => ({
        summary: item.summary || "",
        location: item.location || "",
        start: item.start?.dateTime ? new Date(item.start.dateTime) : new Date(item.start?.date),
        end: item.end?.dateTime ? new Date(item.end.dateTime) : new Date(item.end?.date)
      }))
      .filter(e => e.start && e.start >= new Date()); // alleen toekomstige events

    // Deduplicatie
    const seen = new Set();
    const uniqueEvents = events.filter(e => {
      const key = `${e.summary}|${e.start.toISOString()}|${e.end.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sorteer op startdatum
    uniqueEvents.sort((a, b) => a.start - b.start);

    // Update cache indien veranderd
    if (!cached || JSON.stringify(uniqueEvents) !== JSON.stringify(cached.events)) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ events: uniqueEvents, timestamp: now }));
      displayEvents(uniqueEvents, false);
    }
  } catch (err) {
    console.error("Agenda error:", err);

    if (!cached) {
      const loadingEl = document.getElementById("agenda-loading");
      if (loadingEl) loadingEl.classList.add("hidden");

      const errorEl = document.getElementById("agenda-error");
      if (errorEl) {
        errorEl.textContent = "Kan agenda niet laden…";
        errorEl.classList.remove("hidden");
      }
    }
  }
}

// ===========================
// 🖼️ Toon events
// ===========================
function displayEvents(events, fromCache = false) {
  const container = document.getElementById("agenda");
  if (!container) return;

  if (!fromCache) {
    const loadingEl = document.getElementById("agenda-loading");
    if (loadingEl) loadingEl.classList.add("hidden");
  }

  container.innerHTML = "";

  if (!events.length) {
    container.innerHTML = "<p>Geen aankomende evenementen.</p>";
    return;
  }

  events.forEach(ev => {
    const start = ev.start;
    const end = ev.end;

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
    container.appendChild(div);
  });
}
