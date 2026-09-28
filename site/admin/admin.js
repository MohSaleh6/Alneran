// Alneran admin panel. Every change is checked (validate.js), saved to the Worker, and a copy of the
// previous menu is kept so it can be restored from Settings → History.
import { validateMenu, ammanToday, inRange, discounted, LIMITS } from "./validate.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// 2.3 -> "2.30", 0.125 -> "0.125" (fils are kept when they matter)
const fmt = (p) => { const f = Math.round(p * 1000); return (f / 1000).toFixed(f % 10 ? 3 : 2); };
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const state = { data: null, version: 0, tab: "items", q: "", cat: "" };

/* ---------------- Numbers typed with Arabic or Latin digits ---------------- */
function num(v) {
  const s = String(v ?? "").trim()
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٫,]/g, ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 1000) / 1000;
}

/* ---------------- API ---------------- */
class ApiError extends Error {
  constructor(status, body) { super(body?.error || `خطأ ${status}`); this.status = status; this.body = body || {}; }
}
async function api(path, { method = "GET", body, raw, type } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "x-admin": "1", ...(raw ? { "content-type": type } : body ? { "content-type": "application/json" } : {}) },
      body: raw || (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, { error: "لا يوجد اتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى." });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
function handleError(e) {
  if (e instanceof ApiError && e.status === 401 && e.body.login) { showLogin("انتهت الجلسة، سجّل الدخول مرة أخرى"); return; }
  toast(e.message || "حدث خطأ", true);
}

/* ---------------- UI helpers ---------------- */
let toastT;
function toast(msg, err = false) {
  const t = $("#toast");
  t.textContent = msg; t.classList.toggle("err", err); t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), err ? 4200 : 2600);
}
function busy(on, text = "جاري الحفظ…") { $("#busy").hidden = !on; $("#busyText").textContent = text; }

function openModal({ title, body, foot = "", size = "", onMount }) {
  const wrap = document.createElement("div");
  wrap.className = "modal-wrap";
  wrap.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-x aria-label="إغلاق">✕</button></div>
    <div class="modal-body">${body}</div>
    ${foot ? `<div class="modal-foot">${foot}</div>` : ""}
  </div>`;
  $("#modalRoot").appendChild(wrap);
  document.body.classList.add("locked");
  const m = { el: wrap, beforeClose: null };
  m.close = async (force = false) => {
    if (!force && m.beforeClose && !(await m.beforeClose())) return;
    wrap.remove();
    if (!$("#modalRoot").children.length) document.body.classList.remove("locked");
  };
  $("[data-x]", wrap).onclick = () => m.close();
  wrap.addEventListener("mousedown", (e) => { if (e.target === wrap) m.close(); });
  onMount?.(wrap, m);
  setTimeout(() => $("input:not([type=hidden]):not([type=file]), textarea, select", $(".modal-body", wrap))?.focus({ preventScroll: true }), 50);
  return m;
}
function confirmDialog(text, { ok = "تأكيد", danger = false, detail = "" } = {}) {
  return new Promise((resolve) => {
    const m = openModal({
      title: "تأكيد", size: "small",
      body: `<p style="margin:0;font-weight:700;font-size:1.05rem">${esc(text)}</p>${detail ? `<p class="muted small">${esc(detail)}</p>` : ""}`,
      foot: `<button class="btn ${danger ? "danger solid" : "primary"}" data-ok style="flex:1">${esc(ok)}</button><button class="btn" data-no>إلغاء</button>`,
      onMount(el) {
        $("[data-ok]", el).onclick = () => { m.close(true); resolve(true); };
        $("[data-no]", el).onclick = () => { m.close(true); resolve(false); };
      },
    });
    m.beforeClose = async () => { resolve(false); return true; };
  });
}
const pill = (text, cls = "") => `<span class="pill ${cls}">${esc(text)}</span>`;
const imgSrc = (img) => (!img ? "" : img.startsWith("/") ? img : `/${img}`);
const thumb = (img, cls = "th") => img ? `<img class="${cls}" src="${esc(imgSrc(img))}" alt="" loading="lazy">` : `<div class="${cls}"></div>`;
function whenText(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-JO-u-nu-latn", { timeZone: "Asia/Amman", day: "numeric", month: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
const dateText = (d) => { const [y, m, dd] = d.split("-"); return `${+dd}/${+m}/${y}`; };

// Status of something with optional dates (a discount or an offer)
function period(o) {
  const today = ammanToday();
  if (o.active === false) return { label: "موقوف", cls: "" };
  if (o.start && o.start > today) return { label: `يبدأ ${dateText(o.start)}`, cls: "amber" };
  if (o.end && o.end < today) return { label: "منتهي", cls: "red" };
  return { label: o.end ? `فعّال حتى ${dateText(o.end)}` : "فعّال الآن", cls: "green" };
}

/* ---------------- Data helpers ---------------- */
const allItems = (d = state.data) => d.categories.flatMap((c) => c.items.map((i) => ({ item: i, cat: c })));
const findItem = (id, d = state.data) => allItems(d).find((x) => x.item.id === id);
function nextItemId(d) {
  const ids = [...allItems(d).map((x) => x.item.id), ...(d.offers || []).map((o) => o.id)].filter((n) => n < 90000);
  return Math.max(1000, ...ids) + 1;
}
const nextOfferId = (d) => Math.max(90000, ...(d.offers || []).map((o) => o.id)) + 1;
const minPrice = (it) => (it.choice ? Math.min(...it.choice.options.map((o) => o.price)) : it.price);
function priceLabel(it) {
  const base = minPrice(it);
  const now = it.discount ? discounted(base, it.discount) : base;
  const from = it.choice ? "من " : "";
  return now < base ? `${from}<s>${fmt(base)}</s>${fmt(now)}` : `${from}${fmt(base)}`;
}

/* Save a change: apply it to a copy, check it, publish it. Returns true on success. */
async function commit(note, mutate, { quiet = false } = {}) {
  const next = structuredClone(state.data);
  mutate(next);
  for (const { item } of allItems(next)) if (item.choice) item.price = minPrice(item);
  const errors = validateMenu(next);
  if (errors.length) { const e = new Error(errors[0]); e.errors = errors; throw e; }
  const payload = structuredClone(next);
  delete payload.version; delete payload.updated; delete payload.note;
  busy(true);
  try {
    const r = await api("/api/menu", { method: "PUT", body: { base_version: state.version, data: payload, note } });
    next.version = r.version; next.updated = r.updated; next.note = note;
    state.data = next; state.version = r.version;
    if (!quiet) toast("تم الحفظ ✓ يظهر على المنيو خلال دقيقة");
    renderHeader(); render();
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      await loadMenu();
      toast(e.message, true);
      return false;
    }
    if (e instanceof ApiError && e.status === 422) { const x = new Error(e.message); x.errors = e.body.errors || [e.message]; throw x; }
    throw e;
  } finally { busy(false); }
}
// Wrapper for one-tap actions (toggles, moves, deletes)
async function quick(note, mutate) {
  try { await commit(note, mutate); } catch (e) { handleError(e); render(); }
}

/* ---------------- Boot / login ---------------- */
function showMsg(title, text) {
  $("#appView").hidden = true; $("#loginView").hidden = true; $("#msgView").hidden = false;
  $("#msgTitle").textContent = title; $("#msgText").textContent = text;
}
function showLogin(err = "") {
  $$(".modal-wrap").forEach((m) => m.remove()); document.body.classList.remove("locked");
  $("#appView").hidden = true; $("#msgView").hidden = true; $("#loginView").hidden = false;
  $("#loginError").hidden = !err; $("#loginError").textContent = err;
  setTimeout(() => $("#loginPass").focus(), 50);
}
async function loadMenu() {
  const d = await fetch("/api/menu", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(); return r.json(); });
  d.offers = d.offers || [];
  state.data = d; state.version = d.version || 0;
  renderHeader(); render();
}
async function start() {
  try {
    await api("/api/session");
  } catch (e) {
    if (e.status === 503) return showMsg("لوحة التحكم غير مفعّلة بعد", e.message);
    if (e.status === 401) return showLogin();
    return showMsg("تعذّر الاتصال", e.message);
  }
  $("#loginView").hidden = true; $("#msgView").hidden = true; $("#appView").hidden = false;
  try { await loadMenu(); } catch { toast("تعذّر تحميل المنيو، أعد تحميل الصفحة", true); }
}
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#loginBtn"); btn.disabled = true; btn.textContent = "جاري الدخول…";
  try {
    await api("/api/login", { method: "POST", body: { password: $("#loginPass").value } });
    $("#loginPass").value = "";
    await start();
  } catch (err) {
    $("#loginError").hidden = false; $("#loginError").textContent = err.message;
  } finally { btn.disabled = false; btn.textContent = "دخول"; }
});
$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]"); if (!b) return;
  state.tab = b.dataset.tab;
  $$("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
  render(); scrollTo({ top: 0 });
});
function renderHeader() {
  $("#lastSaved").textContent = state.data?.updated ? `آخر حفظ: ${whenText(state.data.updated)}` : "لم يتم أي تعديل بعد";
}
function render() {
  if (!state.data) return;
  ({ items: renderItems, offers: renderOffers, cats: renderCats, settings: renderSettings })[state.tab]();
}

/* ================= Items ================= */
function renderItems() {
  const d = state.data, q = state.q.trim().toLowerCase();
  const match = (i) => !q || [i.ar, i.en, i.desc_ar].join(" ").toLowerCase().includes(q);
  const cats = d.categories.filter((c) => !state.cat || c.key === state.cat);
  const groups = cats.map((c) => {
    const items = c.items.filter(match);
    if (!items.length && q) return "";
    return `<section class="group">
      <div class="group-head">${esc(c.ar)} <span class="count">${c.items.length}</span>${c.hidden ? pill("قسم مخفي", "red") : ""}</div>
      ${items.length ? `<div class="list">${items.map((i) => itemRow(i, c)).join("")}</div>` : `<div class="empty">لا توجد أصناف في هذا القسم</div>`}
    </section>`;
  }).join("");
  $("#content").innerHTML = `
    <div class="page-head"><h2>الأصناف</h2><button class="btn primary" id="addItem">+ إضافة صنف</button></div>
    <div class="toolbar">
      <label class="search"><input type="search" id="q" placeholder="ابحث عن صنف…" value="${esc(state.q)}"></label>
      <select id="catFilter"><option value="">كل الأقسام</option>${d.categories.map((c) => `<option value="${c.key}" ${c.key === state.cat ? "selected" : ""}>${esc(c.ar)}</option>`).join("")}</select>
    </div>
    ${groups || `<div class="empty"><b>لا توجد نتائج</b>جرّب كلمة أخرى</div>`}`;
  $("#q").oninput = (e) => { state.q = e.target.value; const pos = e.target.selectionStart; renderItems(); const n = $("#q"); n.focus(); n.setSelectionRange(pos, pos); };
  $("#catFilter").onchange = (e) => { state.cat = e.target.value; renderItems(); };
  $("#addItem").onclick = () => openItemEditor(null, state.cat || d.categories[0]?.key);
  bindItemRows($("#content"));
}
function itemRow(i, c) {
  const n = c.items.indexOf(i);
  const pills = [
    i.hidden && pill("مخفي", "red"),
    i.soldout && pill("نفذت الكمية", "red"),
    i.discount && pill(`خصم · ${period(i.discount).label}`, period(i.discount).cls || "brand"),
    i.popular && pill("الأكثر طلباً", "brand"),
    i.day != null && pill(`يوم ${DAYS[i.day]}`),
    i.choice && pill(`${i.choice.options.length} خيارات`),
  ].filter(Boolean).join("");
  return `<div class="row ${i.hidden || i.soldout ? "dim" : ""}" data-id="${i.id}">
    ${thumb(i.img)}
    <div class="main" data-edit>
      <div class="name">${esc(i.ar)}</div>
      <div class="sub">${esc(i.en || "")}</div>
      ${pills ? `<div class="pills">${pills}</div>` : ""}
    </div>
    <div class="actions">
      <span class="price">${priceLabel(i)}</span>
      <label class="switch" title="متوفر"><input type="checkbox" data-avail ${i.soldout ? "" : "checked"}><span class="track"></span></label>
      <button class="icon-btn" data-up ${n === 0 ? "disabled" : ""} aria-label="تحريك للأعلى">▲</button>
      <button class="icon-btn" data-down ${n === c.items.length - 1 ? "disabled" : ""} aria-label="تحريك للأسفل">▼</button>
      <button class="btn sm" data-edit>تعديل</button>
    </div>
  </div>`;
}
function bindItemRows(root) {
  $$(".row[data-id]", root).forEach((row) => {
    const id = +row.dataset.id;
    $$("[data-edit]", row).forEach((b) => (b.onclick = () => openItemEditor(id)));
    const av = $("[data-avail]", row);
    if (av) av.onchange = () => quick(av.checked ? "متوفر" : "نفذت الكمية", (d) => { const x = findItem(id, d).item; if (av.checked) delete x.soldout; else x.soldout = true; });
    const mv = (dir) => quick("ترتيب الأصناف", (d) => {
      const { cat } = findItem(id, d); const i = cat.items.findIndex((x) => x.id === id); const j = i + dir;
      if (j < 0 || j >= cat.items.length) return;
      [cat.items[i], cat.items[j]] = [cat.items[j], cat.items[i]];
    });
    const up = $("[data-up]", row), down = $("[data-down]", row);
    if (up) up.onclick = () => mv(-1);
    if (down) down.onclick = () => mv(1);
  });
}

/* ---------------- Photo upload (resized on the phone before sending) ---------------- */
async function prepareImage(file) {
  if (!file.type.startsWith("image/") && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) throw new Error("الملف المختار ليس صورة");
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch {
    src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("تعذّر فتح الصورة، جرّب صورة أخرى (JPG أو PNG)")); im.src = URL.createObjectURL(file); });
  }
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  for (const [max, q] of [[1200, 0.82], [1000, 0.72], [800, 0.65]]) {
    const s = Math.min(1, max / Math.max(w, h));
    const cv = document.createElement("canvas");
    cv.width = Math.round(w * s); cv.height = Math.round(h * s);
    cv.getContext("2d").drawImage(src, 0, 0, cv.width, cv.height);
    const toBlob = (type, qq) => new Promise((r) => cv.toBlob(r, type, qq));
    let blob = await toBlob("image/webp", q);
    if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", q + 0.05);
    if (blob && blob.size < 3.5 * 1024 * 1024) return blob;
  }
  throw new Error("الصورة كبيرة جداً");
}
async function uploadImage(file) {
  const blob = await prepareImage(file);
  const r = await api("/api/upload", { method: "POST", raw: blob, type: blob.type });
  return r.url;
}
function photoField(img) {
  return `<div class="field"><span>الصورة</span>
    <div class="photo-edit">
      ${img ? `<img class="ph" src="${esc(imgSrc(img))}" alt="">` : `<div class="ph"></div>`}
      <div class="ph-actions">
        <label class="btn sm"><input type="file" accept="image/*" hidden data-photo>${img ? "تغيير الصورة" : "إضافة صورة"}</label>
        ${img ? `<button type="button" class="btn sm danger" data-photo-del>حذف الصورة</button>` : ""}
        <span class="muted small" data-photo-status></span>
      </div>
    </div></div>`;
}
function bindPhoto(el, get, set) {
  const redraw = () => { $(".photo-box", el).innerHTML = photoField(get()); wire(); };
  const wire = () => {
    const inp = $("[data-photo]", el);
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const st = $("[data-photo-status]", el); st.textContent = "جاري رفع الصورة…";
      el.dataset.uploading = "1";
      try { set(await uploadImage(f)); redraw(); toast("تم رفع الصورة ✓ اضغط حفظ لتثبيتها"); }
      catch (e) { st.textContent = ""; handleError(e); }
      finally { delete el.dataset.uploading; }
    };
    const del = $("[data-photo-del]", el);
    if (del) del.onclick = () => { set(null); redraw(); };
  };
  wire();
}

/* ---------------- Form helpers ---------------- */
function markErrors(form, fields) {
  $$(".field.invalid", form).forEach((f) => { f.classList.remove("invalid"); $(".err", f)?.remove(); });
  for (const [name, msg] of Object.entries(fields)) {
    const inp = form.querySelector(`[name="${name}"]`); const f = inp?.closest(".field");
    if (f) { f.classList.add("invalid"); f.insertAdjacentHTML("beforeend", `<span class="err">${esc(msg)}</span>`); }
  }
  const first = $(".field.invalid", form);
  first?.scrollIntoView({ behavior: "smooth", block: "center" });
  return !Object.keys(fields).length;
}
function showErrors(el, errors) {
  const box = $(".errors", el) || $(".modal-body", el).insertAdjacentElement("afterbegin", Object.assign(document.createElement("div"), { className: "errors" }));
  box.innerHTML = `<ul>${errors.slice(0, 6).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
const dayOptions = (sel) => `<option value="">كل الأيام</option>${DAYS.map((d, i) => `<option value="${i}" ${sel === i ? "selected" : ""}>${d} فقط</option>`).join("")}`;

/* ---------------- Item editor ---------------- */
function openItemEditor(id, catKey) {
  const d = state.data;
  const found = id != null ? findItem(id) : null;
  const it = found ? structuredClone(found.item) : { ar: "", en: "", desc_ar: "", desc_en: "", price: 0 };
  const curCat = found ? found.cat.key : catKey;
  if (!d.categories.length) return toast("أضف قسماً أولاً من تبويب الأقسام", true);
  let img = it.img || null;
  const hasChoice = !!it.choice;
  const disc = it.discount || null;
  const opts = it.choice?.options || [{ ar: "", en: "", price: "" }, { ar: "", en: "", price: "" }];
  const optRow = (o) => `<div class="opt-row"><input name="o_ar" placeholder="الاسم (عربي)" value="${esc(o.ar)}"><input name="o_en" placeholder="Name (English)" dir="ltr" value="${esc(o.en || "")}"><input class="price-in" name="o_price" inputmode="decimal" placeholder="السعر" value="${o.price === "" ? "" : fmt(o.price)}"><button type="button" class="icon-btn" data-opt-del aria-label="حذف الخيار">✕</button></div>`;

  const m = openModal({
    title: found ? `تعديل: ${it.ar}` : "صنف جديد",
    body: `<form class="form" id="itemForm" novalidate>
      <div class="photo-box">${photoField(img)}</div>
      <div class="grid2">
        <label class="field"><span>الاسم بالعربي *</span><input name="ar" maxlength="100" value="${esc(it.ar)}" required></label>
        <label class="field"><span>الاسم بالإنجليزي <small>(اختياري)</small></span><input name="en" maxlength="100" dir="ltr" value="${esc(it.en || "")}"></label>
      </div>
      <label class="field"><span>الوصف بالعربي <small>(المكونات أو ما يقدم معه)</small></span><textarea name="desc_ar" maxlength="400">${esc(it.desc_ar || "")}</textarea></label>
      <label class="field"><span>الوصف بالإنجليزي <small>(اختياري)</small></span><textarea name="desc_en" maxlength="400" dir="ltr">${esc(it.desc_en || "")}</textarea></label>
      <div class="grid2">
        <label class="field"><span>القسم</span><select name="cat">${d.categories.map((c) => `<option value="${c.key}" ${c.key === curCat ? "selected" : ""}>${esc(c.ar)}</option>`).join("")}</select></label>
        <label class="field" data-price-field ${hasChoice ? "hidden" : ""}><span>السعر (دينار) *</span><input name="price" inputmode="decimal" placeholder="مثال: 2.50" value="${it.price ? fmt(it.price) : ""}"></label>
      </div>

      <div class="section-box">
        <div class="box-head"><b>خيارات (أحجام / أنواع)</b><label class="switch"><input type="checkbox" name="hasChoice" ${hasChoice ? "checked" : ""}><span class="track"></span></label></div>
        <div data-choice ${hasChoice ? "" : "hidden"} class="form">
          <p class="muted small" style="margin:0">لكل خيار سعره الكامل. الزبون يختار واحداً عند الطلب، والسعر الظاهر في المنيو هو الأقل.</p>
          <div class="grid2">
            <label class="field"><span>اسم المجموعة</span><input name="c_ar" placeholder="مثال: الحجم" value="${esc(it.choice?.ar || "الحجم")}"></label>
            <label class="field"><span>بالإنجليزي</span><input name="c_en" dir="ltr" placeholder="e.g. Size" value="${esc(it.choice?.en || "Size")}"></label>
          </div>
          <div class="field"><span class="field-label">الخيارات</span><div data-opts class="form" style="gap:8px">${opts.map(optRow).join("")}</div>
          <input type="hidden" name="options"></div>
          <button type="button" class="btn sm" data-opt-add>+ إضافة خيار</button>
        </div>
      </div>

      <div class="section-box">
        <div class="box-head"><b>خصم على هذا الصنف</b><label class="switch"><input type="checkbox" name="hasDisc" ${disc ? "checked" : ""}><span class="track"></span></label></div>
        <div data-disc ${disc ? "" : "hidden"} class="form">
          <div class="seg">
            <label><input type="radio" name="d_type" value="percent" ${!disc || disc.type === "percent" ? "checked" : ""}>نسبة %</label>
            <label data-dprice ${hasChoice ? "hidden" : ""}><input type="radio" name="d_type" value="price" ${disc?.type === "price" ? "checked" : ""}>سعر جديد</label>
          </div>
          <label class="field"><span data-dlabel>نسبة الخصم %</span><input name="d_value" inputmode="decimal" value="${disc ? (disc.type === "price" ? fmt(disc.value) : disc.value) : ""}"></label>
          <div class="grid2">
            <label class="field"><span>من تاريخ <small>(اختياري)</small></span><input type="date" name="d_start" value="${disc?.start || ""}"></label>
            <label class="field"><span>إلى تاريخ <small>(اختياري)</small></span><input type="date" name="d_end" value="${disc?.end || ""}"></label>
          </div>
          <div class="calc" data-calc></div>
        </div>
      </div>

      <div class="section-box">
        <b>إعدادات إضافية</b>
        <label class="switch"><input type="checkbox" name="popular" ${it.popular ? "checked" : ""}><span class="track"></span>الأكثر طلباً <span class="muted small">(يظهر في أعلى المنيو)</span></label>
        <label class="switch"><input type="checkbox" name="soldout" ${it.soldout ? "checked" : ""}><span class="track"></span>نفذت الكمية <span class="muted small">(يظهر لكن لا يمكن طلبه)</span></label>
        <label class="switch"><input type="checkbox" name="hidden" ${it.hidden ? "checked" : ""}><span class="track"></span>إخفاء من المنيو</label>
        <div class="grid2">
          <label class="field"><span>يُقدَّم يوم</span><select name="day">${dayOptions(it.day)}</select></label>
          <label class="field"><span>يكفي (أشخاص) <small>(اختياري)</small></span><input name="serves" maxlength="12" placeholder="مثال: 4–6" value="${esc(it.serves || "")}"></label>
        </div>
      </div>
    </form>`,
    foot: `<button class="btn primary big" data-save>حفظ</button>${found ? `<button class="btn danger" data-del>حذف الصنف</button>` : ""}<button class="btn" data-cancel>إلغاء</button>`,
    onMount(el, mm) {
      const form = $("#itemForm", el);
      let dirty = false;
      form.addEventListener("input", () => { dirty = true; calc(); });
      mm.beforeClose = async () => !dirty || confirmDialog("هل تريد إغلاق النموذج بدون حفظ؟", { ok: "إغلاق بدون حفظ", danger: true });
      bindPhoto(el, () => img, (v) => { img = v; dirty = true; });

      const choiceOn = () => form.hasChoice.checked;
      form.hasChoice.onchange = () => {
        $("[data-choice]", el).hidden = !choiceOn();
        $("[data-price-field]", el).hidden = choiceOn();
        $("[data-dprice]", el).hidden = choiceOn();
        if (choiceOn()) form.querySelector('[name=d_type][value=percent]').checked = true;
        dtype(); calc();
      };
      $("[data-opt-add]", el).onclick = () => {
        if ($$(".opt-row", el).length >= LIMITS.options) return toast(`الحد الأقصى ${LIMITS.options} خيار`, true);
        $("[data-opts]", el).insertAdjacentHTML("beforeend", optRow({ ar: "", en: "", price: "" })); dirty = true;
      };
      $("[data-opts]", el).addEventListener("click", (e) => {
        if (!e.target.closest("[data-opt-del]")) return;
        if ($$(".opt-row", el).length <= 1) return toast("يجب أن يبقى خيار واحد على الأقل، أو أوقف الخيارات", true);
        e.target.closest(".opt-row").remove(); dirty = true; calc();
      });
      form.hasDisc.onchange = () => { $("[data-disc]", el).hidden = !form.hasDisc.checked; calc(); };
      const dtype = () => { $("[data-dlabel]", el).textContent = form.d_type.value === "price" ? "السعر بعد الخصم (دينار)" : "نسبة الخصم %"; };
      $$("[name=d_type]", el).forEach((r) => (r.onchange = () => { dtype(); calc(); }));
      dtype();
      function calc() {
        const box = $("[data-calc]", el);
        if (!form.hasDisc.checked) return (box.textContent = "");
        const v = num(form.d_value.value);
        const base = choiceOn() ? Math.min(...$$("[name=o_price]", el).map((i) => num(i.value)).filter((x) => x >= 0)) : num(form.price.value);
        if (!(v > 0) || !(base > 0)) return (box.textContent = "");
        const dd = { type: form.d_type.value, value: v, start: form.d_start.value || undefined, end: form.d_end.value || undefined };
        const after = dd.type === "percent" ? Math.round(base * (1 - v / 100) * 100) / 100 : v;
        box.textContent = `${choiceOn() ? "أقل سعر" : "السعر"} بعد الخصم: ${fmt(after)} د.أ بدلاً من ${fmt(base)} · ${period(dd).label}`;
      }
      calc();

      $("[data-cancel]", el).onclick = () => mm.close();
      if (found) $("[data-del]", el).onclick = async () => {
        if (!(await confirmDialog(`حذف «${it.ar}» من المنيو نهائياً؟`, { ok: "حذف", danger: true, detail: "يمكنك استرجاعه لاحقاً من الإعدادات ← سجل التعديلات. إذا كان مؤقتاً استخدم «نفذت الكمية» أو «إخفاء» بدلاً من الحذف." }))) return;
        try { if (await commit(`حذف: ${it.ar}`, (dd) => { const f = findItem(id, dd); f.cat.items.splice(f.cat.items.indexOf(f.item), 1); })) mm.close(true); }
        catch (e) { e.errors ? showErrors(el, e.errors) : handleError(e); }
      };

      $("[data-save]", el).onclick = async () => {
        if (el.dataset.uploading) return toast("انتظر حتى ينتهي رفع الصورة", true);
        const f = form, bad = {};
        const out = { id: found ? id : nextItemId(state.data), ar: f.ar.value.trim(), en: f.en.value.trim(), desc_ar: f.desc_ar.value.trim(), desc_en: f.desc_en.value.trim() };
        if (!out.ar) bad.ar = "اكتب اسم الصنف";
        if (choiceOn()) {
          const rows = $$(".opt-row", el).map((r) => ({ ar: $("[name=o_ar]", r).value.trim(), en: $("[name=o_en]", r).value.trim(), price: num($("[name=o_price]", r).value) }));
          if (!f.c_ar.value.trim()) bad.c_ar = "اكتب اسم المجموعة";
          if (rows.some((r) => !r.ar || !(r.price > 0))) bad.options = "لكل خيار: اكتب الاسم والسعر (رقم أكبر من صفر)";
          out.choice = { ar: f.c_ar.value.trim(), en: f.c_en.value.trim(), options: rows };
          out.price = Math.min(...rows.map((r) => r.price).filter((x) => x > 0), 1000);
        } else {
          out.price = num(f.price.value);
          if (!(out.price > 0)) bad.price = "اكتب السعر بالأرقام، مثال 2.50";
        }
        if (f.hasDisc.checked) {
          const v = num(f.d_value.value);
          const dd = { type: f.d_type.value, value: v };
          if (f.d_start.value) dd.start = f.d_start.value;
          if (f.d_end.value) dd.end = f.d_end.value;
          if (dd.type === "percent" && !(v >= 1 && v <= 90)) bad.d_value = "النسبة بين 1 و 90";
          if (dd.type === "price" && !(v > 0 && v < out.price)) bad.d_value = "السعر الجديد يجب أن يكون أقل من السعر الأصلي";
          if (dd.start && dd.end && dd.start > dd.end) bad.d_end = "تاريخ النهاية قبل البداية";
          out.discount = dd;
        }
        if (img) out.img = img;
        if (f.popular.checked) out.popular = true;
        if (f.soldout.checked) out.soldout = true;
        if (f.hidden.checked) out.hidden = true;
        if (f.day.value !== "") out.day = +f.day.value;
        if (f.serves.value.trim()) out.serves = f.serves.value.trim();
        if (!markErrors(form, bad)) return;
        const newCat = f.cat.value;
        try {
          const ok = await commit(`${found ? "تعديل" : "إضافة"}: ${out.ar}`, (dd) => {
            const target = dd.categories.find((c) => c.key === newCat);
            if (found) {
              const cur = findItem(id, dd);
              const i = cur.cat.items.indexOf(cur.item);
              if (cur.cat.key === newCat) { cur.cat.items[i] = out; return; }
              cur.cat.items.splice(i, 1);
            }
            target.items.push(out);
          });
          if (ok) mm.close(true);
        } catch (e) { e.errors ? showErrors(el, e.errors) : handleError(e); }
      };
    },
  });
}

/* ================= Offers & discounts ================= */
function renderOffers() {
  const d = state.data;
  const offers = d.offers || [];
  const discounted_ = allItems().filter((x) => x.item.discount);
  $("#content").innerHTML = `
    <div class="page-head"><h2>العروض</h2><button class="btn primary" id="addOffer">+ عرض جديد</button></div>
    <p class="hint">العروض تظهر في أعلى المنيو تحت عنوان «العروض» ويمكن للزبون طلبها مباشرة. اختر تاريخ البداية والنهاية ليظهر العرض ويختفي تلقائياً.</p>
    ${offers.length ? `<div class="list">${offers.map((o) => {
      const p = period(o);
      return `<div class="row ${p.cls === "green" ? "" : "dim"}" data-oid="${o.id}">
        ${thumb(o.img)}
        <div class="main" data-edit><div class="name">${esc(o.ar)}</div><div class="sub">${esc(o.desc_ar || o.en || "")}</div><div class="pills">${pill(p.label, p.cls)}</div></div>
        <div class="actions">
          <span class="price">${o.old_price ? `<s>${fmt(o.old_price)}</s>` : ""}${fmt(o.price)}</span>
          <label class="switch" title="تشغيل / إيقاف"><input type="checkbox" data-active ${o.active !== false ? "checked" : ""}><span class="track"></span></label>
          <button class="btn sm" data-edit>تعديل</button>
        </div></div>`;
    }).join("")}</div>` : `<div class="empty"><b>لا توجد عروض حالياً</b>اضغط «+ عرض جديد» لإضافة عرض مثل «وجبة العائلة» أو «عرض الجمعة».</div>`}

    <div class="page-head" style="margin-top:28px"><h2>الخصومات على الأصناف</h2><button class="btn primary" id="addDisc">+ إضافة خصم</button></div>
    <p class="hint">الخصم يُظهر السعر القديم مشطوباً والسعر الجديد بجانبه. يمكنك اختيار صنف واحد أو عدة أصناف أو قسماً كاملاً.</p>
    ${discounted_.length ? `<div class="list">${discounted_.map(({ item: i, cat }) => {
      const p = period(i.discount), dd = i.discount;
      return `<div class="row" data-did="${i.id}">
        ${thumb(i.img)}
        <div class="main" data-dedit><div class="name">${esc(i.ar)}</div><div class="sub">${esc(cat.ar)} · ${dd.type === "percent" ? `خصم ${dd.value}%` : `سعر جديد ${fmt(dd.value)}`}${dd.start ? ` · من ${dateText(dd.start)}` : ""}${dd.end ? ` · إلى ${dateText(dd.end)}` : ""}</div><div class="pills">${pill(p.label, p.cls)}</div></div>
        <div class="actions"><span class="price">${priceLabel(i)}</span><button class="btn sm" data-dedit>تعديل</button><button class="btn sm danger" data-dremove>إزالة</button></div>
      </div>`;
    }).join("")}</div>
    <div style="margin-top:10px"><button class="btn sm danger" id="clearEnded" ${discounted_.some((x) => period(x.item.discount).cls === "red") ? "" : "hidden"}>إزالة الخصومات المنتهية</button></div>` : `<div class="empty"><b>لا توجد خصومات</b>اضغط «+ إضافة خصم».</div>`}`;

  $("#addOffer").onclick = () => openOfferEditor(null);
  $("#addDisc").onclick = () => openDiscountEditor([]);
  $$("[data-oid]").forEach((row) => {
    const id = +row.dataset.oid;
    $$("[data-edit]", row).forEach((b) => (b.onclick = () => openOfferEditor(id)));
    const a = $("[data-active]", row);
    a.onchange = () => quick(a.checked ? "تشغيل عرض" : "إيقاف عرض", (dd) => { const o = dd.offers.find((x) => x.id === id); if (a.checked) delete o.active; else o.active = false; });
  });
  $$("[data-did]").forEach((row) => {
    const id = +row.dataset.did;
    $$("[data-dedit]", row).forEach((b) => (b.onclick = () => openDiscountEditor([id])));
    $("[data-dremove]", row).onclick = async () => {
      const it = findItem(id).item;
      if (await confirmDialog(`إزالة الخصم عن «${it.ar}»؟`, { ok: "إزالة الخصم", danger: true })) quick(`إزالة خصم: ${it.ar}`, (dd) => { delete findItem(id, dd).item.discount; });
    };
  });
  const ce = $("#clearEnded");
  if (ce) ce.onclick = async () => {
    if (await confirmDialog("إزالة كل الخصومات المنتهية؟", { ok: "إزالة" })) quick("إزالة الخصومات المنتهية", (dd) => allItems(dd).forEach(({ item }) => { if (item.discount && period(item.discount).cls === "red") delete item.discount; }));
  };
}

function openOfferEditor(id) {
  const d = state.data;
  const found = id != null ? d.offers.find((o) => o.id === id) : null;
  const o = found ? structuredClone(found) : { ar: "", en: "", desc_ar: "", desc_en: "", price: 0 };
  let img = o.img || null;
  const m = openModal({
    title: found ? `تعديل العرض: ${o.ar}` : "عرض جديد",
    body: `<form class="form" id="offerForm" novalidate>
      <div class="photo-box">${photoField(img)}</div>
      <label class="switch"><input type="checkbox" name="active" ${o.active !== false ? "checked" : ""}><span class="track"></span>العرض فعّال</label>
      <div class="grid2">
        <label class="field"><span>اسم العرض بالعربي *</span><input name="ar" maxlength="100" value="${esc(o.ar)}" placeholder="مثال: عرض العائلة"></label>
        <label class="field"><span>بالإنجليزي <small>(اختياري)</small></span><input name="en" maxlength="100" dir="ltr" value="${esc(o.en || "")}"></label>
      </div>
      <label class="field"><span>ماذا يشمل العرض؟</span><textarea name="desc_ar" maxlength="400" placeholder="مثال: 4 سندويشات شاورما + بطاطا كبيرة + 4 مشروبات">${esc(o.desc_ar || "")}</textarea></label>
      <label class="field"><span>بالإنجليزي <small>(اختياري)</small></span><textarea name="desc_en" maxlength="400" dir="ltr">${esc(o.desc_en || "")}</textarea></label>
      <div class="grid2">
        <label class="field"><span>سعر العرض (دينار) *</span><input name="price" inputmode="decimal" value="${o.price ? fmt(o.price) : ""}"></label>
        <label class="field"><span>السعر قبل العرض <small>(اختياري، يظهر مشطوباً)</small></span><input name="old_price" inputmode="decimal" value="${o.old_price ? fmt(o.old_price) : ""}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>يبدأ من <small>(اختياري)</small></span><input type="date" name="start" value="${o.start || ""}"></label>
        <label class="field"><span>ينتهي في <small>(اختياري)</small></span><input type="date" name="end" value="${o.end || ""}"></label>
      </div>
    </form>`,
    foot: `<button class="btn primary big" data-save>حفظ العرض</button>${found ? `<button class="btn danger" data-del>حذف العرض</button>` : ""}<button class="btn" data-cancel>إلغاء</button>`,
    onMount(el, mm) {
      const form = $("#offerForm", el);
      let dirty = false;
      form.addEventListener("input", () => (dirty = true));
      mm.beforeClose = async () => !dirty || confirmDialog("هل تريد إغلاق النموذج بدون حفظ؟", { ok: "إغلاق بدون حفظ", danger: true });
      bindPhoto(el, () => img, (v) => { img = v; dirty = true; });
      $("[data-cancel]", el).onclick = () => mm.close();
      if (found) $("[data-del]", el).onclick = async () => {
        if (!(await confirmDialog(`حذف العرض «${o.ar}»؟`, { ok: "حذف", danger: true, detail: "لإخفائه مؤقتاً أوقف زر «العرض فعّال» بدلاً من الحذف." }))) return;
        try { if (await commit(`حذف عرض: ${o.ar}`, (dd) => { dd.offers = dd.offers.filter((x) => x.id !== id); })) mm.close(true); }
        catch (e) { e.errors ? showErrors(el, e.errors) : handleError(e); }
      };
      $("[data-save]", el).onclick = async () => {
        if (el.dataset.uploading) return toast("انتظر حتى ينتهي رفع الصورة", true);
        const f = form, bad = {};
        const out = { id: found ? id : nextOfferId(state.data), ar: f.ar.value.trim(), en: f.en.value.trim(), desc_ar: f.desc_ar.value.trim(), desc_en: f.desc_en.value.trim(), price: num(f.price.value) };
        if (!out.ar) bad.ar = "اكتب اسم العرض";
        if (!(out.price > 0)) bad.price = "اكتب سعر العرض بالأرقام";
        if (f.old_price.value.trim()) {
          out.old_price = num(f.old_price.value);
          if (!(out.old_price > out.price)) bad.old_price = "يجب أن يكون أكبر من سعر العرض، أو اتركه فارغاً";
        }
        if (f.start.value) out.start = f.start.value;
        if (f.end.value) out.end = f.end.value;
        if (out.start && out.end && out.start > out.end) bad.end = "تاريخ النهاية قبل البداية";
        if (out.end && out.end < ammanToday()) bad.end = "هذا التاريخ مضى، العرض لن يظهر";
        if (!f.active.checked) out.active = false;
        if (img) out.img = img;
        if (!markErrors(form, bad)) return;
        try {
          const ok = await commit(`${found ? "تعديل" : "إضافة"} عرض: ${out.ar}`, (dd) => {
            dd.offers = dd.offers || [];
            const i = dd.offers.findIndex((x) => x.id === id);
            if (i >= 0) dd.offers[i] = out; else dd.offers.unshift(out);
          });
          if (ok) mm.close(true);
        } catch (e) { e.errors ? showErrors(el, e.errors) : handleError(e); }
      };
    },
  });
}

function openDiscountEditor(preselected) {
  const d = state.data;
  const first = preselected.length === 1 ? findItem(preselected[0]).item.discount : null;
  const m = openModal({
    title: preselected.length === 1 ? `خصم: ${findItem(preselected[0]).item.ar}` : "إضافة خصم",
    body: `<form class="form" id="discForm" novalidate>
      <div class="field"><span class="field-label">الأصناف</span>
        <div class="grid2">
          <select id="pickCat"><option value="">تحديد قسم كامل…</option>${d.categories.map((c) => `<option value="${c.key}">${esc(c.ar)} (${c.items.length})</option>`).join("")}</select>
          <input type="search" id="pickQ" placeholder="ابحث…" style="min-height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px">
        </div>
        <div class="pick-list" id="pickList">${allItems().map(({ item: i, cat }) => `<label data-name="${esc((i.ar + " " + (i.en || "")).toLowerCase())}"><input type="checkbox" value="${i.id}" data-cat="${cat.key}" ${preselected.includes(i.id) ? "checked" : ""}><span>${esc(i.ar)}${i.discount ? ` <span class="pill brand">عليه خصم</span>` : ""}</span><span class="pc">${esc(cat.ar)} · ${fmt(minPrice(i))}</span></label>`).join("")}</div>
        <input type="hidden" name="items"><span class="muted small" id="pickCount"></span>
      </div>
      <div class="seg">
        <label><input type="radio" name="d_type" value="percent" ${first?.type !== "price" ? "checked" : ""}>نسبة %</label>
        <label id="priceSeg"><input type="radio" name="d_type" value="price" ${first?.type === "price" ? "checked" : ""}>سعر جديد</label>
      </div>
      <label class="field"><span id="dLabel">نسبة الخصم %</span><input name="d_value" inputmode="decimal" value="${first ? (first.type === "price" ? fmt(first.value) : first.value) : ""}"></label>
      <div class="grid2">
        <label class="field"><span>من تاريخ <small>(اختياري)</small></span><input type="date" name="d_start" value="${first?.start || ""}"></label>
        <label class="field"><span>إلى تاريخ <small>(اختياري)</small></span><input type="date" name="d_end" value="${first?.end || ""}"></label>
      </div>
      <p class="muted small" style="margin:0">اترك التاريخين فارغين ليبقى الخصم حتى تزيله بنفسك.</p>
    </form>`,
    foot: `<button class="btn primary big" data-save>تطبيق الخصم</button><button class="btn" data-cancel>إلغاء</button>`,
    onMount(el, mm) {
      const form = $("#discForm", el);
      const checked = () => $$("#pickList input:checked", el).map((x) => +x.value);
      const upd = () => {
        const ids = checked();
        $("#pickCount", el).textContent = ids.length ? `تم اختيار ${ids.length} صنف` : "لم تختر أي صنف";
        const one = ids.length === 1 && !findItem(ids[0]).item.choice;
        $("#priceSeg", el).hidden = !one;
        if (!one) form.querySelector("[name=d_type][value=percent]").checked = true;
        $("#dLabel", el).textContent = form.d_type.value === "price" ? "السعر بعد الخصم (دينار)" : "نسبة الخصم %";
      };
      $("#pickList", el).addEventListener("change", upd);
      $$("[name=d_type]", el).forEach((r) => (r.onchange = upd));
      $("#pickCat", el).onchange = (e) => { $$("#pickList input", el).forEach((x) => { if (x.dataset.cat === e.target.value) x.checked = true; }); e.target.value = ""; upd(); };
      $("#pickQ", el).oninput = (e) => { const q = e.target.value.trim().toLowerCase(); $$("#pickList label", el).forEach((l) => (l.hidden = q && !l.dataset.name.includes(q))); };
      upd();
      $("[data-cancel]", el).onclick = () => mm.close();
      $("[data-save]", el).onclick = async () => {
        const ids = checked(), bad = {};
        const v = num(form.d_value.value);
        const dd = { type: form.d_type.value, value: v };
        if (form.d_start.value) dd.start = form.d_start.value;
        if (form.d_end.value) dd.end = form.d_end.value;
        if (!ids.length) bad.items = "اختر صنفاً واحداً على الأقل";
        if (dd.type === "percent" && !(v >= 1 && v <= 90)) bad.d_value = "النسبة بين 1 و 90";
        if (dd.type === "price" && ids.length === 1 && !(v > 0 && v < findItem(ids[0]).item.price)) bad.d_value = "السعر الجديد يجب أن يكون أقل من السعر الأصلي";
        if (dd.start && dd.end && dd.start > dd.end) bad.d_end = "تاريخ النهاية قبل البداية";
        if (dd.end && dd.end < ammanToday()) bad.d_end = "هذا التاريخ مضى";
        if (!markErrors(form, bad)) return;
        const replacing = ids.filter((i) => findItem(i).item.discount && !preselected.includes(i)).length;
        if (replacing && !(await confirmDialog(`${replacing} من الأصناف المختارة عليها خصم حالياً. استبداله بالخصم الجديد؟`, { ok: "استبدال" }))) return;
        try {
          const ok = await commit(`خصم على ${ids.length} صنف`, (data) => ids.forEach((i) => { findItem(i, data).item.discount = { ...dd }; }));
          if (ok) mm.close(true);
        } catch (e) { e.errors ? showErrors(el, e.errors) : handleError(e); }
      };
    },
  });
}

/* ================= Categories ================= */
function renderCats() {
  const d = state.data;
  $("#content").innerHTML = `
    <div class="page-head"><h2>الأقسام</h2><button class="btn primary" id="addCat">+ قسم جديد</button></div>
    <p class="hint">الترتيب هنا هو ترتيب الأقسام في المنيو. القسم المخفي لا يظهر للزبائن مع كل أصنافه.</p>
    <div class="list">${d.categories.map((c, n) => `
      <div class="row ${c.hidden ? "dim" : ""}" data-key="${c.key}">
        <div class="main" data-edit><div class="name">${esc(c.ar)}</div><div class="sub">${esc(c.en || "")} · ${c.items.length} صنف</div>${c.hidden ? `<div class="pills">${pill("مخفي", "red")}</div>` : ""}</div>
        <div class="actions">
          <label class="switch" title="ظاهر في المنيو"><input type="checkbox" data-vis ${c.hidden ? "" : "checked"}><span class="track"></span></label>
          <button class="icon-btn" data-up ${n === 0 ? "disabled" : ""} aria-label="تحريك للأعلى">▲</button>
          <button class="icon-btn" data-down ${n === d.categories.length - 1 ? "disabled" : ""} aria-label="تحريك للأسفل">▼</button>
          <button class="btn sm" data-edit>تعديل</button>
          <button class="btn sm danger" data-del>حذف</button>
        </div>
      </div>`).join("")}</div>`;
  $("#addCat").onclick = () => openCatEditor(null);
  $$("[data-key]").forEach((row) => {
    const key = row.dataset.key;
    $$("[data-edit]", row).forEach((b) => (b.onclick = () => openCatEditor(key)));
    $("[data-vis]", row).onchange = (e) => quick(e.target.checked ? "إظهار قسم" : "إخفاء قسم", (dd) => { const c = dd.categories.find((x) => x.key === key); if (e.target.checked) delete c.hidden; else c.hidden = true; });
    const mv = (dir) => quick("ترتيب الأقسام", (dd) => { const i = dd.categories.findIndex((x) => x.key === key), j = i + dir; if (j >= 0 && j < dd.categories.length) [dd.categories[i], dd.categories[j]] = [dd.categories[j], dd.categories[i]]; });
    $("[data-up]", row).onclick = () => mv(-1);
    $("[data-down]", row).onclick = () => mv(1);
    $("[data-del]", row).onclick = () => deleteCat(key);
  });
}
function openCatEditor(key) {
  const c = key ? state.data.categories.find((x) => x.key === key) : { ar: "", en: "" };
  const m = openModal({
    title: key ? `تعديل القسم: ${c.ar}` : "قسم جديد", size: "small",
    body: `<form class="form" id="catForm" novalidate>
      <label class="field"><span>اسم القسم بالعربي *</span><input name="ar" maxlength="60" value="${esc(c.ar)}" placeholder="مثال: الحلويات"></label>
      <label class="field"><span>بالإنجليزي <small>(اختياري)</small></span><input name="en" maxlength="60" dir="ltr" value="${esc(c.en || "")}" placeholder="e.g. Desserts"></label>
    </form>`,
    foot: `<button class="btn primary big" data-save>حفظ</button><button class="btn" data-cancel>إلغاء</button>`,
    onMount(el, mm) {
      const form = $("#catForm", el);
      form.onsubmit = (e) => { e.preventDefault(); $("[data-save]", el).click(); };
      $("[data-cancel]", el).onclick = () => mm.close();
      $("[data-save]", el).onclick = async () => {
        const ar = form.ar.value.trim(), en = form.en.value.trim();
        if (!markErrors(form, ar ? {} : { ar: "اكتب اسم القسم" })) return;
        if (state.data.categories.some((x) => x.ar === ar && x.key !== key)) return markErrors(form, { ar: "يوجد قسم بهذا الاسم" });
        try {
          const ok = await commit(`${key ? "تعديل" : "إضافة"} قسم: ${ar}`, (dd) => {
            if (key) Object.assign(dd.categories.find((x) => x.key === key), { ar, en });
            else dd.categories.push({ key: `c-${Date.now().toString(36)}`, ar, en, items: [] });
          });
          if (ok) mm.close(true);
        } catch (e) { e.errors ? showErrors(el, e.errors) : handleError(e); }
      };
    },
  });
}
async function deleteCat(key) {
  const d = state.data, c = d.categories.find((x) => x.key === key);
  if (d.categories.length === 1) return toast("لا يمكن حذف القسم الوحيد", true);
  if (!c.items.length) {
    if (await confirmDialog(`حذف قسم «${c.ar}»؟`, { ok: "حذف", danger: true })) quick(`حذف قسم: ${c.ar}`, (dd) => { dd.categories = dd.categories.filter((x) => x.key !== key); });
    return;
  }
  const m = openModal({
    title: `حذف قسم «${c.ar}»`, size: "small",
    body: `<p style="margin-top:0">في هذا القسم <b>${c.items.length}</b> صنف. ماذا تريد أن تفعل بها؟</p>
      <label class="field"><span>نقل الأصناف إلى</span><select id="moveTo">${d.categories.filter((x) => x.key !== key).map((x) => `<option value="${x.key}">${esc(x.ar)}</option>`).join("")}</select></label>`,
    foot: `<button class="btn primary" data-move style="flex:1">نقل الأصناف ثم حذف القسم</button><button class="btn danger" data-all>حذف القسم مع أصنافه</button><button class="btn" data-cancel>إلغاء</button>`,
    onMount(el, mm) {
      $("[data-cancel]", el).onclick = () => mm.close();
      $("[data-move]", el).onclick = async () => {
        const to = $("#moveTo", el).value;
        mm.close(true);
        quick(`حذف قسم: ${c.ar}`, (dd) => { const src = dd.categories.find((x) => x.key === key); dd.categories.find((x) => x.key === to).items.push(...src.items); dd.categories = dd.categories.filter((x) => x.key !== key); });
      };
      $("[data-all]", el).onclick = async () => {
        if (!(await confirmDialog(`حذف القسم و${c.items.length} صنف نهائياً؟`, { ok: "حذف الكل", danger: true }))) return;
        mm.close(true);
        quick(`حذف قسم مع أصنافه: ${c.ar}`, (dd) => { dd.categories = dd.categories.filter((x) => x.key !== key); });
      };
    },
  });
}

/* ================= Settings ================= */
function renderSettings() {
  const r = state.data.restaurant;
  $("#content").innerHTML = `
    <div class="page-head"><h2>معلومات المطعم</h2></div>
    <form class="form section-box" id="infoForm" novalidate>
      <div class="grid2">
        <label class="field"><span>اسم المطعم</span><input name="name_ar" maxlength="80" value="${esc(r.name_ar)}"></label>
        <label class="field"><span>بالإنجليزي</span><input name="name_en" maxlength="80" dir="ltr" value="${esc(r.name_en || "")}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>العبارة تحت الشعار</span><input name="tagline_ar" maxlength="200" value="${esc(r.tagline_ar || "")}"></label>
        <label class="field"><span>بالإنجليزي</span><input name="tagline_en" maxlength="200" dir="ltr" value="${esc(r.tagline_en || "")}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>رقم الهاتف <small>(لزر الاتصال)</small></span><input name="phone" dir="ltr" inputmode="tel" value="${esc(r.phone)}" placeholder="+962796066499"></label>
        <label class="field"><span>رقم واتساب للطلبات</span><input name="whatsapp" dir="ltr" inputmode="numeric" value="${esc(r.whatsapp)}" placeholder="962796066499"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>يفتح الساعة</span><input type="time" name="open" value="${esc(r.hours.open)}"></label>
        <label class="field"><span>يغلق الساعة</span><input type="time" name="close" value="${esc(r.hours.close)}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>العنوان</span><input name="address_ar" maxlength="200" value="${esc(r.address_ar || "")}"></label>
        <label class="field"><span>بالإنجليزي</span><input name="address_en" maxlength="200" dir="ltr" value="${esc(r.address_en || "")}"></label>
      </div>
      <div><button class="btn primary" type="submit">حفظ المعلومات</button></div>
    </form>

    <div class="page-head" style="margin-top:28px"><h2>سجل التعديلات</h2><button class="btn sm" id="loadHist">تحديث</button></div>
    <p class="hint">كل حفظ يحتفظ بنسخة من المنيو قبل التعديل لمدة 90 يوماً. إذا حصل خطأ، استرجع النسخة السابقة بضغطة.</p>
    <div id="hist"><div class="empty">جاري التحميل…</div></div>

    <div class="page-head" style="margin-top:28px"><h2>نسخة احتياطية</h2></div>
    <div class="section-box">
      <p class="muted small" style="margin:0">احفظ نسخة من المنيو كاملاً على جهازك، أو استعدها من ملف سابق.</p>
      <div class="toolbar" style="margin:0"><button class="btn" id="dlBackup">⬇️ تنزيل نسخة</button><label class="btn"><input type="file" accept="application/json,.json" hidden id="upBackup">⬆️ استعادة من ملف</label></div>
    </div>

    <div class="page-head" style="margin-top:28px"><h2>الحساب</h2></div>
    <div class="section-box">
      <p class="muted small" style="margin:0">لتغيير كلمة المرور: من لوحة Cloudflare ← Workers ← alneran ← Settings ← Variables and Secrets ← ADMIN_PASSWORD.</p>
      <div><button class="btn danger" id="logout">تسجيل الخروج</button></div>
    </div>`;

  $("#infoForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, bad = {};
    const out = { ...r, name_ar: f.name_ar.value.trim(), name_en: f.name_en.value.trim(), tagline_ar: f.tagline_ar.value.trim(), tagline_en: f.tagline_en.value.trim(), address_ar: f.address_ar.value.trim(), address_en: f.address_en.value.trim() };
    out.phone = f.phone.value.replace(/[٠-٩]/g, (x) => "٠١٢٣٤٥٦٧٨٩".indexOf(x)).replace(/[^+0-9]/g, "");
    out.whatsapp = f.whatsapp.value.replace(/[٠-٩]/g, (x) => "٠١٢٣٤٥٦٧٨٩".indexOf(x)).replace(/[^0-9]/g, "").replace(/^00/, "");
    if (/^07\d{8}$/.test(out.phone)) out.phone = "+962" + out.phone.slice(1);
    if (/^07\d{8}$/.test(out.whatsapp)) out.whatsapp = "962" + out.whatsapp.slice(1);
    out.hours = { open: f.open.value, close: f.close.value };
    if (!out.name_ar) bad.name_ar = "مطلوب";
    if (!/^\+?[0-9]{7,16}$/.test(out.phone)) bad.phone = "رقم غير صحيح";
    if (!/^[0-9]{9,15}$/.test(out.whatsapp)) bad.whatsapp = "اكتب الرقم مع رمز الدولة، مثال 962796066499";
    if (!/^\d\d:\d\d$/.test(out.hours.open)) bad.open = "اختر الوقت";
    if (!/^\d\d:\d\d$/.test(out.hours.close)) bad.close = "اختر الوقت";
    if (!markErrors(f, bad)) return;
    quick("تعديل معلومات المطعم", (dd) => { dd.restaurant = out; });
  };
  loadHistory();
  $("#loadHist").onclick = loadHistory;
  $("#dlBackup").onclick = () => {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `alneran-menu-${ammanToday()}.json` });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $("#upBackup").onchange = async (e) => {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch { return toast("الملف غير صالح", true); }
    const errors = validateMenu(data);
    if (errors.length) return toast(`الملف غير صالح: ${errors[0]}`, true);
    const n = data.categories.reduce((a, c) => a + c.items.length, 0);
    if (!(await confirmDialog(`استبدال المنيو الحالي بالنسخة من الملف؟ (${data.categories.length} قسم، ${n} صنف)`, { ok: "استعادة", danger: true }))) return;
    quick("استعادة من ملف", (dd) => { dd.restaurant = data.restaurant; dd.categories = data.categories; dd.offers = data.offers || []; });
  };
  $("#logout").onclick = async () => { try { await api("/api/logout", { method: "POST" }); } catch { /* ignore */ } showLogin(); };
}
async function loadHistory() {
  const box = $("#hist"); if (!box) return;
  try {
    const { items } = await api("/api/history");
    if (!$("#hist")) return;
    box.innerHTML = items.length ? `<div class="list">${items.map((h) => `
      <div class="row hist-row"><div class="main"><div class="when">${h.at ? whenText(h.at) : "النسخة الأصلية"}</div><div class="sub">${h.at ? `المنيو بعد: ${esc(h.note || "—")}` : "قبل أي تعديل من لوحة التحكم"} · استُبدلت ${whenText(new Date(h.time).toISOString())}</div></div>
      <div class="actions"><button class="btn sm" data-restore="${esc(h.key)}">استرجاع</button></div></div>`).join("")}</div>` : `<div class="empty">لا توجد نسخ سابقة بعد</div>`;
    $$("[data-restore]", box).forEach((b) => (b.onclick = async () => {
      if (!(await confirmDialog("استرجاع هذه النسخة؟ سيعود المنيو كما كان في ذلك الوقت.", { ok: "استرجاع", detail: "النسخة الحالية ستُحفظ في السجل أيضاً، يمكنك التراجع." }))) return;
      busy(true, "جاري الاسترجاع…");
      try { await api("/api/history/restore", { method: "POST", body: { key: b.dataset.restore } }); await loadMenu(); toast("تم الاسترجاع ✓"); }
      catch (e) { handleError(e); } finally { busy(false); }
    }));
  } catch (e) { box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

start();
