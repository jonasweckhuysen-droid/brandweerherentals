/*************************
 * Firebase init
 *************************/
firebase.initializeApp({
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/"
});

const db = firebase.database();
const container = document.getElementById("planningContainer");

/*************************
 * Planning laden
 *************************/
db.ref("permanenties/planning").on("value", snapshot => {

  console.log("RAW SNAPSHOT:", snapshot.val());

  container.innerHTML = "";

  const data = snapshot.val() ?? {};

  if (Object.keys(data).length === 0) {
    container.innerHTML = "<p>Geen planning gevonden.</p>";
    return;
  }

  // Pak eerste (laatste) node
  const maandKey = Object.keys(data)[0];
  const maand = data[maandKey] ?? {};

  Object.keys(maand).forEach(dagKey => {

    const dag = maand[dagKey];
    if (!dag || !dag.datum || !dag.ploeg) return;

    const kaart = document.createElement("div");
    kaart.className = "planning-kaart";

    const d = new Date(dag.datum);
    const datumTekst = isNaN(d)
      ? "-"
      : d.toLocaleDateString("nl-BE", {
          weekday: "long",
          day: "numeric",
          month: "long"
        });

    kaart.innerHTML = `
      <div class="planning-datum">${datumTekst}</div>

      <div class="planning-rij">
        <i class="fa-solid fa-truck"></i>
        <span>Chauffeur</span>
        <b>${dag.ploeg.chauffeur ?? "-"}</b>
      </div>

      <div class="planning-rij">
        <i class="fa-solid fa-user-tie"></i>
        <span>Bevelvoerder</span>
        <b>${dag.ploeg.bevelvoerder ?? "-"}</b>
      </div>

      ${(dag.ploeg.brandweermannen ?? []).map(n => `
        <div class="planning-rij">
          <i class="fa-solid fa-fire"></i>
          <span>Brandweerman</span>
          <b>${n}</b>
        </div>
      `).join("")}

      <div class="planning-rij">
        <i class="fa-solid fa-graduation-cap"></i>
        <span>Stagiair</span>
        <b>${dag.ploeg.stagiair ?? "-"}</b>
      </div>
    `;

    container.appendChild(kaart);
  });
});
