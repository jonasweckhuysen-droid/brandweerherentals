document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("header");
    if (!header) return;

    // ——— Naam ophalen (dynamisch)
    const username = localStorage.getItem("username") || "Bezoeker";

    // ——— Datum
    const todayEl = document.createElement("div");
    todayEl.id = "today";
    todayEl.textContent = new Date().toLocaleDateString("nl-BE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    // ——— Dynamische begroeting
    const greetingEl = document.createElement("div");
    greetingEl.id = "greeting";
    greetingEl.textContent = `Welkom ${username} 👋`;

    // ——— Ploeg van de week (instelbaar)
    const ploegVanWeek = localStorage.getItem("ploegweek") || "Ploeg B";
    const ploegEl = document.createElement("div");
    ploegEl.id = "ploeg-week";
    ploegEl.textContent = `Ploeg van de week: ${ploegVanWeek}`;

    // ——— Container rechts
    const right = document.createElement("div");
    right.classList.add("header-right");
    right.appendChild(todayEl);
    right.appendChild(greetingEl);
    right.appendChild(ploegEl);

    // ——— Toevoegen aan header
    header.appendChild(right);
});
