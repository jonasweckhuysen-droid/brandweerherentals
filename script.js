document.addEventListener("DOMContentLoaded", () => {
  // Laadanimatie
  const loader = document.createElement("div");
  loader.id = "loader";
  loader.innerHTML = `<div class="loader-ring"></div>`;
  document.body.appendChild(loader);

  // Header genereren
  const username = localStorage.getItem("username") || "Bezoeker";
  const ploeg = localStorage.getItem("ploegVanDeWeek") || "Ploeg A";
  const datum = new Date().toLocaleDateString("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  const header = document.createElement("header");
  header.innerHTML = `
    <div class="left-section">
      <h1>FireCrew Herentals</h1>
      <div class="greeting">Welkom, ${username}</div>
    </div>
    <div class="right-section">
      <div class="date">${datum}</div>
      <div class="team">Ploeg van de week: ${ploeg}</div>
    </div>
  `;
  document.body.prepend(header);

  // Footer toevoegen
  const footer = document.createElement("footer");
  footer.innerHTML = `&copy; ${new Date().getFullYear()} FireCrew Herentals`;
  document.body.appendChild(footer);

  // Laadanimatie verbergen na alles geladen is
  window.addEventListener("load", () => {
    loader.classList.add("hidden");
  });
});
