/*************************
 * Firebase init
 *************************/
firebase.initializeApp({
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/"
});

const db = firebase.database();

/*************************
 * Functie: maak planning
 *************************/
function maakPlanning() {

  // Lees alle beschikbare dagen
  db.ref("permanenties/beschikbaarheid").once("value")
    .then(snapshot => {

      const beschikbaarheid = snapshot.val() || {};
      if (Object.keys(beschikbaarheid).length === 0) {
        alert("Er is geen beschikbaarheid aangeduid.");
        return;
      }

      const planning = {};

      Object.keys(beschikbaarheid).forEach(datum => {
        const dag = beschikbaarheid[datum];

        // Ploeg samenstellen
        planning[datum] = {
          datum,
          ploeg: {
            chauffeur: dag.chauffeurs?.[0] || "-",      // eerste beschikbare chauffeur
            bevelvoerder: dag.bevelvoerders?.[0] || "-",// eerste beschikbare bevelvoerder
            brandweermannen: dag.brandweermannen || [], // alle beschikbare brandweermannen
            stagiair: dag.stagiairs?.[0] || "-"        // eerste stagiair
          }
        };
      });

      // Bepaal de maand voor opslaan
      const maanden = Object.keys(planning).map(d => d.slice(0,7)); // "YYYY-MM"
      const maand = maanden[0] || "onbekend";

      // Sla op in Firebase onder permanenties/planning
      return db.ref(`permanenties/planning/${maand}`).set(planning);

    })
    .then(() => {
      alert("Planning succesvol aangemaakt!");
    })
    .catch(err => {
      console.error("Fout bij aanmaken planning:", err);
      alert("Er is een fout opgetreden bij het maken van de planning.");
    });
}

/*************************
 * Event listener
 *************************/
// Bijvoorbeeld: knop met id="maakPlanningBtn"
const btn = document.getElementById("maakPlanningBtn");
if (btn) btn.addEventListener("click", maakPlanning);
