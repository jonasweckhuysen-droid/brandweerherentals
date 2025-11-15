// Voorbeeld evenementen (dit kan vervangen worden door echte data)
const events = [
  { title: "Oefening brandbestrijding", date: "18-11-2025", time: "19:00", location: "Kazerne Herentals" },
  { title: "Vergadering Firecrew", date: "20-11-2025", time: "20:00", location: "Vergaderzaal" },
  { title: "Open Dag", date: "25-11-2025", time: "10:00", location: "Kazerne Herentals" }
];

function renderAgenda(events) {
  const container = document.getElementById('agenda');
  const loading = document.getElementById('agenda-loading');
  const error = document.getElementById('agenda-error');

  loading.classList.add('hidden');
  error.classList.add('hidden');

  container.innerHTML = '';

  if (!events || events.length === 0) {
    container.innerHTML = '<div>Geen evenementen gevonden.</div>';
    return;
  }

  events.forEach(ev => {
    const div = document.createElement('div');
    div.className = 'agenda-item';
    div.innerHTML = `
      <div class="agenda-title">${ev.title}</div>
      <div class="agenda-datetime">📅 ${ev.date} ${ev.time}</div>
      <div class="agenda-location">📍 ${ev.location}</div>
    `;
    container.appendChild(div);
  });
}

// Datum in footer
function updateToday() {
  const todayEl = document.getElementById('today');
  const now = new Date();
  todayEl.textContent = now.toLocaleDateString('nl-BE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

// Initialisatie
renderAgenda(events);
updateToday();
setInterval(updateToday, 60000); // update elke minuut
