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
db.ref("permanenties/planning")
  .limitToLast(1)
  .on("value", snapshot => {

    container.innerHTML = ""; // reset

    const data = snapshot.val();

    // 🔴 ABSOLUTE NULL CHECK
    if (!data || typeof data !== "object") {
      container.innerHTML = `
        <div class="geen-planning">
          Geen planning gevonden.
        </div>
      `;
      return;
    }

    // Laatste maand veilig ophalen
    const maanden = Object.values(data);
    if (maanden.length === 0) {
      container.innerHTML = `
        <div class="geen-planning">
          Geen planning gevonden.
        </div>
      `;
      return;
    }

    const laatsteMaand = maanden[0];

    // Elke dag renderen
    Object.values(laatsteMaand || {}).forEach(dag => {

      if (!dag || !dag.datum || !dag.ploeg) return;

      const kaart = document.createElement("div");
      kaart.className = "planning-kaart";

      const datum = new Date(dag.datum);
      const datumTekst = isNaN(datum)
        ? "-"
        : datum.toLocaleDateString("nl-BE", {
            weekday: "long",
            day: "numeric",
            month: "long"
          });

      kaart.innerHTML = `
        <div class="planning-datum">${datumTekst}</div>

        <div class="planning-rij">
          <i class="fa-solid fa-truck"></i>
          <span>Chauffeur</span>
          <b>${dag.ploeg.chauffeur || "-"}</b>
        </div>

        <div class="planning-rij">
          <i class="fa-solid fa-user-tie"></i>
          <span>Bevelvoerder</span>
          <b>${dag.ploeg.bevelvoerder || "-"}</b>
        </div>

        ${(dag.ploeg.brandweermannen || []).map(naam => `
          <div class="planning-rij">
            <i class="fa-solid fa-fire"></i>
            <span>Brandweerman</span>
            <b>${naam}</b>
          </div>
        `).join("")}

        <div class="planning-rij">
          <i class="fa-solid fa-graduation-cap"></i>
          <span>Stagiair</span>
          <b>${dag.ploeg.stagiair || "-"}</b>
        </div>
      `;

      container.appendChild(kaart);
    });
  }, error => {
    console.error("Firebase fout:", error);
    container.innerHTML = `
      <div class="geen-planning">
        Fout bij laden van planning.
      </div>
    `;
  });
