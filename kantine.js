// ====================================================
// KANTINE.JS — Firecrew + Kantinebeheer integratie
// ====================================================

let producten = [];
let winkelmand = {};

// ===========================
// 🔹 Stock laden
// ===========================
async function laadProducten() {
  const savedStock = localStorage.getItem("stock");
  if (savedStock) {
    producten = JSON.parse(savedStock);
  } else {
    const res = await fetch("stock.json");
    producten = await res.json();

    // Voeg default min-waarde toe als niet aanwezig
    producten.forEach(p => {
      if (!p.min) p.min = 2; // voorbeeld minimum
    });

    localStorage.setItem("stock", JSON.stringify(producten));
  }
  toonProducten();
}

// ===========================
// 🔹 Producten tonen
// ===========================
function toonProducten() {
  const container = document.getElementById("producten");
  container.innerHTML = "";

  producten.forEach(prod => {
    const div = document.createElement("div");
    div.className = "product-card";

    // Kleuren bij minimum stock
    if (prod.voorraad <= prod.min) {
      div.style.border = "2px solid red";
      div.style.backgroundColor = "#ffe6e6";
    } else {
      div.style.border = "2px solid #ccc";
      div.style.backgroundColor = "#fff";
    }

    div.innerHTML = `
      <h4>${prod.naam}</h4>
      <p>€${prod.prijs.toFixed(2)}</p>
      <p>Voorraad: ${prod.voorraad} (min: ${prod.min})</p>
      <div class="controls">
        <button onclick="wijzigAantal(${prod.id}, -1)">–</button>
        <span id="aantal-${prod.id}">0</span>
        <button onclick="wijzigAantal(${prod.id}, 1)">+</button>
      </div>
    `;
    container.appendChild(div);
  });

  updateCart();
}

// ===========================
// 🔹 Aantal wijzigen
// ===========================
function wijzigAantal(id, delta) {
  const prod = producten.find(p => p.id === id);
  if (!prod) return;

  const huidig = winkelmand[id] || 0;
  const nieuw = Math.max(0, Math.min(huidig + delta, prod.voorraad));
  winkelmand[id] = nieuw;

  document.getElementById(`aantal-${id}`).textContent = nieuw;
  updateCart();
}

// ===========================
// 🔹 Winkelmand bijwerken
// ===========================
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

// ===========================
// 🔹 Bestelling bevestigen
// ===========================
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

      // 🔹 Pas stock aan
      prod.voorraad -= aantal;
    }
  }

  // Opslaan lokaal (kan later met Excel/API)
  const bestaande = JSON.parse(localStorage.getItem("bestellingen") || "[]");
  bestaande.push(...bestellingen);
  localStorage.setItem("bestellingen", JSON.stringify(bestaande));

  // 🔹 Stock opslaan zodat Firecrew wijzigingen up-to-date blijven
  localStorage.setItem("stock", JSON.stringify(producten));

  document.getElementById("status").textContent = "✅ Bestelling opgeslagen!";
  winkelmand = {};
  toonProducten();
  updateCart();
});

// ===========================
// 🔹 Firecrew stock aanpassen (grafisch, radio buttons)
// ===========================
function pasStockAan() {
  const container = document.getElementById("stock-aanpassen");
  container.innerHTML = "";

  const form = document.createElement("form");
  form.id = "stockForm";

  producten.forEach(prod => {
    const div = document.createElement("div");
    div.className = "radio-option";

    div.innerHTML = `
      <input type="radio" name="product" id="prod-${prod.id}" value="${prod.id}">
      <label for="prod-${prod.id}">${prod.naam} (voorraad: ${prod.voorraad}, min: ${prod.min})</label>
    `;
    form.appendChild(div);
  });

  const aantalInput = document.createElement("input");
  aantalInput.type = "number";
  aantalInput.id = "nieuwAantal";
  aantalInput.min = 0;
  aantalInput.placeholder = "Nieuw aantal";
  form.appendChild(aantalInput);

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.textContent = "✔️ Bevestig";
  submitBtn.addEventListener("click", () => {
    const selectedId = form.product.value;
    const nieuwAantal = parseInt(aantalInput.value);
    if (!selectedId || isNaN(nieuwAantal)) {
      alert("Kies een product en vul een geldig aantal in!");
      return;
    }
    updateStock(parseInt(selectedId), nieuwAantal);
    aantalInput.value = "";
  });
  form.appendChild(submitBtn);

  container.appendChild(form);
}

// ===========================
// 🔹 Update stock (Firecrew)
function updateStock(productId, nieuwAantal) {
  const prod = producten.find(p => p.id === productId);
  if (!prod) return;
  prod.voorraad = nieuwAantal;

  // Opslaan in localStorage zodat kantine-pagina up-to-date blijft
  localStorage.setItem("stock", JSON.stringify(producten));
  toonProducten();
}

// ===========================
// 🔹 INIT
window.onload = () => {
  laadProducten();
  if(document.getElementById("stock-aanpassen")){
    pasStockAan();
  }
};
