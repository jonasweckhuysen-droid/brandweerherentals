document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("header");
    if (!header) return;

    // Datum
    const todayEl = document.createElement("div");
    todayEl.id = "today";
    todayEl.textContent = new Date().toLocaleDateString("nl-BE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    // Persoonlijke begroeting
    const greetingEl = document.createElement("div");
    greetingEl.id = "greeting";
    greetingEl.textContent = "Welkom Jonas 👋";

    // Ploeg van de week (één centrale waarde)
    const ploegVanWeek = "Ploeg B";  // <— pas dit op 1 plaats aan
    const ploegEl = document.createElement("div");
    ploegEl.id = "ploeg-week";
    ploegEl.textContent = `Ploeg van de week: ${ploegVanWeek}`;

    // Toevoegen aan de rechterkant
    const right = document.createElement("div");
    right.classList.add("header-right");
    right.appendChild(todayEl);
    right.appendChild(greetingEl);
    right.appendChild(ploegEl);

    // Toevoegen aan de header
    header.appendChild(right);
});
