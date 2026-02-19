/* SS Sneakers - app.js (com carrossel por produto: image1..image9 / images[]) */

function normalizeImagePath(p) {
  if (!p) return null;
  let s = String(p).trim();

  // troca \ por /
  s = s.replaceAll("\\", "/");

  // se não tiver extensão, assume .jpeg
  if (!/\.(png|jpg|jpeg|webp)$/i.test(s)) s += ".jpeg";

  return s;
}

function extractImages(product) {
  const imgs = [];

  // tenta ler image1..image9 (excel)
  for (let i = 1; i <= 9; i++) {
    const key = "image" + i;
    if (product && product[key]) {
      const norm = normalizeImagePath(product[key]);
      if (norm) imgs.push(norm);
    }
  }

  // se já tiver product.images, também funciona:
  if (Array.isArray(product?.images) && product.images.length) {
    product.images.forEach((x) => {
      const norm = normalizeImagePath(x);
      if (norm) imgs.push(norm);
    });
  }

  // remove duplicadas
  return [...new Set(imgs)];
}

function carouselHTML(images, altText = "") {
  const safeAlt = (altText || "").replaceAll('"', "'");

  const slides = images
    .map(
      (src, idx) => `
    <div class="carousel__slide" data-idx="${idx}">
      <img src="${src}" alt="${safeAlt} • foto ${idx + 1}" loading="lazy"
           onerror="this.src='assets/images/placeholder.svg'">
    </div>
  `
    )
    .join("");

  const dots = images
    .map(
      (_, idx) => `
    <button class="carousel__dot ${idx === 0 ? "is-active" : ""}"
            type="button" data-dot="${idx}" aria-label="Ir para foto ${
        idx + 1
      }"></button>
  `
    )
    .join("");

  const singleClass = images.length <= 1 ? "is-single" : "";

  return `
    <div class="carousel ${singleClass}">
      <div class="carousel__track" data-track>
        ${slides}
      </div>

      <div class="carousel__nav">
        <button class="carousel__btn carousel__btn--prev" type="button" data-prev aria-label="Foto anterior">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="carousel__btn carousel__btn--next" type="button" data-next aria-label="Próxima foto">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="carousel__dots" data-dots>
        ${dots}
      </div>
    </div>
  `;
}

function mountCarousels(root = document) {
  const carousels = root.querySelectorAll(".carousel");

  carousels.forEach((carousel) => {
    const track = carousel.querySelector("[data-track]");
    if (!track) return;

    const slides = Array.from(track.children);
    const dotsWrap = carousel.querySelector("[data-dots]");
    const dots = dotsWrap
      ? Array.from(dotsWrap.querySelectorAll(".carousel__dot"))
      : [];

    let index = 0;

    const goTo = (i) => {
      if (!slides.length) return;
      index = Math.max(0, Math.min(i, slides.length - 1));

      // slide ocupa 100% da largura do track (snap). offsetLeft funciona.
      const x = slides[index].offsetLeft;
      track.scrollTo({ left: x, behavior: "smooth" });

      dots.forEach((d, di) => d.classList.toggle("is-active", di === index));
    };

    carousel
      .querySelector("[data-prev]")
      ?.addEventListener("click", () => goTo(index - 1));
    carousel
      .querySelector("[data-next]")
      ?.addEventListener("click", () => goTo(index + 1));

    dots.forEach((d) => {
      d.addEventListener("click", () =>
        goTo(parseInt(d.dataset.dot, 10) || 0)
      );
    });

    // atualiza bolinha quando o usuário arrasta no scroll
    let raf = null;
    track.addEventListener("scroll", () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const left = track.scrollLeft;
        let best = 0,
          bestDist = Infinity;

        slides.forEach((s, i) => {
          const dist = Math.abs(s.offsetLeft - left);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });

        index = best;
        dots.forEach((d, di) => d.classList.toggle("is-active", di === index));
      });
    });

    // se tiver só 1 imagem, esconde nav/dots (css também pode fazer)
    if (slides.length <= 1) {
      carousel.querySelector(".carousel__nav")?.classList.add("hidden");
      carousel.querySelector(".carousel__dots")?.classList.add("hidden");
    }
  });
}

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
    const desc = p.description || "";

    // ✅ MULTI-IMAGENS
    const images = extractImages(p);
    const fallback = "assets/images/placeholder.svg";
    const safeImages = images.length ? images : [fallback];

    const msg =
      `Olá! Vim pelo site da SS Sneakers.\n\n` +
      `Quero esse modelo:\n- ${title}\n- Numeração: ${sizes}\n- Valor: ${price}\n\n` +
      `Pode confirmar disponibilidade e prazo?`;

    const wa = buildWa(CONFIG.whatsapp, msg);

    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <div class="card__media">
        ${carouselHTML(safeImages, title)}
      </div>

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

    // pills active
    [...els.brandPills.querySelectorAll(".pill")].forEach((x) => {
      x.classList.toggle(
        "pill--active",
        x.textContent === selected ||
          (selected === "all" && x.textContent === "Todas")
      );
    });

    // ✅ ativa carrosséis depois de renderizar
    mountCarousels(document);
  };

  const initLinks = () => {
    const baseMsg = "Olá! Vim pelo site da SS Sneakers e quero fechar um pedido.";
    const wa = buildWa(CONFIG.whatsapp, baseMsg);
    els.waTop.href = wa;
    els.waFab.href = wa;

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

    els.search.addEventListener("input", render);
    els.brandFilter.addEventListener("change", () => {
      ACTIVE_BRAND = els.brandFilter.value || "all";
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

