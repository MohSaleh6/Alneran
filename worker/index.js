// Alneran menu Worker: serves the menu data and uploaded photos, and the admin API.
// Static files (the menu site and /admin) are served by Cloudflare assets; only /api/* and /media/* reach this code.
//
// Storage (KV binding STORE):
//   menu            the live menu JSON (falls back to the bundled site/menu.json until the first save)
//   hist:<time>     previous versions, kept 90 days (metadata: version, time, note)
//   media:<id>      uploaded photos (metadata: content type)
// Secret: ADMIN_PASSWORD (set in the Cloudflare dashboard). Without it the admin API stays locked.

import { validateMenu } from "../site/admin/validate.js";

const COOKIE = "alneran_admin";
const SESSION_DAYS = 30;
const HISTORY_TTL = 90 * 24 * 3600;
const MAX_UPLOAD = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const fail = (status, error, extra = {}) => json({ error, ...extra }, status);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/media/")) return await media(url, env, ctx);
      if (url.pathname.startsWith("/api/")) return await api(request, url, env);
      return env.ASSETS.fetch(request);
    } catch (e) {
      console.error(e);
      return fail(500, "حدث خطأ في الخادم، حاول مرة أخرى");
    }
  },
};

/* ---------------- Menu data ---------------- */
async function loadMenu(env, request) {
  const stored = await env.STORE.get("menu", "json");
  if (stored) return stored;
  const seed = await env.ASSETS.fetch(new Request(new URL("/menu.json", request.url)));
  const data = await seed.json();
  data.version = 0;
  data.offers = data.offers || [];
  return data;
}

async function api(request, url, env) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/api/menu" && method === "GET") {
    const data = await loadMenu(env, request);
    return json(data, 200, { "cache-control": "public, max-age=0, must-revalidate" });
  }

  // Everything below is admin-only and must come from our own admin page
  if (method !== "GET" && request.headers.get("x-admin") !== "1") return fail(403, "طلب غير مسموح");
  if (!env.ADMIN_PASSWORD) return fail(503, "لوحة التحكم غير مفعّلة بعد، تواصل مع الدعم الفني");

  if (path === "/api/login" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (typeof body.password !== "string" || !(await sameText(body.password, env.ADMIN_PASSWORD))) {
      await new Promise((r) => setTimeout(r, 800));
      return fail(401, "كلمة المرور غير صحيحة");
    }
    const token = await makeToken(env);
    return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}` });
  }
  if (path === "/api/logout" && method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }

  if (!(await checkToken(request, env))) return fail(401, "انتهت الجلسة، سجّل الدخول مرة أخرى", { login: true });

  if (path === "/api/session" && method === "GET") return json({ ok: true });

  if (path === "/api/menu" && method === "PUT") {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.data !== "object") return fail(400, "بيانات غير صحيحة");
    const current = await loadMenu(env, request);
    if (body.base_version !== current.version) {
      return fail(409, "تم تعديل المنيو من جهاز آخر. سيتم تحميل آخر نسخة، ثم أعد التعديل.", { conflict: true });
    }
    const data = body.data;
    const errors = validateMenu(data);
    if (errors.length) return fail(422, errors[0], { errors });
    const note = String(body.note || "").slice(0, 120);
    // keep the previous version so any change can be undone
    await env.STORE.put(`hist:${Date.now()}`, JSON.stringify(current), {
      expirationTtl: HISTORY_TTL,
      metadata: { v: current.version, at: current.updated || null, note: current.note || "النسخة الأصلية" },
    });
    data.version = current.version + 1;
    data.updated = new Date().toISOString();
    data.note = note;
    await env.STORE.put("menu", JSON.stringify(data));
    return json({ ok: true, version: data.version, updated: data.updated });
  }

  if (path === "/api/history" && method === "GET") {
    const list = await env.STORE.list({ prefix: "hist:" });
    const items = list.keys
      .map((k) => ({ key: k.name, time: +k.name.slice(5), ...(k.metadata || {}) }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 50);
    return json({ items });
  }

  if (path === "/api/history/restore" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (typeof body.key !== "string" || !body.key.startsWith("hist:")) return fail(400, "نسخة غير صحيحة");
    const old = await env.STORE.get(body.key, "json");
    if (!old) return fail(404, "هذه النسخة لم تعد موجودة");
    const current = await loadMenu(env, request);
    await env.STORE.put(`hist:${Date.now()}`, JSON.stringify(current), {
      expirationTtl: HISTORY_TTL,
      metadata: { v: current.version, at: current.updated || null, note: current.note || "" },
    });
    old.version = current.version + 1;
    old.updated = new Date().toISOString();
    old.note = "استرجاع نسخة سابقة";
    await env.STORE.put("menu", JSON.stringify(old));
    return json({ ok: true, version: old.version });
  }

  if (path === "/api/upload" && method === "POST") {
    const type = (request.headers.get("content-type") || "").split(";")[0].trim();
    if (!IMAGE_TYPES.includes(type)) return fail(415, "نوع الصورة غير مدعوم (JPG أو PNG أو WEBP)");
    const buf = await request.arrayBuffer();
    if (!buf.byteLength) return fail(400, "الصورة فارغة");
    if (buf.byteLength > MAX_UPLOAD) return fail(413, "الصورة كبيرة جداً (الحد 4 ميغابايت)");
    const id = crypto.randomUUID().replace(/-/g, "");
    await env.STORE.put(`media:${id}`, buf, { metadata: { type } });
    return json({ ok: true, url: `/media/${id}` });
  }

  return fail(404, "غير موجود");
}

/* ---------------- Uploaded photos ---------------- */
async function media(url, env, ctx) {
  const id = url.pathname.slice(7);
  if (!/^[a-f0-9]{32}$/.test(id)) return new Response("Not found", { status: 404 });
  const cache = caches.default;
  const hit = await cache.match(url.toString());
  if (hit) return hit;
  const { value, metadata } = await env.STORE.getWithMetadata(`media:${id}`, { type: "arrayBuffer", cacheTtl: 86400 });
  if (!value) return new Response("Not found", { status: 404 });
  const res = new Response(value, {
    headers: { "content-type": metadata?.type || "image/webp", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
  ctx.waitUntil(cache.put(url.toString(), res.clone()));
  return res;
}

/* ---------------- Sessions (signed cookie) ---------------- */
const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmac(env, text) {
  const key = await crypto.subtle.importKey("raw", enc.encode(`alneran:${env.ADMIN_PASSWORD}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}
async function sameText(a, b) {
  // compare digests so the time taken doesn't reveal the password
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest("SHA-256", enc.encode(s))));
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}
async function makeToken(env) {
  const exp = Date.now() + SESSION_DAYS * 86400 * 1000;
  return `${exp}.${await hmac(env, String(exp))}`;
}
async function checkToken(request, env) {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig || !(+exp > Date.now())) return false;
  return sameText(sig, await hmac(env, exp));
}
