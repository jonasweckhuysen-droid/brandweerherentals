document.addEventListener("DOMContentLoaded", () => {
  // Toon vandaag
  document.getElementById("today").textContent =
    new Date().toLocaleDateString("nl-BE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

  loadAgenda();
});

async function loadAgenda() {
  const icsURL =
    "https://calendar.google.com/calendar/ical/df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727%40group.calendar.google.com/private-17d5bd8642d7c8b8e6f0e05b731579ac/basic.ics";

  const apiURL = "https://api.allorigins.win/raw?url=" + encodeURIComponent(icsURL);

  try {
    const response = await fetch(apiURL);
    if (!response.ok) throw new Error("Agenda niet bereikbaar");
    const text = await response.text();
    const events = parseICS(text);
    displayEvents(events);
  } catch (err) {
    document.getElementById("agenda-loading").classList.add("hidden");
    const errorEl = document.getElementById("agenda-error");
    errorEl.textContent = "Kan agenda niet laden…";
    errorEl.classList.remove("hidden");
    console.error(err);
  }
}

// ------- ICS parser (efficiënter) -------
function parseICS(text) {
  const events = [];
  const lines = text.split(/\r?\n/);
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT") {
      if (current && current.start) events.push(current);
      current = null;
    } else if (current) {
      if (line.startsWith("SUMMARY:")) current.summary = line.slice(8);
      else if (line.startsWith("LOCATION:")) current.location = line.slice(9);
      else if (line.startsWith("DTSTART")) current.start = parseDate(line);
      else if (line.startsWith("DTEND")) current.end = parseDate(line);
    }
  }

  const now = new Date();
  return events
    .filter(e => e.start >= now)
    .sort((a, b) => a.start - b.start)
    .slice(0, 50); // max 50 events voor snelle render
}

function parseDate(line) {
  const value = line.split(":")[1];
  if (!value) return null;

  if (/^\d{8}$/.test(value)) {
    return new Date(value.slice(0, 4), value.slice(4, 6) - 1, value.slice(6, 8));
  }
  if (/^\d{8}T\d{6}Z$/.test(value)) {
    return new Date(value.replace(/^(\d{4})(\d{2})(\d{2})T/, "$1-$2-$3T"));
  }

  return new Date(value);
}

// ------- Render (DocumentFragment voor snelheid) -------
function displayEvents(events) {
  const container = document.getElementById("agenda");
  document.getElementById("agenda-loading").classList.add("hidden");

  if (!events.length) {
    container.innerHTML = "<p>Geen aankomende evenementen.</p>";
    return;
  }

  const fragment = document.createDocumentFragment();

  events.forEach(ev => {
    const div = document.createElement("div");
    div.className = "agenda-item";

    const dateStr = ev.start.toLocaleDateString("nl-BE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });

    div.innerHTML = `
      <div class="agenda-title">${ev.summary}</div>
      <div class="agenda-datetime">${dateStr}</div>
      ${ev.location ? `<div class="agenda-location">${ev.location}</div>` : ""}
    `;
    fragment.appendChild(div);
  });

  container.innerHTML = ""; // oude content weg
  container.appendChild(fragment);
}
