// Menu data rules, shared by the admin page (browser) and the Worker (server).
// validateMenu(data) returns a list of Arabic error messages; an empty list means the data is safe to publish.

export const LIMITS = { categories: 40, itemsPerCategory: 200, offers: 40, options: 20 };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const IMG = /^(img\/[\w.-]+|\/media\/[\w-]+)$/;
const KEY = /^[a-z0-9-]{1,40}$/;

const isStr = (v, max, required = false) => typeof v === "string" && v.length <= max && (!required || v.trim().length > 0);
const isPrice = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1000;
const isBool = (v) => v === undefined || typeof v === "boolean";

export function checkDiscount(d, where, errs, basePrice, hasChoice) {
  if (d == null) return;
  if (typeof d !== "object") return errs.push(`${where}: بيانات الخصم غير صحيحة`);
  if (d.type === "percent") {
    if (!(typeof d.value === "number" && d.value >= 1 && d.value <= 90)) errs.push(`${where}: نسبة الخصم يجب أن تكون بين 1% و 90%`);
  } else if (d.type === "price") {
    if (hasChoice) errs.push(`${where}: للأصناف ذات الخيارات استخدم الخصم بالنسبة المئوية`);
    else if (!isPrice(d.value) || !(d.value < basePrice)) errs.push(`${where}: السعر بعد الخصم يجب أن يكون أقل من السعر الأصلي`);
  } else errs.push(`${where}: نوع الخصم غير معروف`);
  if (d.start != null && !DATE.test(d.start)) errs.push(`${where}: تاريخ بداية الخصم غير صحيح`);
  if (d.end != null && !DATE.test(d.end)) errs.push(`${where}: تاريخ نهاية الخصم غير صحيح`);
  if (d.start && d.end && d.start > d.end) errs.push(`${where}: تاريخ النهاية قبل تاريخ البداية`);
}

function checkItem(it, where, errs, ids) {
  if (!it || typeof it !== "object") return errs.push(`${where}: بيانات غير صحيحة`);
  if (!Number.isInteger(it.id) || it.id <= 0) errs.push(`${where}: رقم الصنف غير صحيح`);
  else if (ids.has(it.id)) errs.push(`${where}: رقم الصنف مكرر (${it.id})`);
  else ids.add(it.id);
  const name = it.ar || where;
  if (!isStr(it.ar, 100, true)) errs.push(`${name}: الاسم بالعربي مطلوب (حتى 100 حرف)`);
  if (it.en != null && !isStr(it.en, 100)) errs.push(`${name}: الاسم بالإنجليزي طويل جداً`);
  if (it.desc_ar != null && !isStr(it.desc_ar, 400)) errs.push(`${name}: الوصف بالعربي طويل جداً`);
  if (it.desc_en != null && !isStr(it.desc_en, 400)) errs.push(`${name}: الوصف بالإنجليزي طويل جداً`);
  if (!isPrice(it.price)) errs.push(`${name}: السعر غير صحيح`);
  if (it.img != null && !(typeof it.img === "string" && IMG.test(it.img))) errs.push(`${name}: رابط الصورة غير صحيح`);
  if (it.choice != null) {
    const c = it.choice;
    if (!c || !Array.isArray(c.options) || c.options.length < 1 || c.options.length > LIMITS.options) errs.push(`${name}: الخيارات يجب أن تكون بين 1 و ${LIMITS.options}`);
    else {
      if (!isStr(c.ar, 40, true)) errs.push(`${name}: اسم مجموعة الخيارات مطلوب`);
      c.options.forEach((o, n) => {
        if (!o || !isStr(o.ar, 60, true)) errs.push(`${name}: اسم الخيار ${n + 1} مطلوب`);
        if (o && o.en != null && !isStr(o.en, 60)) errs.push(`${name}: اسم الخيار ${n + 1} بالإنجليزي طويل جداً`);
        if (!o || !isPrice(o.price)) errs.push(`${name}: سعر الخيار ${n + 1} غير صحيح`);
      });
    }
  }
  if (it.day != null && !(Number.isInteger(it.day) && it.day >= 0 && it.day <= 6)) errs.push(`${name}: يوم التقديم غير صحيح`);
  if (it.serves != null && !isStr(it.serves, 12)) errs.push(`${name}: عدد الأشخاص طويل جداً`);
  if (!isBool(it.popular) || !isBool(it.soldout) || !isBool(it.hidden)) errs.push(`${name}: قيم غير صحيحة`);
  checkDiscount(it.discount, name, errs, it.price, !!it.choice);
}

export function validateMenu(m) {
  const errs = [];
  if (!m || typeof m !== "object") return ["بيانات المنيو غير صحيحة"];
  const r = m.restaurant;
  if (!r || typeof r !== "object") errs.push("معلومات المطعم مفقودة");
  else {
    if (!isStr(r.name_ar, 80, true)) errs.push("اسم المطعم مطلوب");
    if (!/^\+?[0-9 ]{7,16}$/.test(r.phone || "")) errs.push("رقم الهاتف غير صحيح");
    if (!/^[0-9]{9,15}$/.test(r.whatsapp || "")) errs.push("رقم واتساب غير صحيح (أرقام فقط مع رمز الدولة، مثال 962796066499)");
    if (!r.hours || !TIME.test(r.hours.open || "") || !TIME.test(r.hours.close || "")) errs.push("ساعات العمل غير صحيحة");
    for (const k of ["tagline_ar", "tagline_en", "address_ar", "address_en", "name_en"]) if (r[k] != null && !isStr(r[k], 200)) errs.push("نص طويل جداً في معلومات المطعم");
  }
  const ids = new Set();
  if (!Array.isArray(m.categories) || m.categories.length > LIMITS.categories) errs.push("الأقسام غير صحيحة");
  else {
    const keys = new Set();
    m.categories.forEach((c, i) => {
      const where = c && c.ar ? `قسم «${c.ar}»` : `القسم ${i + 1}`;
      if (!c || !KEY.test(c.key || "") || keys.has(c.key)) errs.push(`${where}: معرّف القسم غير صحيح أو مكرر`);
      else keys.add(c.key);
      if (!c || !isStr(c.ar, 60, true)) errs.push(`${where}: اسم القسم بالعربي مطلوب`);
      if (c && c.en != null && !isStr(c.en, 60)) errs.push(`${where}: اسم القسم بالإنجليزي طويل جداً`);
      if (c && !isBool(c.hidden)) errs.push(`${where}: قيم غير صحيحة`);
      if (!c || !Array.isArray(c.items) || c.items.length > LIMITS.itemsPerCategory) errs.push(`${where}: الأصناف غير صحيحة`);
      else c.items.forEach((it, n) => checkItem(it, `${where} — صنف ${n + 1}`, errs, ids));
    });
  }
  if (m.offers != null) {
    if (!Array.isArray(m.offers) || m.offers.length > LIMITS.offers) errs.push("العروض غير صحيحة");
    else m.offers.forEach((o, n) => {
      const where = o && o.ar ? `عرض «${o.ar}»` : `العرض ${n + 1}`;
      checkItem({ ...o, choice: undefined, discount: undefined }, where, errs, ids);
      if (o.old_price != null && (!isPrice(o.old_price) || !(o.old_price > o.price))) errs.push(`${where}: السعر قبل العرض يجب أن يكون أكبر من سعر العرض`);
      if (!isBool(o.active)) errs.push(`${where}: قيم غير صحيحة`);
      if (o.start != null && !DATE.test(o.start)) errs.push(`${where}: تاريخ البداية غير صحيح`);
      if (o.end != null && !DATE.test(o.end)) errs.push(`${where}: تاريخ النهاية غير صحيح`);
      if (o.start && o.end && o.start > o.end) errs.push(`${where}: تاريخ النهاية قبل تاريخ البداية`);
    });
  }
  return errs;
}

// Today's date in Amman as YYYY-MM-DD
export function ammanToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Amman", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// Is a dated thing (discount/offer) running today? Missing dates mean open-ended.
export function inRange(o, today = ammanToday()) {
  return !!o && (!o.start || o.start <= today) && (!o.end || o.end >= today);
}

// Price after an active discount, rounded to 0.01 JD so every total adds up exactly as displayed
export function discounted(price, d, today = ammanToday()) {
  if (!d || !inRange(d, today)) return price;
  const p = d.type === "percent" ? price * (1 - d.value / 100) : d.value;
  return Math.max(0, Math.round(p * 100) / 100);
}
