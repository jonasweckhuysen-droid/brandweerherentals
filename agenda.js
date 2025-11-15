<script>
document.addEventListener("DOMContentLoaded", () => {
  // Toon vandaag in footer
  document.getElementById("today").textContent =
    new Date().toLocaleDateString("nl-BE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

  loadAgenda();
});

// ===========================
// ⚡ Efficiënte agenda loader
// ===========================
async function loadAgenda() {
  const icsURL =
    "https://calendar.google.com/calendar/ical/df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727%40group.calendar.google.com/private-17d5bd8642d7c8b8e6f0e05b731579ac/basic.ics";

  const apiURL = "https://api.allorigins.win/raw?url=" + encodeURIComponent(icsURL);

  const cacheKey = "agendaCache";
  const cacheTime = 1000 * 60 * 10; // 10 minuten
  const now = Date.now();

  // Controleer cache
  const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
  if (cached && now - cached.timestamp < cacheTime) {
    displayEvents(cached.events);
    return;
  }

  try {
    const response = await fetch(apiURL);
    if (!response.ok) throw new Error("Agenda niet bereikbaar");
    const text = await response.text();
    const events = parseICS(text);

    // Cache opslaan
    localStorage.setItem(cacheKey, JSON.stringify({ events, timestamp: now }));

    displayEvents(events);
  } catch (err) {
    document.getElementById("agenda-loading").classList.add("hidden");
    const errorEl = document.getElementById("agenda-error");
    errorEl.textContent = "Kan agenda niet laden…";
    errorEl.classList.remove("hidden");
    console.error(err);
  }
}

// ===========================
// 📄 ICS parser
// ===========================
function parseICS(text) {
  const events = [];
  const lines = text.split(/\r?\n/);
  let current = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) current = {};
    else if (line.startsWith("END:VEVENT")) {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      if (line.startsWith("SUMMARY:")) current.summary = line.replace("SUMMARY:", "");
      if (line.startsWith("LOCATION:")) current.location = line.replace("LOCATION:", "");
      if (line.startsWith("DTSTART")) current.start = parseDate(line);
      if (line.startsWith("DTEND")) current.end = parseDate(line);
    }
  }

  const now = new Date();
  const maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // max 30 dagen vooruit

  return events
    .filter(e => e.start && e.start >= now && e.start <= maxDate)
    .sort((a, b) => a.start - b.start)
    .slice(0, 50); // maximaal 50 events
}

function parseDate(line) {
  let value = line.split(":")[1];
  if (!value) return null;

  if (/^\d{8}$/.test(value)) {
    return new Date(value.substring(0,4), value.substring(4,6)-1, value.substring(6,8));
  }
  if (/^\d{8}T\d{6}Z$/.test(value)) {
    return new Date(value.replace(/^(\d{4})(\d{2})(\d{2})T/, "$1-$2-$3T"));
  }

  return new Date(value);
}

// ===========================
// 🖼️ Render agenda
// ===========================
function displayEvents(events) {
  const container = document.getElementById("agenda");
  document.getElementById("agenda-loading").classList.add("hidden");

  if (!events.length) {
    container.innerHTML = "<p>Geen aankomende evenementen.</p>";
    return;
  }

  // Clear container
  container.innerHTML = "";

  events.forEach(ev => {
    const div = document.createElement("div");
    div.className = "agenda-item";

    const startOptions = { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" };
    const endOptions = { hour: "2-digit", minute: "2-digit" };

    const startStr = ev.start.toLocaleDateString("nl-BE", startOptions);
    const endStr = ev.end ? ev.end.toLocaleTimeString("nl-BE", endOptions) : "";

    div.innerHTML = `
      <div class="agenda-title">${ev.summary}</div>
      <div class="agenda-datetime">${startStr}${endStr ? " – " + endStr : ""}</div>
      ${ev.location ? `<div class="agenda-location">${ev.location}</div>` : ""}
    `;
    container.appendChild(div);
  });
}

// ===========================
// 🔁 Optioneel: ververs elke 10 minuten
// ===========================
setInterval(loadAgenda, 10 * 60 * 1000);
</script>
