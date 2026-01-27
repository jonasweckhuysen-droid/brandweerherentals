(() => {

  /* --------------------------------------------------
     BASIS
  -------------------------------------------------- */
  const db = firebase.database();

  const currentUser =
    document.querySelector('meta[name="wespen-username"]').content;

  const currentTeam =
    document.querySelector('meta[name="wespen-team"]').content;

  document.getElementById("currentUser").textContent = currentUser;
  document.getElementById("currentTeam").textContent = currentTeam;

  const YEAR = new Date().getFullYear();
  const DEADLINE = new Date(`${YEAR}-02-15T23:59:59`);
  const REQUIRED = 2;

  const PLOEGEN = ["A1","B1","C1","A2","B2","C2"];

  /* --------------------------------------------------
     PLOEG BEREKENING
  -------------------------------------------------- */
  function getPloegForDate(date) {
    const ref = new Date(date.getFullYear(), 0, 1, 12, 0, 0);
    if (date < ref) {
      return getPloegForDate(new Date(date.getFullYear() - 1, 11, 31, 13));
    }
    const weeks = Math.floor((date - ref) / (7 * 24 * 60 * 60 * 1000));
    const startIndex = PLOEGEN.indexOf("A2");
    return PLOEGEN[(startIndex + weeks) % PLOEGEN.length];
  }

  /* --------------------------------------------------
     HELPERS
  -------------------------------------------------- */
  const afterDeadline = () => new Date() > DEADLINE;
  const iso = d => d.toISOString().split("T")[0];
  const allowedDay = d => d.getDay() === 2 || d.getDay() === 6;

  /* --------------------------------------------------
     GELDIGE DATUMS
  -------------------------------------------------- */
  async function getValidDates() {
    const holidays =
      (await db.ref("wespenPlanning/holidays").get()).val() || {};

    const dates = [];
    let d = new Date(YEAR, 2, 1);
    const end = new Date(YEAR, 10, 30);

    while (d <= end) {
      if (
        allowedDay(d) &&
        !holidays[iso(d)] &&
        getPloegForDate(d) === currentTeam
      ) {
        dates.push(iso(d));
      }
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }

  /* --------------------------------------------------
     BESCHIKBAARHEID
  -------------------------------------------------- */
  async function buildAvailability() {
    const dates = await getValidDates();
    const avail =
      (await db.ref("wespenPlanning/availability").get()).val() || {};

    const container = document.getElementById("datesContainer");
    container.innerHTML = "";

    dates.forEach(date => {
      const row = document.createElement("div");
      row.className = "availability-row";

      const label = document.createElement("label");
      label.textContent = date;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.disabled = afterDeadline();
      cb.checked = avail[date]?.[currentUser] === true;

      cb.onchange = () => {
        db.ref(`wespenPlanning/availability/${date}/${currentUser}`)
          .set(cb.checked);
      };

      row.append(label, cb);
      container.appendChild(row);
    });
  }

  /* --------------------------------------------------
     PLANNING GENEREREN (2 PERSONEN)
  -------------------------------------------------- */
  async function generateSchedule() {

    if (!afterDeadline()) {
      alert("Kan pas na 15 februari.");
      return;
    }

    const availability =
      (await db.ref("wespenPlanning/availability").get()).val() || {};

    const countersRef = db.ref("wespenPlanning/counters");
    const counters = (await countersRef.get()).val() || {};

    for (const date in availability) {

      const d = new Date(date);
      if (getPloegForDate(d) !== currentTeam) continue;

      const users = Object.entries(availability[date])
        .filter(([_, ok]) => ok)
        .map(([u]) => u)
        .sort((a, b) => (counters[a] || 0) - (counters[b] || 0));

      if (users.length < REQUIRED) continue;

      const selected = users.slice(0, REQUIRED);

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
    loadSchedule();
    alert("Planning gegenereerd");
  }

  /* --------------------------------------------------
     PLANNING TONEN
  -------------------------------------------------- */
  async function loadSchedule() {
    const sched =
      (await db.ref("wespenPlanning/schedule").get()).val() || {};

    const box = document.getElementById("scheduleContainer");
    box.innerHTML = "";

    Object.entries(sched).forEach(([date, data]) => {
      if (data.team !== currentTeam) return;

      const div = document.createElement("div");
      div.innerHTML = `
        <strong>${date}</strong> :
        ${data.users.join(" & ")}
        <button data-date="${date}">Omruil aanvragen</button>
      `;

      div.querySelector("button").onclick =
        () => requestSwap(date);

      box.appendChild(div);
    });
  }

  /* --------------------------------------------------
     SWAPS
  -------------------------------------------------- */
  function requestSwap(date) {
    const id = "swap_" + Date.now();
    db.ref(`wespenPlanning/swaps/${id}`).set({
      date,
      from: currentUser,
      to: null,
      status: "open"
    });
    alert("Omruil aangevraagd");
  }

  /* --------------------------------------------------
     INIT
  -------------------------------------------------- */
  document.getElementById("generateSchedule")
    .onclick = generateSchedule;

  buildAvailability();
  loadSchedule();

})();
