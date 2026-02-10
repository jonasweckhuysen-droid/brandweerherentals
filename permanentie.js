/***********************
 * Firebase init
 ***********************/
firebase.initializeApp({
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/"
});

const db = firebase.database();

/***********************
 * DOM
 ***********************/
const container = document.getElementById("planningContainer");

/***********************
 * Planning laden
 ***********************/
db.ref("permanenties/planning")
  .limitToLast(1)
  .once("value")
  .then(snapshot => {

    // Geen planning gevonden
    if (!snapshot.exists()) {
      container.innerHTML = `
        <div class="geen-planning">
          Geen planning beschikbaar.
        </div>
      `;
      return;
    }

    // Laatste maand ophalen
    const laatsteMaand = Object.values(snapshot.val())[0];

    // Safety check
    if (!laatsteMaand) {
      container.innerHTML = `
        <div class="geen-planning">
          Planningstructuur ongeldig.
        </div>
      `;
      return;
    }

    // Elke dag renderen
    Object.values(laatsteMaand).forEach(dag => {

      if (!dag || !dag.datum || !dag.ploeg) return;

      const kaart = document.createElement("div");
      kaart.className = "planning-kaart";

      const datumTekst = new Date(dag.datum).toLocaleDateString(
        "nl-BE",
        { weekday: "long", day: "numeric", month: "long" }
      );

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
  })
  .catch(error => {
    console.error("Fout bij laden planning:", error);
    container.innerHTML = `
      <div class="geen-planning">
        Fout bij laden van de planning.
      </div>
    `;
  });
