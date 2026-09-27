/* Alneran menu — vanilla JS, no build step. */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  /* ---------------- i18n ---------------- */
  const T = {
    ar: {
      brand: "النيران", tagline: "أشهى الوجبات والمقبلات الشامية بجميع أشكالها",
      call: "اتصل", directions: "الموقع", hours: "الدوام", popular: "الأكثر طلباً",
      search: "بحث", searchPh: "ابحث عن طبق…", close: "إغلاق", categories: "الأقسام",
      noResults: "لا توجد نتائج — جرّب كلمة أخرى", visit: "زورونا",
      hoursTitle: "ساعات العمل", hoursValue: "يومياً من 8:00 صباحاً حتى 2:00 بعد منتصف الليل",
      addressTitle: "العنوان", openMaps: "افتح في خرائط Google ←", phoneTitle: "الهاتف",
      phoneNote: "للطلبات والاستفسارات", ratingTitle: "تقييم Google",
      ratingNote: "511 تقييم · الزوار يرشّحون المنسف والشاورما اللحمة",
      showMap: "عرض الخريطة", footer: "مطعم النيران — عمّان", priceNote: "جميع الأسعار بالدينار الأردني",
      viewOrder: "عرض الطلب", cur: "د.أ",
      openNow: "مفتوح الآن", closesAt: "يغلق 2:00 ص", closingSoon: "يغلق قريباً · 2:00 ص",
      closedNow: "مغلق الآن", opensAt: "يفتح 8:00 ص",
      table: "طاولة", popularBadge: "الأكثر طلباً", serves: "يكفي {n} أشخاص",
      everyDay: ["كل أحد", "كل اثنين", "كل ثلاثاء", "كل أربعاء", "كل خميس", "كل جمعة", "كل سبت"],
      availableToday: "متوفر اليوم", todayTag: "طبق اليوم 🔥",
      add: "أضف للطلب", addMore: "أضف", note: "ملاحظة (اختياري) — مثال: بدون بصل",
      added: "أُضيف إلى طلبك", yourOrder: "طلبك", emptyOrder: "لم تضف أي طبق بعد",
      emptyHint: "اضغط + بجانب أي طبق لإضافته", total: "المجموع",
      tableNo: "رقم الطاولة", name: "الاسم (اختياري)", orderNotes: "ملاحظات على الطلب",
      dineIn: "في المطعم", takeaway: "سفري",
      sendWa: "أرسل الطلب عبر واتساب", clear: "مسح الطلب", cleared: "تم مسح الطلب",
      waHint: "سيُفتح واتساب برسالة جاهزة، فقط اضغط إرسال.",
      confirmClear: "مسح كل الأصناف من الطلب؟", langBtn: "EN", langLabel: "English",
      mapLoading: "جاري تحميل الخريطة…", items: "صنف",
    },
    en: {
      brand: "Alneran", tagline: "The finest Levantine meals & mezze, in every form",
      call: "Call", directions: "Location", hours: "Hours", popular: "Most loved",
      search: "Search", searchPh: "Search dishes…", close: "Close", categories: "Categories",
      noResults: "No dishes found — try another word", visit: "Visit us",
      hoursTitle: "Opening hours", hoursValue: "Daily 8:00 AM – 2:00 AM",
      addressTitle: "Address", openMaps: "Open in Google Maps →", phoneTitle: "Phone",
      phoneNote: "Orders & enquiries", ratingTitle: "Google rating",
      ratingNote: "511 reviews · guests recommend the mansaf and beef shawarma",
      showMap: "Show map", footer: "Alneran Restaurant — Amman", priceNote: "All prices in Jordanian dinars",
      viewOrder: "View order", cur: "JD",
      openNow: "Open now", closesAt: "Closes 2:00 AM", closingSoon: "Closing soon · 2:00 AM",
      closedNow: "Closed now", opensAt: "Opens 8:00 AM",
      table: "Table", popularBadge: "Most loved", serves: "Serves {n}",
      everyDay: ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"],
      availableToday: "Available today", todayTag: "Today's special 🔥",
      add: "Add to order", addMore: "Add", note: "Note (optional) — e.g. no onions",
      added: "Added to your order", yourOrder: "Your order", emptyOrder: "Your order is empty",
      emptyHint: "Tap + next to any dish to add it", total: "Total",
      tableNo: "Table number", name: "Name (optional)", orderNotes: "Order notes",
      dineIn: "Dine in", takeaway: "Takeaway",
      sendWa: "Send order on WhatsApp", clear: "Clear order", cleared: "Order cleared",
      waHint: "WhatsApp opens with the message ready — just tap send.",
      confirmClear: "Remove everything from your order?", langBtn: "عربي", langLabel: "العربية",
      mapLoading: "Loading map…", items: "items",
    },
  };
  let lang = store.get("alneran-lang", "ar") === "en" ? "en" : "ar";
  const t = (k) => T[lang][k] ?? k;
  const nm = (o) => (lang === "en" ? o.en : o.ar) || o.ar;
  const ds = (o) => (lang === "en" ? o.desc_en : o.desc_ar) || "";
  const money = (p) => `<span class="num">${p.toFixed(2)}</span><small>${t("cur")}</small>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------- Logo (vector, animated) ---------------- */
  const flame = (x, base, h, w, lean) => {
    const l = x - w / 2, r = x + w / 2, tx = x + lean, ty = base - h;
    return `M${l} ${base}C${l} ${base - h * 0.45} ${tx - w * 0.2} ${base - h * 0.72} ${tx} ${ty}C${tx + w * 0.4} ${base - h * 0.6} ${r} ${base - h * 0.42} ${r} ${base}C${r} ${base + w * 0.5} ${l} ${base + w * 0.5} ${l} ${base}Z`;
  };
  const EGG = "M84 44C56 52 38 82 38 120C38 162 66 194 100 194C136 194 162 164 162 122C162 104 158 90 151 79L174 67L147 63C139 50 125 42 110 41";
  const WING = "M104 172C78 170 57 151 55 115C64 132 76 142 90 146C80 134 73 121 73 104C84 125 98 138 117 142C115 157 111 166 104 172Z";
  let logoN = 0;
  function logoSVG(kind) {
    const id = `l${++logoN}`;
    const full = kind === "full";
    const heat = full && !reduceMotion
      ? `<filter id="${id}h" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.018 0.07" numOctaves="1" seed="4"><animate attributeName="baseFrequency" dur="5s" values="0.018 0.07;0.024 0.1;0.018 0.07" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" scale="6"/></filter>`
      : "";
    const sparks = full ? `<g class="sparks" fill="#ffd45a">${[[92, 16, -8, 0], [104, 6, 5, 0.9], [118, 20, 9, 1.7], [98, 26, -3, 2.3], [112, 10, -6, 1.2]].map(([x, y, dx, d]) => `<circle cx="${x}" cy="${y}" r="1.7" style="--dx:${dx}px;animation-delay:${d}s"/>`).join("")}</g>` : "";
    const word = full ? `<text class="word" x="100" y="252" text-anchor="middle" font-family="'Baloo Bhaijaan 2', Tajawal, sans-serif" font-weight="800" font-size="64" fill="url(#${id}w)" stroke="#8f230b" stroke-width="5" stroke-linejoin="round" paint-order="stroke">النيران</text>` : "";
    return `<svg class="logo-svg" viewBox="${full ? "20 -8 160 282" : "30 0 150 200"}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a1f"/><stop offset=".45" stop-color="#ffc22e"/><stop offset="1" stop-color="#ffe98a"/></linearGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset=".5" stop-color="#ffc02e"/><stop offset="1" stop-color="#f7901f"/></linearGradient>
        <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe98a"/><stop offset=".6" stop-color="#ffc22e"/><stop offset="1" stop-color="#ff9b24"/></linearGradient>
        <radialGradient id="${id}c" cx=".5" cy=".75" r=".6"><stop offset="0" stop-color="#fff8d6"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>
        ${heat}
      </defs>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path class="egg-back egg-path" d="${EGG}" stroke-width="14"/>
        <path class="egg-path" d="${EGG}" stroke="url(#${id}s)" stroke-width="8"/>
      </g>
      <g class="flames-g"${heat ? ` filter="url(#${id}h)"` : ""}>
        <g stroke="#b8350f" stroke-width="3" stroke-linejoin="round" fill="url(#${id}f)">
          <path class="flame comb-1" d="${flame(88, 48, 36, 17, -5)}"/>
          <path class="flame comb-3" d="${flame(118, 49, 30, 14, 8)}"/>
          <path class="flame comb-2" d="${flame(103, 46, 46, 19, 3)}"/>
          <path class="flame inner" d="${flame(111, 130, 68, 17, -7)}"/>
          <path class="flame wing" d="${WING}"/>
        </g>
        <path class="flame core" d="${flame(111, 126, 34, 8, -4)}" fill="url(#${id}c)"/>
        <path class="flame core" d="${flame(103, 44, 22, 8, 2)}" fill="url(#${id}c)"/>
      </g>
      ${sparks}${word}
    </svg>`;
  }
  const phLogo = `<svg viewBox="30 0 150 200" aria-hidden="true"><path d="${EGG}" fill="none" stroke="#f57a1f" stroke-opacity=".55" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><g fill="#f57a1f" fill-opacity=".5"><path d="${flame(88, 48, 36, 17, -5)}"/><path d="${flame(103, 46, 46, 19, 3)}"/><path d="${flame(118, 49, 30, 14, 8)}"/><path d="${flame(111, 130, 68, 17, -7)}"/><path d="${WING}"/></g></svg>`;
  function mountLogos() {
    $$("[data-logo]").forEach((el) => {
      el.classList.add(`logo-${el.dataset.logo}`);
      el.innerHTML = logoSVG(el.dataset.logo);
    });
  }

  /* ---------------- Embers background ---------------- */
  function embers() {
    const cv = $("#embers");
    const ctx = cv.getContext("2d");
    let W, H, dpr, parts = [], raf = 0, running = true;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const spawn = (p = {}, anywhere = false) => Object.assign(p, {
      x: rnd(0, W), y: anywhere ? rnd(0, H) : H + rnd(0, 40),
      r: rnd(0.6, 2.3), vy: rnd(0.25, 1.05), vx: rnd(-0.15, 0.15),
      a: rnd(0.35, 0.95), w: rnd(0.004, 0.02), ph: rnd(0, 6.28),
      hue: rnd(18, 46), life: 0, max: rnd(360, 900),
    });
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, Math.max(26, W / 9)));
      while (parts.length < n) parts.push(spawn({}, true));
      parts.length = n;
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        p.life++; p.ph += p.w;
        p.y -= p.vy; p.x += p.vx + Math.sin(p.ph) * 0.35;
        const fade = Math.min(1, p.life / 60) * Math.max(0, 1 - p.life / p.max) * Math.min(1, p.y / (H * 0.25));
        if (p.y < -10 || p.life > p.max) { spawn(p); continue; }
        const al = p.a * fade;
        ctx.fillStyle = `hsla(${p.hue},100%,60%,${al * 0.18})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
        ctx.fillStyle = `hsla(${p.hue + 8},100%,${70 + p.r * 6}%,${al})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      if (running) raf = requestAnimationFrame(draw);
    }
    size();
    addEventListener("resize", () => { size(); if (reduceMotion) draw(); }, { passive: true });
    if (reduceMotion) { running = false; draw(); return; }
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(draw);
    });
    raf = requestAnimationFrame(draw);
  }

  /* ---------------- Time helpers (Asia/Amman) ---------------- */
  function ammanNow() {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Amman", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const get = (k) => parts.find((p) => p.type === k)?.value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day, mins: +get("hour") * 60 + +get("minute") };
  }
  function openState() {
    const { mins } = ammanNow();
    const open = mins >= 8 * 60 || mins < 2 * 60;
    const soon = open && mins < 2 * 60 && mins >= 60;
    return { open, soon };
  }
  function renderStatus() {
    const s = openState();
    const el = $("#openStatus");
    el.classList.toggle("closed", !s.open);
    const txt = s.open ? `${t("openNow")} · ${s.soon ? t("closingSoon") : t("closesAt")}` : `${t("closedNow")} · ${t("opensAt")}`;
    $("span", el).textContent = txt;
    $("#openStatus2").textContent = txt;
  }

  /* ---------------- Data & state ---------------- */
  let DATA = null;
  const byId = new Map();
  let cart = store.get("alneran-cart", []);
  let order = store.get("alneran-order", { type: "dine", name: "", notes: "" });
  let table = null;
  try {
    const q = new URLSearchParams(location.search);
    const tq = (q.get("t") || q.get("table") || "").trim();
    if (/^[\w-]{1,6}$/.test(tq)) { table = tq; sessionStorage.setItem("alneran-table", tq); }
    else table = sessionStorage.getItem("alneran-table");
  } catch { /* storage blocked */ }

  const lineKey = (id, opt, note) => `${id}|${opt ?? ""}|${note || ""}`;
  const unitPrice = (item, opt) => (item.choice && opt != null ? item.choice.options[opt].price : item.price);
  const cartQty = (id) => cart.filter((l) => l.id === id).reduce((a, l) => a + l.qty, 0);
  const cartCount = () => cart.reduce((a, l) => a + l.qty, 0);
  const cartTotal = () => cart.reduce((a, l) => { const it = byId.get(l.id); return it ? a + unitPrice(it, l.opt) * l.qty : a; }, 0);
  function saveCart() {
    cart = cart.filter((l) => l.qty > 0 && byId.has(l.id));
    store.set("alneran-cart", cart);
    renderCartBar();
    $$(".add-btn[data-id]").forEach((b) => paintAddBtn(b, +b.dataset.id));
  }
  function addToCart(id, opt = null, qty = 1, note = "") {
    const k = lineKey(id, opt, note);
    const l = cart.find((x) => lineKey(x.id, x.opt, x.note) === k);
    if (l) l.qty += qty; else cart.push({ id, opt, qty, note });
    saveCart();
  }

  /* ---------------- Rendering ---------------- */
  function thumb(item, cls = "") {
    if (item.img) {
      return `<div class="thumb ${cls}"><img src="/${item.img}" alt="" loading="lazy" decoding="async" onload="this.classList.add('loaded')"></div>`;
    }
    return `<div class="thumb ph ${cls}">${phLogo}</div>`;
  }
  function badges(item, today) {
    const b = [];
    if (item.popular) b.push(`<span class="badge hot">${t("popularBadge")}</span>`);
    if (item.day != null) b.push(item.day === today ? `<span class="badge today">${t("availableToday")}</span>` : `<span class="badge">${t("everyDay")[item.day]}</span>`);
    if (item.serves) b.push(`<span class="badge">${t("serves").replace("{n}", item.serves)}</span>`);
    return b.length ? `<div class="badges">${b.join("")}</div>` : "";
  }
  const plusIco = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
  function paintAddBtn(btn, id) {
    const q = cartQty(id);
    btn.innerHTML = q ? `<span class="qty">${q}</span>` : plusIco;
    btn.setAttribute("aria-label", `${t("add")} — ${nm(byId.get(id))}`);
  }

  function render() {
    const { day } = ammanNow();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = lang === "ar" ? "مطعم النيران | المنيو" : "Alneran Restaurant | Menu";
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    $$("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    const lb = $("#langBtn"); lb.textContent = t("langBtn"); lb.setAttribute("aria-label", t("langLabel"));
    $("#addressText").textContent = lang === "ar" ? DATA.restaurant.address_ar : DATA.restaurant.address_en;
    $(".hero-logo").setAttribute("aria-label", lang === "ar" ? "شعار مطعم النيران" : "Alneran logo");
    const tc = $("#tableChip");
    tc.hidden = !table; tc.textContent = table ? `${t("table")} ${table}` : "";
    renderStatus();

    // Today's special
    const todays = DATA.categories.flatMap((c) => c.items).filter((i) => i.day === day);
    const td = $("#today");
    td.hidden = !todays.length;
    td.innerHTML = todays.map((i) => `<button class="today-card" data-open="${i.id}">${thumb(i)}<div><div class="tag">${t("todayTag")}</div><h3>${esc(nm(i))}</h3><div class="price">${money(i.price)}</div></div></button>`).join("");

    // Popular rail (photos first)
    const pop = DATA.categories.flatMap((c) => c.items).filter((i) => i.popular).sort((a, b) => !!b.img - !!a.img);
    $("#popular").innerHTML = pop.map((i) => `<button class="pop-card" data-open="${i.id}"><div class="media">${thumb(i)}</div><div class="body"><h3>${esc(nm(i))}</h3><div class="price">${money(i.price)}</div></div></button>`).join("");

    // Category nav
    const track = $("#catnavTrack");
    track.innerHTML = `<span class="catnav-origin" style="position:absolute;left:0;top:0;width:0;height:0"></span><span class="catnav-ink" id="catnavInk"></span>` +
      DATA.categories.map((c) => `<button class="cat-btn" data-cat="${c.key}">${esc(nm(c))}</button>`).join("");

    // Sections
    $("#menu").innerHTML = DATA.categories.map((c) => `
      <section class="menu-section" id="cat-${c.key}" data-cat="${c.key}">
        <h2 class="section-title"><span class="flame-ico" aria-hidden="true"></span><span>${esc(nm(c))}</span><span class="count">${c.items.length}</span></h2>
        <div class="items">${c.items.map((i, n) => `
          <article class="card reveal" data-open="${i.id}" data-search="${esc(normalize([i.ar, i.en, i.desc_ar, i.desc_en, c.ar, c.en].join(" ")))}" style="transition-delay:${(n % 4) * 50}ms" tabindex="0" role="button" aria-label="${esc(nm(i))}">
            ${thumb(i)}
            <div class="body">
              <h3>${esc(nm(i))}</h3>
              ${lang === "ar" && i.en ? `<p class="sub" lang="en" dir="ltr">${esc(i.en)}</p>` : ""}
              ${ds(i) ? `<p class="desc">${esc(ds(i))}</p>` : ""}
              ${badges(i, day)}
              <div class="foot"><span class="price">${i.choice ? `<small>${lang === "ar" ? "من" : "from"}</small> ` : ""}${money(i.price)}</span><button class="add-btn" data-id="${i.id}"></button></div>
            </div>
          </article>`).join("")}
        </div>
      </section>`).join("");
    $$(".add-btn[data-id]").forEach((b) => paintAddBtn(b, +b.dataset.id));
    observeReveal();
    observeSections();
    renderCartBar();
    if ($("#searchInput").value) applySearch();
  }

  /* ---------------- Reveal on scroll ---------------- */
  let revealIO;
  function observeReveal() {
    revealIO?.disconnect();
    if (reduceMotion || !("IntersectionObserver" in window)) { $$(".reveal").forEach((e) => e.classList.add("in")); return; }
    revealIO = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); }
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    $$(".reveal").forEach((e) => revealIO.observe(e));
  }

  /* ---------------- Category scroll-spy ---------------- */
  let secIO, activeCat = null, spyLock = 0;
  function setActive(key, scrollChip = true) {
    if (!key) return;
    activeCat = key;
    const track = $("#catnavTrack");
    const btn = $(`.cat-btn[data-cat="${key}"]`, track);
    $$(".cat-btn", track).forEach((b) => b.classList.toggle("active", b === btn));
    if (!btn) return;
    const ink = $("#catnavInk"), origin = $(".catnav-origin", track);
    const x = btn.getBoundingClientRect().left - origin.getBoundingClientRect().left;
    ink.style.width = `${btn.offsetWidth}px`;
    ink.style.transform = `translateX(${x}px)`;
    if (scrollChip) {
      const tr = track.getBoundingClientRect(), br = btn.getBoundingClientRect();
      track.scrollBy({ left: br.left + br.width / 2 - (tr.left + tr.width / 2), behavior: reduceMotion ? "auto" : "smooth" });
    }
  }
  function observeSections() {
    secIO?.disconnect();
    const visible = new Map();
    secIO = new IntersectionObserver((es) => {
      es.forEach((e) => visible.set(e.target.dataset.cat, e.isIntersecting ? e.boundingClientRect.top : null));
      if (Date.now() < spyLock) return;
      let best = null, bestTop = Infinity;
      for (const [k, top] of visible) if (top != null && Math.abs(top) < bestTop) { best = k; bestTop = Math.abs(top); }
      if (best && best !== activeCat) setActive(best);
    }, { rootMargin: "-130px 0px -55% 0px" });
    $$(".menu-section").forEach((s) => secIO.observe(s));
    const info = $("#info"); info.dataset.cat = DATA.categories.at(-1).key; secIO.observe(info);
    requestAnimationFrame(() => setActive(activeCat || DATA.categories[0].key, false));
  }

  /* ---------------- Search ---------------- */
  function normalize(s) {
    return String(s).toLowerCase()
      .replace(/[ً-ٰٟ]/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/\s+/g, " ");
  }
  function applySearch() {
    const q = normalize($("#searchInput").value.trim());
    const on = q.length > 0;
    const words = q.split(" ").filter(Boolean);
    document.body.classList.toggle("searching", on);
    let any = false;
    $$(".menu-section").forEach((sec) => {
      let n = 0;
      $$(".card", sec).forEach((c) => { const m = !on || words.every((w) => c.dataset.search.includes(w)); c.hidden = !m; if (m) { n++; c.classList.add("in"); } });
      sec.hidden = n === 0; if (n) any = true;
      $(".count", sec).textContent = n;
    });
    $("#noResults").hidden = any;
  }
  function openSearch() {
    $("#topbar").classList.add("searching");
    setTimeout(() => $("#searchInput").focus(), 60);
  }
  function closeSearch() {
    $("#topbar").classList.remove("searching");
    $("#searchInput").value = "";
    applySearch();
  }

  /* ---------------- Sheets ---------------- */
  let openSheetEl = null;
  function showSheet(el) {
    if (openSheetEl && openSheetEl !== el) hideSheet(openSheetEl, true);
    openSheetEl = el;
    const scrim = $("#scrim");
    scrim.hidden = false; el.hidden = false; el.scrollTop = 0;
    document.body.classList.add("locked");
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add("open"); el.classList.add("open"); }));
    if (!history.state?.sheet) history.pushState({ sheet: 1 }, "");
    enableDrag(el);
    setTimeout(() => $(".close", el)?.focus({ preventScroll: true }), 350);
  }
  function hideSheet(el = openSheetEl, silent = false, fromPop = false) {
    if (!el || !el.classList.contains("open")) return;
    el.classList.remove("open");
    if (!silent) { $("#scrim").classList.remove("open"); }
    setTimeout(() => {
      el.hidden = true; el.style.transform = "";
      if (!openSheetEl || openSheetEl === el) { $("#scrim").hidden = true; document.body.classList.remove("locked"); openSheetEl = null; }
    }, 380);
    if (!silent && !fromPop && history.state?.sheet) history.back();
  }
  addEventListener("popstate", () => { if (openSheetEl) hideSheet(openSheetEl, false, true); });

  function enableDrag(el) {
    if (el._drag) return;
    el._drag = true;
    let y0 = null, dy = 0;
    el.addEventListener("touchstart", (e) => { if (el.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; el.style.transition = "none"; } }, { passive: true });
    el.addEventListener("touchmove", (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0 && el.scrollTop <= 0) el.style.transform = `translateY(${dy}px)`;
      else { y0 = null; el.style.transform = ""; el.style.transition = ""; }
    }, { passive: true });
    el.addEventListener("touchend", () => {
      el.style.transition = "";
      if (y0 != null && dy > 110) hideSheet(el); else el.style.transform = "";
      y0 = null;
    });
  }
  const closeIco = `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`;

  function openItem(id) {
    const it = byId.get(id); if (!it) return;
    const { day } = ammanNow();
    let opt = it.choice ? 0 : null, qty = 1;
    const el = $("#itemSheet");
    el.innerHTML = `
      <div class="grabber"><i></i></div>
      <button class="close" aria-label="${t("close")}">${closeIco}</button>
      <div class="sheet-hero${it.img ? "" : " no-img"}">${thumb(it)}</div>
      <div class="sheet-body">
        <h2 id="itemTitle">${esc(nm(it))}</h2>
        ${lang === "ar" && it.en ? `<p class="sub" lang="en" dir="ltr">${esc(it.en)}</p>` : lang === "en" ? `<p class="sub" lang="ar" dir="rtl">${esc(it.ar)}</p>` : ""}
        ${ds(it) ? `<p class="desc">${esc(ds(it))}</p>` : ""}
        <div class="meta">${badges(it, day).replace(/^<div class="badges">|<\/div>$/g, "")}</div>
        ${it.choice ? `<div class="opt-group"><h4>${esc(nm(it.choice))}</h4><div class="opts">${it.choice.options.map((o, n) => `
          <label class="opt"><input type="radio" name="opt" value="${n}" ${n === 0 ? "checked" : ""}><span class="grow">${esc(nm(o))}</span><span class="p">${o.price.toFixed(2)}</span></label>`).join("")}</div></div>` : ""}
        <textarea class="note" rows="1" maxlength="120" placeholder="${t("note")}"></textarea>
      </div>
      <div class="sheet-actions">
        <div class="stepper"><button data-q="-1" aria-label="−">−</button><span class="q">1</span><button data-q="1" aria-label="+">+</button></div>
        <button class="primary add-go"><span>${t("add")}</span><span class="price"></span></button>
      </div>`;
    const upd = () => { $(".q", el).textContent = qty; $(".add-go .price", el).innerHTML = money(unitPrice(it, opt) * qty); };
    upd();
    $(".close", el).onclick = () => hideSheet(el);
    $$("input[name=opt]", el).forEach((r) => (r.onchange = () => { opt = +r.value; upd(); }));
    $$(".stepper button", el).forEach((b) => (b.onclick = () => { qty = Math.max(1, Math.min(50, qty + +b.dataset.q)); upd(); }));
    $(".add-go", el).onclick = (e) => {
      addToCart(id, opt, qty, $(".note", el).value.trim());
      flyFrom(e.currentTarget);
      toast(t("added"));
      hideSheet(el);
    };
    showSheet(el);
  }

  /* ---------------- Cart ---------------- */
  function renderCartBar() {
    const n = cartCount(), bar = $("#cartbar");
    bar.hidden = n === 0;
    $("#cartCount").textContent = n;
    $("#cartTotal").innerHTML = money(cartTotal());
  }
  function bump() { const b = $("#cartbar"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  function flyFrom(src) {
    bump();
    if (reduceMotion) return;
    const bar = $("#cartbar"); if (bar.hidden) return;
    const s = src.getBoundingClientRect(), d = $("#cartCount").getBoundingClientRect();
    const dot = document.createElement("div"); dot.className = "fly"; document.body.appendChild(dot);
    const x0 = s.left + s.width / 2 - 9, y0 = s.top + s.height / 2 - 9, x1 = d.left + d.width / 2 - 9, y1 = d.top + d.height / 2 - 9;
    dot.animate([
      { transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1 },
      { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 80}px) scale(1.3)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${x1}px,${y1}px) scale(0.4)`, opacity: 0.2 },
    ], { duration: 650, easing: "cubic-bezier(.5,0,.5,1)" }).onfinish = () => dot.remove();
  }

  function openCart() {
    const el = $("#cartSheet");
    const draw = () => {
      const lines = cart.map((l, n) => {
        const it = byId.get(l.id); if (!it) return "";
        const o = it.choice && l.opt != null ? nm(it.choice.options[l.opt]) : "";
        return `<li class="cart-line">${thumb(it)}
          <div class="info-l"><div class="n">${esc(nm(it))}</div>${o || l.note ? `<div class="o">${esc([o, l.note].filter(Boolean).join(" · "))}</div>` : ""}<div class="price">${money(unitPrice(it, l.opt) * l.qty)}</div></div>
          <div class="stepper"><button data-l="${n}" data-q="-1" aria-label="−">−</button><span>${l.qty}</span><button data-l="${n}" data-q="1" aria-label="+">+</button></div></li>`;
      }).join("");
      const empty = cart.length === 0;
      el.innerHTML = `
        <div class="grabber"><i></i></div>
        <button class="close" aria-label="${t("close")}">${closeIco}</button>
        <div class="cart-head"><h2 id="cartTitle">${t("yourOrder")}</h2>${empty ? "" : `<button class="clear-btn">${t("clear")}</button>`}</div>
        ${empty ? `<div class="cart-empty"><div class="e-ico">${phLogo}</div><p><b>${t("emptyOrder")}</b><br>${t("emptyHint")}</p></div>` : `
        <ul class="cart-list">${lines}</ul>
        <div class="cart-fields">
          <div class="opts" style="grid-template-columns:1fr 1fr">
            <label class="opt"><input type="radio" name="otype" value="dine" ${order.type !== "take" ? "checked" : ""}><span class="grow">${t("dineIn")}</span></label>
            <label class="opt"><input type="radio" name="otype" value="take" ${order.type === "take" ? "checked" : ""}><span class="grow">${t("takeaway")}</span></label>
          </div>
          <div class="field" id="tableField" ${order.type === "take" ? "hidden" : ""}><label for="fTable">${t("tableNo")}</label><input id="fTable" inputmode="numeric" maxlength="6" value="${esc(table || "")}"></div>
          <div class="field"><label for="fName">${t("name")}</label><input id="fName" maxlength="40" autocomplete="given-name" value="${esc(order.name || "")}"></div>
          <div class="field"><label for="fNotes">${t("orderNotes")}</label><input id="fNotes" maxlength="160" value="${esc(order.notes || "")}"></div>
        </div>
        <div class="cart-total"><span>${t("total")}</span><span class="price">${money(cartTotal())}</span></div>
        <p class="cart-hint">${t("waHint")}</p>`}
        <div class="sheet-actions">${empty ? `<button class="primary close-go">${t("close")}</button>` : `
          <button class="primary wa send-go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg><span>${t("sendWa")}</span></button>`}
        </div>`;
      $(".close", el).onclick = () => hideSheet(el);
      $(".close-go", el) && ($(".close-go", el).onclick = () => hideSheet(el));
      $$(".cart-line .stepper button", el).forEach((b) => (b.onclick = () => {
        const l = cart[+b.dataset.l]; l.qty = Math.max(0, Math.min(99, l.qty + +b.dataset.q));
        saveCart(); draw();
      }));
      $(".clear-btn", el) && ($(".clear-btn", el).onclick = () => {
        if (!confirm(t("confirmClear"))) return;
        cart = []; saveCart(); toast(t("cleared")); draw();
      });
      $$("input[name=otype]", el).forEach((r) => (r.onchange = () => { order.type = r.value; store.set("alneran-order", order); $("#tableField", el).hidden = r.value === "take"; }));
      const keep = () => {
        order.name = $("#fName", el)?.value.trim() || ""; order.notes = $("#fNotes", el)?.value.trim() || "";
        const tv = $("#fTable", el)?.value.trim(); if (tv != null) table = tv || null;
        store.set("alneran-order", order);
      };
      $$(".cart-fields input", el).forEach((i) => i.addEventListener("input", keep));
      $(".send-go", el) && ($(".send-go", el).onclick = () => { keep(); sendWhatsApp(); });
    };
    draw();
    showSheet(el);
  }

  function sendWhatsApp() {
    const R = DATA.restaurant;
    const L = ["🔥 *طلب جديد — مطعم النيران*"];
    if (order.type === "take") L.push("🛍️ سفري");
    else if (table) L.push(`🪑 طاولة: *${table}*`);
    if (order.name) L.push(`👤 الاسم: ${order.name}`);
    L.push("━━━━━━━━━━");
    cart.forEach((l) => {
      const it = byId.get(l.id); if (!it) return;
      const o = it.choice && l.opt != null ? ` (${it.choice.options[l.opt].ar})` : "";
      L.push(`${l.qty} × ${it.ar}${o} — ${(unitPrice(it, l.opt) * l.qty).toFixed(2)}`);
      if (l.note) L.push(`   📝 ${l.note}`);
    });
    L.push("━━━━━━━━━━");
    L.push(`💰 *المجموع: ${cartTotal().toFixed(2)} د.أ*`);
    if (order.notes) L.push(`📝 ملاحظات: ${order.notes}`);
    location.href = `https://wa.me/${R.whatsapp}?text=${encodeURIComponent(L.join("\n"))}`;
  }

  /* ---------------- Toast ---------------- */
  let toastT;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 1600);
  }

  /* ---------------- Map (loads when near) ---------------- */
  function lazyMap() {
    const wrap = $("#mapWrap");
    const load = () => {
      if (wrap.dataset.loaded) return; wrap.dataset.loaded = 1;
      const { lat, lng } = DATA.restaurant;
      wrap.innerHTML = `<iframe title="Map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=${lang}&output=embed"></iframe>`;
    };
    $("#mapLoad").onclick = load;
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "300px" });
      io.observe(wrap);
    }
  }

  /* ---------------- Events ---------------- */
  function bind() {
    document.addEventListener("click", (e) => {
      const add = e.target.closest(".add-btn[data-id]");
      if (add) {
        e.stopPropagation();
        const id = +add.dataset.id, it = byId.get(id);
        if (it.choice) { openItem(id); return; }
        addToCart(id); flyFrom(add); toast(t("added"));
        return;
      }
      const cat = e.target.closest(".cat-btn");
      if (cat) {
        const sec = $(`#cat-${cat.dataset.cat}`);
        spyLock = Date.now() + 900;
        setActive(cat.dataset.cat);
        const y = sec.getBoundingClientRect().top + scrollY - ($("#topbar").offsetHeight + $("#catnav").offsetHeight) - 6;
        scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
        return;
      }
      const op = e.target.closest("[data-open]");
      if (op) openItem(+op.dataset.open);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { if (openSheetEl) hideSheet(); else if ($("#topbar").classList.contains("searching")) closeSearch(); }
      if ((e.key === "Enter" || e.key === " ") && e.target.matches(".card[data-open]")) { e.preventDefault(); openItem(+e.target.dataset.open); }
    });
    $("#scrim").onclick = () => hideSheet();
    $("#cartbar").onclick = openCart;
    $("#langBtn").onclick = () => { lang = lang === "ar" ? "en" : "ar"; store.set("alneran-lang", lang); render(); };
    $("#searchBtn").onclick = openSearch;
    $("#searchClose").onclick = closeSearch;
    $("#searchInput").addEventListener("input", () => { applySearch(); scrollTo({ top: 0 }); });
    const tb = $("#topbar");
    const onScroll = () => tb.classList.toggle("scrolled", scrollY > 120);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    setInterval(renderStatus, 60 * 1000);
  }

  /* ---------------- Boot ---------------- */
  mountLogos();
  embers();
  $("#year").textContent = new Date().getFullYear();
  fetch("/menu.json").then((r) => r.json()).then((d) => {
    DATA = d;
    d.categories.forEach((c) => c.items.forEach((i) => byId.set(i.id, i)));
    cart = cart.filter((l) => byId.has(l.id));
    render(); bind(); lazyMap();
  }).catch(() => { $("#menu").innerHTML = `<p class="no-results">تعذّر تحميل المنيو — حاول مجدداً<br>Couldn't load the menu — please retry</p>`; });
})();
