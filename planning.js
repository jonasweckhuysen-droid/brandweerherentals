(() => {

  /* -------------------------------------------------
     CONFIG
  ------------------------------------------------- */
  const firebaseUrl =
    document.querySelector('meta[name="firebase-db"]').content;

  const currentUser =
    document.querySelector('meta[name="wespen-username"]')?.content || "onbekend";

  const currentTeam =
    document.querySelector('meta[name="wespen-team"]')?.content || "A1";

  const db = firebase.database();

  const YEAR = new Date().getFullYear();
  const DEADLINE = new Date(`${YEAR}-02-15T23:59:59`);

  const REQUIRED_PER_DAY = 2;

  /* -------------------------------------------------
     HELPERS
  ------------------------------------------------- */
  const afterDeadline = () => new Date() > DEADLINE;

  const iso = d => d.toISOString().split("T")[0];

  const isAllowedDay = d => d.getDay() === 2 || d.getDay() === 6;

  /* -------------------------------------------------
     DATE GENERATION
  ------------------------------------------------- */
  function generateDates(holidays) {
    const dates = [];
    let d = new Date(YEAR, 2, 1);
    const end = new Date(YEAR, 10, 30);

    while (d <= end) {
      const key = iso(d);
      if (isAllowedDay(d) && !holidays[key]) {
        dates.push(key);
      }
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }

  /* -------------------------------------------------
     AVAILABILITY UI
  ------------------------------------------------- */
  async function buildAvailability() {
    const holidays =
      (await db.ref("wespenPlanning/holidays").get()).val() || {};

    const availability =
      (await db.ref("wespenPlanning/availability").get()).val() || {};

    const container = document.getElementById("datesContainer");
    container.innerHTML = "";

    const dates = generateDates(holidays);

    dates.forEach(date => {
      const row = document.createElement("div");
      row.className = "availability-row";

      const label = document.createElement("label");
      label.textContent = date;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.disabled = afterDeadline();

      cb.checked = availability[date]?.[currentUser] === true;

      cb.onchange = () => {
        db.ref(`wespenPlanning/availability/${date}/${currentUser}`)
          .set(cb.checked);
      };

      row.append(label, cb);
      container.appendChild(row);
    });
  }

  /* -------------------------------------------------
     SCHEDULE GENERATION (2 PERSONEN)
  ------------------------------------------------- */
  async function generateSchedule() {

    if (!afterDeadline()) {
      alert("Planning kan pas na 15 februari gegenereerd worden.");
      return;
    }

    const availability =
      (await db.ref("wespenPlanning/availability").get()).val() || {};

    const countersRef = db.ref("wespenPlanning/counters");
    const counters =
      (await countersRef.get()).val() || {};

    for (const date in availability) {

      const availableUsers = Object.entries(availability[date])
        .filter(([_, ok]) => ok)
        .map(([u]) => u)
        .sort((a, b) => (counters[a] || 0) - (counters[b] || 0));

      if (availableUsers.length < REQUIRED_PER_DAY) continue;

      const selected = availableUsers.slice(0, REQUIRED_PER_DAY);

      await db.ref(`wespenPlanning/schedule/${date}`).set({
        team: currentTeam,
        users: selected,
        generated: true
      });

      selected.forEach(u => {
        counters[u] = (counters[u] || 0) + 1;
      });
    }

    await countersRef.set(counters);
    alert("Planning gegenereerd ✅");
  }

  /* -------------------------------------------------
     SWAPS
  ------------------------------------------------- */
  function requestSwap(date) {
    const id = "swap_" + Date.now();
    db.ref(`wespenPlanning/swaps/${id}`).set({
      date,
      from: currentUser,
      to: null,
      status: "open"
    });
  }

  /* -------------------------------------------------
     INIT
  ------------------------------------------------- */
  document.getElementById("currentUser").textContent = currentUser;
  document.getElementById("currentTeam").textContent = currentTeam;

  document.getElementById("saveAvail")
    .onclick = () => alert("Beschikbaarheden worden automatisch opgeslagen");

  document.getElementById("generateSchedule")
    .onclick = generateSchedule;

  buildAvailability();

})();
