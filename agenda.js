/* =========================================================================
   AGENDA — Herentals Brandweer
   Ophaalservice + ICS parser + nette event cards
   ========================================================================= */

document.addEventListener("DOMContentLoaded", loadAgenda);

async function loadAgenda() {
  const agendaEl = document.getElementById("agenda");

  try {
    const response = await fetch("/brandweerherentals/agenda.php");

    if (!response.ok) {
      agendaEl.textContent = "Kan agenda niet laden…";
      return;
    }

    const icsText = await response.text();
    const events = parseICS(icsText);

    if (!events.length) {
      agendaEl.textContent = "Er zijn momenteel geen aankomende evenementen.";
      return;
    }

    // Sorteer events op datum
    events.sort((a, b) => a.start - b.start);

    // Toon events als cards
    agendaEl.innerHTML = "";
    events.forEach(ev => agendaEl.appendChild(renderEvent(ev)));

  } catch (error) {
    console.error(error);
    agendaEl.textContent = "Kan agenda niet laden…";
  }
}


/* =========================================================================
   ICS PARSER (simpel + snel)
   ========================================================================= */

function parseICS(data) {
  const lines = data.split(/\r?\n/);
  const events = [];
  let current = {};

  for (let line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {};
    }

    if (line.startsWith("DTSTART")) {
      current.start = parseICSDate(line.split(":")[1]);
    }

    if (line.startsWith("DTEND")) {
      current.end = parseICSDate(line.split(":")[1]);
    }

    if (line.startsWith("SUMMARY:")) {
      current.title = line.replace("SUMMARY:", "").trim();
    }

    if (line.startsWith("DESCRIPTION:")) {
      current.description = line.replace("DESCRIPTION:", "").trim();
    }

    if (line.startsWith("END:VEVENT")) {
      // Enkel toekomstige events tonen
      if (current.start && current.start >= new Date()) {
        events.push(current);
      }
    }
  }

  return events;
}

function parseICSDate(str) {
  // 20250122T180000Z
  return new Date(str);
}


/* =========================================================================
   RENDER EVENT CARD
   ========================================================================= */

function renderEvent(ev) {
  const card = document.createElement("div");
  card.className = "agenda-item";

  const dateBox = document.createElement("div");
  dateBox.className = "agenda-date";

  const d = ev.start.toLocaleDateString("nl-BE", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  });

  const time = ev.start.toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit"
  });

  dateBox.innerHTML = `
    <div class="agenda-day">${d}</div>
    <div class="agenda-time">${time}</div>
  `;

  const info = document.createElement("div");
  info.className = "agenda-info";

  info.innerHTML = `
    <div class="agenda-title">${ev.title || "Onbekend evenement"}</div>
    ${ev.description ? `<div class="agenda-description">${ev.description}</div>` : ""}
  `;

  card.appendChild(dateBox);
  card.appendChild(info);

  return card;
}
