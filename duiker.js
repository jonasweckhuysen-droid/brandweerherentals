// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ✅ JOUW FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAUkFsXiJ7MOIDFfC0AUk9DiT_BPIHzfEE",
  authDomain: "post-herentals.firebaseapp.com",
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "post-herentals",
  storageBucket: "post-herentals.firebasestorage.app",
  messagingSenderId: "762725561089",
  appId: "1:762725561089:web:38c46cc8cf44d624252100",
  measurementId: "G-C2FWECFEQX"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ Duikers
const duikers = [
  { naam: "Bart Boons", functie: "Duiker" },
  { naam: "Jef Leysen", functie: "Duiker" },
  { naam: "Wannes Verhegge", functie: "Duiker" },
  { naam: "Jonas Weckhuysen", functie: "Duiker" },
  { naam: "Danny Van den Bergh", functie: "Assistent" },
  { naam: "Patrick Van Hove", functie: "Assistent" },
  { naam: "Alain Leemans", functie: "Assistent" },
  { naam: "Kurt Cools", functie: "Assistent" },
  { naam: "Pedro Wallyn", functie: "Assistent" }
];

// ✅ Duikmomenten
const duikmomenten = [
  "2026-01-25 09:00",
  "2026-02-08 09:00",
  "2026-03-15 09:00",
  "2026-04-12 09:00",
  "2026-05-31 09:00",
  "2026-06-28 09:00",
  "2026-07-19 09:00",
  "2026-08-23 09:00",
  "2026-09-13 08:00",
  "2026-10-04 09:00",
  "2026-11-08 08:00",
  "2026-12-11 19:00"
];

const container = document.getElementById("duikAgendaContainer");

// ✅ Opmaak per duikmoment
duikmomenten.forEach(datum => {

  const dateKey = datum.replace(" ", "_").replace(":", "-");

  const card = document.createElement("div");
  card.className = "duik-card";

  const title = document.createElement("h3");
  title.textContent = `📅 ${datum}`;
  card.appendChild(title);

  const list = document.createElement("div");
  list.className = "duiker-lijst";

  duikers.forEach(duiker => {

    const row = document.createElement("div");
    row.className = "duiker-rij";

    const name = document.createElement("span");
    name.innerHTML = `<b>${duiker.naam}</b> <small>(${duiker.functie})</small>`;

    const input = document.createElement("input");
    input.type = "checkbox";

    const status = document.createElement("span");
    status.className = "status-label";

    // 🔥 Database pad
    const aanwezigheidRef = ref(db, `duikAanwezigheid/${dateKey}/${duiker.naam}`);

    input.addEventListener("change", () => {
      set(aanwezigheidRef, input.checked);
    });

    // ✅ Live update
    onValue(aanwezigheidRef, (snapshot) => {
      const val = snapshot.val();
      input.checked = val === true;

      if (val === true) {
        status.textContent = "Aanwezig ✅";
        status.className = "status-label aanwezig";
      } else if (val === false) {
        status.textContent = "Afwezig ❌";
        status.className = "status-label afwezig";
      } else {
        status.textContent = "Niet ingevuld ⚪";
        status.className = "status-label leeg";
      }
    });

    row.appendChild(name);
    row.appendChild(input);
    row.appendChild(status);

    list.appendChild(row);
  });

  card.appendChild(list);
  container.appendChild(card);
});
