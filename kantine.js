let producten = [];
let winkelmand = {};

async function laadProducten() {
  const res = await fetch("stock.json");
  producten = await res.json();
  toonProducten();
}

function toonProducten() {
  const container = document.getElementById("producten");
  container.innerHTML = "";
  producten.forEach(prod => {
    const div = document.createElement("div");
    div.className = "product-card";
    div.innerHTML = `
      <h4>${prod.naam}</h4>
      <p>€${prod.prijs.toFixed(2)}</p>
      <p>Voorraad: ${prod.voorraad}</p>
      <div class="controls">
        <button onclick="wijzigAantal(${prod.id}, -1)">–</button>
        <span id="aantal-${prod.id}">0</span>
        <button onclick="wijzigAantal(${prod.id}, 1)">+</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function wijzigAantal(id, delta) {
  const prod = producten.find(p => p.id === id);
  if (!prod) return;
  const huidig = winkelmand[id] || 0;
  const nieuw = Math.max(0, Math.min(huidig + delta, prod.voorraad));
  winkelmand[id] = nieuw;
  document.getElementById(`aantal-${id}`).textContent = nieuw;
  updateCart();
}

function updateCart() {
  const list = document.getElementById("cart-list");
  const totalSpan = document.getElementById("cart-total");
  list.innerHTML = "";
  let totaal = 0;

  for (const id in winkelmand) {
    const prod = producten.find(p => p.id == id);
    const aantal = winkelmand[id];
    if (aantal > 0) {
      totaal += aantal * prod.prijs;
      list.innerHTML += `<li>${prod.naam} x ${aantal}</li>`;
    }
  }
  totalSpan.textContent = totaal.toFixed(2);
}

document.getElementById("confirm").addEventListener("click", () => {
  const betaling = document.getElementById("betaling").value;
  const tijd = new Date().toLocaleString("nl-BE");
  const bestellingen = [];

  for (const id in winkelmand) {
    const prod = producten.find(p => p.id == id);
    const aantal = winkelmand[id];
    if (aantal > 0) {
      bestellingen.push({
        tijd,
        product: prod.naam,
        aantal,
        bedrag: (aantal * prod.prijs).toFixed(2),
        betaling
      });
      prod.voorraad -= aantal;
    }
  }

  // Opslaan lokaal (kan later met Excel-API)
  const bestaande = JSON.parse(localStorage.getItem("bestellingen") || "[]");
  bestaande.push(...bestellingen);
  localStorage.setItem("bestellingen", JSON.stringify(bestaande));
  localStorage.setItem("stock", JSON.stringify(producten));

  document.getElementById("status").textContent = "✅ Bestelling opgeslagen!";
  winkelmand = {};
  toonProducten();
  updateCart();
});

window.onload = laadProducten;
