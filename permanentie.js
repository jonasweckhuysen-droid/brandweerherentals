firebase.initializeApp({
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/"
});
const db = firebase.database();

const container = document.getElementById("planningContainer");

db.ref("permanenties/planning").limitToLast(1).once("value", snap => {
  const maand = Object.values(snap.val() || {})[0];

  Object.values(maand).forEach(dag => {
    const kaart = document.createElement("div");
    kaart.className = "planning-kaart";

    kaart.innerHTML = `
      <div class="planning-datum">
        ${new Date(dag.datum).toLocaleDateString("nl-BE",{weekday:"long",day:"numeric",month:"long"})}
      </div>

      <div class="planning-rij">
        <i class="fa-solid fa-truck"></i>
        <span>Chauffeur</span>
        <b>${dag.ploeg.chauffeur}</b>
      </div>

      <div class="planning-rij">
        <i class="fa-solid fa-user-tie"></i>
        <span>Bevelvoerder</span>
        <b>${dag.ploeg.bevelvoerder}</b>
      </div>

      ${dag.ploeg.brandweermannen.map(n => `
        <div class="planning-rij">
          <i class="fa-solid fa-fire"></i>
          <span>Brandweerman</span>
          <b>${n}</b>
        </div>
      `).join("")}

      <div class="planning-rij">
        <i class="fa-solid fa-graduation-cap"></i>
        <span>Stagiair</span>
        <b>${dag.ploeg.stagiair}</b>
      </div>
    `;

    container.appendChild(kaart);
  });
});
