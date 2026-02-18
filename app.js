const WHATSAPP = "5513974125369";

function moneyBR(v){
  return (Number(v) || 0).toFixed(2).replace(".", ",");
}

function waLink(product){
  const msg = `Olá! Tenho interesse no ${product.brand} ${product.name}.
Tamanho: (confirmar)
Valor: R$ ${moneyBR(product.price)}
Tem disponível?`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

let all = [];
let brandSet = new Set();

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const brandFilter = document.getElementById("brandFilter");

function render(list){
  grid.innerHTML = list.map(p => `
    <article class="card">
      <img class="cardImg" src="${p.image}" alt="${p.brand} ${p.name}" loading="lazy" />
      <div class="cardBody">
        <div class="badge">${p.brand}</div>
        <h3 class="title">${p.name}</h3>
        <p class="meta">${p.description || "1ª linha premium"} • Numeração: <b>${p.sizes || "-"}</b></p>

        <div class="priceRow">
          <div>
            <div class="price">R$ ${moneyBR(p.price)}</div>
            <div class="small">Preço visível • confirmar disponibilidade</div>
          </div>
        </div>

        <div class="cardActions">
          <a class="btn" href="${waLink(p)}" target="_blank" rel="noreferrer">Fechar no WhatsApp</a>
          <a class="btn ghost" href="#top" onclick="navigator.clipboard?.writeText('${p.brand} ${p.name}');return false;">Copiar nome</a>
        </div>
      </div>
    </article>
  `).join("");
}

function applyFilters(){
  const q = (search.value || "").toLowerCase().trim();
  const b = brandFilter.value;

  const filtered = all.filter(p => {
    const matchBrand = !b || p.brand === b;
    const matchQuery = !q || (`${p.brand} ${p.name}`.toLowerCase().includes(q));
    return matchBrand && matchQuery;
  });

  render(filtered);
}

fetch("products.json")
  .then(r => r.json())
  .then(data => {
    all = data || [];

    // preencher marcas
    brandSet = new Set(all.map(p => p.brand).filter(Boolean));
    const brands = Array.from(brandSet).sort((a,b)=>a.localeCompare(b,"pt-BR"));

    brands.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      brandFilter.appendChild(opt);
    });

    document.getElementById("year").textContent = new Date().getFullYear();

    render(all);
    search.addEventListener("input", applyFilters);
    brandFilter.addEventListener("change", applyFilters);
  });
