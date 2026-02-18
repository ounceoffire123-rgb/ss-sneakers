(() => {
  const $ = (sel) => document.querySelector(sel);

  const els = {
    brandFilter: $("#brandFilter"),
    brandPills: $("#brandPills"),
    search: $("#search"),
    meta: $("#meta"),
    sections: $("#sections"),
    empty: $("#empty"),
    waTop: $("#waTop"),
    igTop: $("#igTop"),
    waFab: $("#waFab"),
    igFab: $("#igFab"),
    year: $("#year"),
  };

  const normalize = (s) =>
    (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

  const formatBRL = (v) => {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    return String(v ?? "");
  };

  const buildWa = (phone, text) =>
    `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  const uniqueByBrandName = (items) => {
    const seen = new Set();
    const out = [];
    for (const p of items) {
      const key = `${normalize(p.brand)}::${normalize(p.name)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  };

  let CONFIG = null;
  let PRODUCTS = [];
  let ACTIVE_BRAND = "all";

  const renderBrandPills = (brands) => {
    els.brandPills.innerHTML = "";
    const mk = (label, value) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pill" + (ACTIVE_BRAND === value ? " pill--active" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        ACTIVE_BRAND = value;
        els.brandFilter.value = value;
        [...els.brandPills.querySelectorAll(".pill")].forEach((x) =>
          x.classList.remove("pill--active")
        );
        b.classList.add("pill--active");
        render();
      });
      return b;
    };

    els.brandPills.appendChild(mk("Todas", "all"));
    brands.forEach((br) => els.brandPills.appendChild(mk(br, br)));
  };

  const fillBrandSelect = (brands) => {
    els.brandFilter.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "all";
    optAll.textContent = "Todas";
    els.brandFilter.appendChild(optAll);

    brands.forEach((br) => {
      const opt = document.createElement("option");
      opt.value = br;
      opt.textContent = br;
      els.brandFilter.appendChild(opt);
    });
    els.brandFilter.value = ACTIVE_BRAND;
  };

  const card = (p) => {
    const title = `${p.brand} ${p.name}`.trim();
    const sizes = p.sizes || "";
    const price = formatBRL(p.price);
    const img = p.image || "assets/images/placeholder.svg";
    const desc = p.description || "";

    const msg =
      `Olá! Vim pelo site da SS Sneakers.\n\n` +
      `Quero esse modelo:\n- ${title}\n- Numeração: ${sizes}\n- Valor: ${price}\n\n` +
      `Pode confirmar disponibilidade e prazo?`;

    const wa = buildWa(CONFIG.whatsapp, msg);

    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <img class="card__img" src="${img}" alt="${title}" loading="lazy" onerror="this.src='assets/images/placeholder.svg'">
      <div class="card__body">
        <div class="badge">${p.brand}</div>
        <h3 class="card__title">${p.name}</h3>
        <p class="card__meta">Numeração: <b>${sizes || "—"}</b></p>
        <div class="card__priceRow">
          <div class="card__price">${price}</div>
          <div class="card__sizes">${CONFIG.defaultSizesHint || ""}</div>
        </div>
        ${desc ? `<p class="card__desc">${desc}</p>` : ""}
        <div class="card__actions">
          <a class="smallbtn smallbtn--wa" href="${wa}" target="_blank" rel="noopener">Fechar no WhatsApp</a>
          ${
            CONFIG.instagram
              ? `<a class="smallbtn" href="${CONFIG.instagram}" target="_blank" rel="noopener">Ver Instagram</a>`
              : `<a class="smallbtn" href="#top">Instagram (add depois)</a>`
          }
        </div>
      </div>
    `;
    return el;
  };

  const groupByBrand = (items, brands) => {
    const map = new Map();
    brands.forEach((b) => map.set(b, []));
    items.forEach((p) => {
      if (!map.has(p.brand)) map.set(p.brand, []);
      map.get(p.brand).push(p);
    });
    return map;
  };

  const render = () => {
    const q = normalize(els.search.value);
    const selected = els.brandFilter.value || "all";
    ACTIVE_BRAND = selected;

    let filtered = PRODUCTS;

    if (selected !== "all") {
      filtered = filtered.filter((p) => p.brand === selected);
    }

    if (q) {
      filtered = filtered.filter((p) =>
        normalize(`${p.brand} ${p.name} ${p.description || ""}`).includes(q)
      );
    }

    els.meta.textContent = `${filtered.length} produto(s) encontrado(s)`;

    els.sections.innerHTML = "";
    els.empty.classList.toggle("hidden", filtered.length !== 0);

    // Render sections (always by brand, but only those with items)
    const grouped = groupByBrand(filtered, window.SS_BRANDS || []);
    for (const [brand, items] of grouped.entries()) {
      if (!items.length) continue;

      const section = document.createElement("section");
      section.className = "section";
      section.id = `brand-${normalize(brand).replace(/\s+/g, "-")}`;

      const head = document.createElement("div");
      head.className = "section__head";
      head.innerHTML = `
        <div class="section__title">${brand}</div>
        <div class="section__count">${items.length} item(ns)</div>
      `;

      const grid = document.createElement("div");
      grid.className = "grid";
      items.forEach((p) => grid.appendChild(card(p)));

      section.appendChild(head);
      section.appendChild(grid);

      els.sections.appendChild(section);
    }

    // Update pills active state
    [...els.brandPills.querySelectorAll(".pill")].forEach((x) => {
      x.classList.toggle("pill--active", x.textContent === selected || (selected === "all" && x.textContent === "Todas"));
    });
  };

  const initLinks = () => {
    // WhatsApp
    const baseMsg = "Olá! Vim pelo site da SS Sneakers e quero fechar um pedido.";
    const wa = buildWa(CONFIG.whatsapp, baseMsg);
    els.waTop.href = wa;
    els.waFab.href = wa;

    // Instagram (hide if missing)
    if (CONFIG.instagram && CONFIG.instagram.trim()) {
      els.igTop.href = CONFIG.instagram;
      els.igFab.href = CONFIG.instagram;
      els.igTop.style.display = "inline-flex";
      els.igFab.style.display = "grid";
    } else {
      els.igTop.style.display = "none";
      els.igFab.style.display = "none";
    }
  };

  const init = async () => {
    const [cfgRes, prodRes] = await Promise.all([
      fetch("./config.json", { cache: "no-store" }),
      fetch("./products.json", { cache: "no-store" }),
    ]);

    CONFIG = await cfgRes.json();
    const raw = await prodRes.json();
    PRODUCTS = uniqueByBrandName(Array.isArray(raw) ? raw : []);

    els.year.textContent = String(new Date().getFullYear());

    const brands = window.SS_BRANDS || [];
    fillBrandSelect(brands);
    renderBrandPills(brands);
    initLinks();

    // events
    els.search.addEventListener("input", render);
    els.brandFilter.addEventListener("change", () => {
      ACTIVE_BRAND = els.brandFilter.value || "all";
      // sync pills highlight by re-rendering pills
      renderBrandPills(brands);
      render();
    });

    render();
  };

  init().catch((e) => {
    console.error(e);
    els.meta.textContent = "Erro ao carregar o catálogo. Verifique products.json.";
  });
})();
