// ĀL BURGER one-page site: content + language toggle (runs first), then scroll motion
// (Lenis + GSAP ScrollTrigger) once the libraries have loaded. Motion only runs when
// the visitor hasn't asked for reduced motion; otherwise the page stays a normal static page.
(function () {
'use strict';

/* ---------- Content ---------- */
const T = {
en: {skip:'Skip to the menu',nav_sig:'Signature',nav_menu:'Menu',nav_find:'Find us',lang:'عربي',order:'Order on Talabat',order_short:'Order',hero_1:'Made right.',hero_2:'Tastes right.',
hero_sub:'Flame-grilled burgers and crispy chicken on Airport Road. Eat in, grab it from the drive-thru, or get it delivered.',
hero_alt:'ĀL BURGER Double Chicken: two crispy chicken fillets with lettuce, mayo and cheese',
cta_menu:'See the menu',cta_find:'Get directions',rating:'4.7 on Google from 2,376 reviews',
sig_title:'Signature meals',sig_sub:'Prices are for a regular meal. Go medium for +0.60 or large for +1.00.',reg:'regular meal',show:'Show',
menu_title:'The full menu',menu_sub:'Prices in JOD, sales tax included.',
t_sig:'Signature meals',t_box:'Āl Nashama Box',t_little:'Little Āl',t_sides:'Sides',t_dessert:'Desserts',t_drinks:'Drinks',
s_R:'Regular',s_M:'Medium',s_L:'Large',sand:'Sandwich',meal:'Meal',box_note:'3 mini burgers, fries and a drink.',size_label:'Meal size',
find_title:'Find us',addr_t:'Address',addr:'Airport Road, Amman',dine_t:'Dine-in',dine:'11 am to 3 am, every day',drive_t:'Drive-thru',drive:'11 am to 4 am, every day',phone_t:'Phone',
directions:'Get directions',call:'Call the restaurant',insta:'Follow @alburger.jo',services_label:'Services',
credit:'Demo website by Mohammad Saleh',cur:'JOD',
services:['Drive-thru','Dine-in','Delivery on Talabat','Self-order screens','Kids’ play area','Outdoor seating','Parking']},
ar: {skip:'انتقل للمنيو',nav_sig:'المميزة',nav_menu:'المنيو',nav_find:'موقعنا',lang:'English',order:'اطلب عن طلبات',order_short:'اطلب',hero_1:'معمول صح.',hero_2:'طعمه صح.',
hero_sub:'برجر لحمة مشوي على اللهب ودجاج مقرمش على طريق المطار. كُل عنّا، خُذ طلبك من الدرايف ثرو، أو اطلبه توصيل.',
hero_alt:'الدبل تشيكن من آل برجر: قطعتين دجاج مقرمش مع خس ومايونيز وجبنة',
cta_menu:'شوف المنيو',cta_find:'الاتجاهات',rating:'4.7 على جوجل من 2,376 تقييم',
sig_title:'الوجبات المميزة',sig_sub:'الأسعار للوجبة العادية. الوسط +0.60 والكبير +1.00.',reg:'وجبة عادية',show:'اعرض',
menu_title:'المنيو كامل',menu_sub:'الأسعار بالدينار الأردني وشاملة ضريبة المبيعات.',
t_sig:'الوجبات المميزة',t_box:'بوكس النشامى',t_little:'آل الصغير',t_sides:'إضافات',t_dessert:'حلويات',t_drinks:'مشروبات',
s_R:'عادي',s_M:'وسط',s_L:'كبير',sand:'ساندويش',meal:'وجبة',box_note:'3 ميني برجر مع بطاطا ومشروب.',size_label:'حجم الوجبة',
find_title:'موقعنا',addr_t:'العنوان',addr:'طريق المطار، عمّان',dine_t:'الصالة',dine:'من 11 الصبح لـ 3 الفجر، كل يوم',drive_t:'الدرايف ثرو',drive:'من 11 الصبح لـ 4 الفجر، كل يوم',phone_t:'الهاتف',
directions:'الاتجاهات على الخريطة',call:'اتصل بالمطعم',insta:'تابعنا على إنستغرام',services_label:'خدماتنا',
credit:'موقع تجريبي من تصميم محمد صالح',cur:'د.أ',
services:['درايف ثرو','صالة طعام','توصيل عبر طلبات','شاشات طلب ذاتي','منطقة ألعاب للأطفال','جلسات خارجية','مواقف سيارات']}
};
const SIG = [
 {id:'beefy',en:'Āl Beefy',ar:'آل بيفي',d:{en:'Flame-grilled beef burger.',ar:'برجر لحمة مشوي على اللهب.'},p:4.50,c:'#E5A823'},
 {id:'crunchy',en:'Āl Crunchy',ar:'آل كرنشي',d:{en:'Crispy chicken, regular or spicy.',ar:'دجاج مقرمش، عادي أو حار.'},p:4.50,c:'#E68A3A'},
 {id:'hotbeef',en:'Āl Hot Beef',ar:'آل هوت بيف',d:{en:'Flame-grilled beef with a kick.',ar:'لحمة مشوية على اللهب مع حرارة.'},p:4.50,c:'#D9573B'},
 {id:'dijon',en:'Āl Dijon Chicken',ar:'آل ديجون تشكن',d:{en:'Chicken with Dijon mustard.',ar:'دجاج مع خردل ديجون.'},p:4.75,c:'#D8B43A'},
 {id:'smokey',en:'Āl Smokey',ar:'آل سموكي',d:{en:'One of the best sellers on Talabat.',ar:'من الأكثر طلباً على طلبات.'},p:4.75,c:'#B9784A'},
 {id:'looong',en:'Looong Crispy',ar:'لووونغ كرسبي',d:{en:'Long crispy chicken sandwich, a top seller.',ar:'ساندويش دجاج مقرمش طويل، من الأكثر مبيعاً.'},p:4.50,c:'#7FA94F'}
];
const n = (en, ar, sub) => ({en, ar, sub});
const MENU = {
 sig: SIG.map(s => ({name:n(s.en, s.ar), sized:s.p})),
 box: [{name:n('Āl Nashama Box, beef','بوكس النشامى، لحمة'),opts:[['',6.00]]},{name:n('Āl Nashama Box, chicken','بوكس النشامى، دجاج',{en:'Regular or spicy',ar:'عادي أو حار'}),opts:[['',6.00]]}],
 little: [
  {name:n('Beef Burger','برجر لحمة'),opts:[['sand',1.50],['meal',2.75]]},
  {name:n('Beef & Cheese','لحمة وجبنة'),opts:[['sand',1.75],['meal',2.75]]},
  {name:n('Chicken Burger','برجر دجاج'),opts:[['sand',1.75],['meal',2.75]]},
  {name:n('Nuggets, 4 pcs','ناجتس، 4 قطع'),opts:[['meal',2.75]]},
  {name:n('Strips, 3 pcs','ستربس، 3 قطع'),opts:[['meal',3.25]]},
  {name:n('Double Beef','دبل لحمة'),opts:[['x1',3.50],['x2',5.00]]},
  {name:n('Double Chicken','دبل دجاج'),opts:[['x1',3.50],['x2',5.00]]},
  {name:n('Double Mix','دبل ميكس'),opts:[['',5.00]]}],
 sides: [
  {name:n('Fries','بطاطا'),opts:[['s_R',1.50],['s_M',1.75],['s_L',2.00]]},
  {name:n('Jalapeño cheese balls, 8 pcs','كرات جبنة بالهالبينو، 8 قطع'),opts:[['',1.50]]},
  {name:n('Nuggets, 6 pcs','ناجتس، 6 قطع'),opts:[['',2.25]]},
  {name:n('Strips','ستربس',{en:'Regular or spicy',ar:'عادي أو حار'}),opts:[['2 pcs',1.50],['5 pcs',3.00]]}],
 dessert: [
  {name:n('Caramel Konafa sundae','صنداي كنافة بالكراميل'),opts:[['',1.75]]},
  {name:n('Pistachio Konafa sundae','صنداي كنافة بالفستق'),opts:[['',1.75]]},
  {name:n('Sundae','صنداي',{en:'Strawberry, caramel or chocolate',ar:'فراولة، كراميل أو شوكولاتة'}),opts:[['',1.40]]},
  {name:n('Ice cream cone','بوظة كون'),opts:[['',0.50]]},
  {name:n('Āl Shatwy','آل شتوي'),opts:[['',0.50]]}],
 drinks: [
  {name:n('Āl Soda','آل صودا',{en:'Cola, diet cola, lime, diet lime or orange',ar:'كولا، كولا دايت، ليمون، ليمون دايت أو برتقال'}),opts:[['s_R',1.00],['s_M',1.60],['s_L',2.00]]},
  {name:n('American coffee','قهوة أمريكية'),opts:[['',1.00]]},
  {name:n('Juice','عصير'),opts:[['',1.00]]},
  {name:n('Water','مي'),opts:[['',0.50]]}]
};
const TABS = ['sig','box','little','sides','dessert','drinks'];
const tabKey = {sig:'t_sig',box:'t_box',little:'t_little',sides:'t_sides',dessert:'t_dessert',drinks:'t_drinks'};
const SIZE_ADD = {R:0, M:.6, L:1};

let lang = 'en', tab = 'sig', size = 'R';
try { const s = localStorage.getItem('alb-lang'); if (s === 'ar' || s === 'en') lang = s; } catch (e) {}

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money = v => `${v.toFixed(2)} ${T[lang].cur}`;
const pad = i => String(i + 1).padStart(2, '0');

/* ---------- Rendering ---------- */
// Bowlby One has no "Ā", so display headings draw it as "A" with a CSS macron (.mac).
function setDisplay(el, text) {
  el.innerHTML = esc(text).replace(/Ā/g, '<span class="mac">A</span>');
}
// Signature cards are in the HTML (so they show without JS); only their text changes with the language.
function renderSig() {
  document.querySelectorAll('.sig-card').forEach(card => {
    const s = SIG[+card.dataset.i];
    setDisplay(card.querySelector('h3'), lang === 'ar' ? s.ar : s.en);
    const alt = card.querySelector('.ar-name');
    alt.textContent = lang === 'ar' ? s.en : s.ar;
    alt.lang = lang === 'ar' ? 'en' : 'ar';
    card.querySelector('.desc').textContent = s.d[lang];
    card.querySelector('.price span').textContent = `${T[lang].cur}, ${T[lang].reg}`;
    card.querySelector('img').alt = lang === 'ar' ? s.ar : s.en;
  });
  $('sigDots').setAttribute('aria-label', T[lang].sig_title);
  $('sigDots').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-label', `${T[lang].show}: ${lang === 'ar' ? SIG[i].ar : SIG[i].en}`));
}
function renderTabs() {
  $('tabs').innerHTML = TABS.map(k => `<button class="tab" role="tab" type="button" id="tab-${k}" data-tab="${k}" aria-controls="panel" aria-selected="${k === tab}" tabindex="${k === tab ? 0 : -1}">${esc(T[lang][tabKey[k]])}</button>`).join('');
  $('panel').setAttribute('aria-labelledby', `tab-${tab}`);
  const sz = $('sizes');
  sz.hidden = tab !== 'sig';
  sz.setAttribute('aria-label', T[lang].size_label);
  sz.innerHTML = ['R','M','L'].map(k => `<button class="size" type="button" data-size="${k}" aria-pressed="${k === size}">${esc(T[lang]['s_' + k])}</button>`).join('');
}
function optLabel(l) { if (!l) return ''; if (T[lang][l]) return T[lang][l]; if (lang === 'ar') return l.replace('pcs', 'قطع'); return l; }
function renderPanel(animate) {
  const p = $('panel');
  const rows = MENU[tab].map(r => {
    const nm = r.name[lang], sub = r.name.sub ? r.name.sub[lang] : '';
    const opts = r.sized != null
      ? `<span class="opt">${money(r.sized + SIZE_ADD[size])}</span>`
      : r.opts.map(([l, v]) => `<span class="opt">${l ? `<i>${esc(optLabel(l))}</i>` : ''}${money(v)}</span>`).join('');
    return `<li class="row"><span class="row-name">${esc(nm)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="leader" aria-hidden="true"></span><span class="opts">${opts}</span></li>`;
  }).join('');
  p.innerHTML = (tab === 'box' ? `<p class="panel-note">${esc(T[lang].box_note)}</p>` : '') + `<ul class="rows">${rows}</ul>`;
  if (animate) { p.classList.remove('enter'); void p.offsetWidth; p.classList.add('enter'); }
}
function renderStatic() {
  const root = document.documentElement;
  root.lang = lang; root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => { const v = T[lang][el.dataset.i18n]; if (typeof v === 'string') el.textContent = v; });
  document.querySelectorAll('[data-i18n-alt]').forEach(el => { el.alt = T[lang][el.dataset.i18nAlt]; });
  document.querySelectorAll('[data-i18n-label]').forEach(el => el.setAttribute('aria-label', T[lang][el.dataset.i18nLabel]));
  $('langBtn').lang = lang === 'ar' ? 'en' : 'ar';
  $('services').innerHTML = T[lang].services.map(s => `<li>${esc(s)}</li>`).join('');
}
function renderAll() { renderStatic(); renderSig(); renderTabs(); renderPanel(false); }

function selectTab(k, focus) {
  tab = k; renderTabs(); renderPanel(true);
  if (focus) $(`tab-${k}`).focus();
  refreshScroll();
}
$('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) selectTab(b.dataset.tab, false); });
$('tabs').addEventListener('keydown', e => {
  let i = TABS.indexOf(tab);
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') i += (e.key === 'ArrowRight') !== (lang === 'ar') ? 1 : -1;
  else if (e.key === 'Home') i = 0;
  else if (e.key === 'End') i = TABS.length - 1;
  else return;
  e.preventDefault();
  selectTab(TABS[(i + TABS.length) % TABS.length], true);
});
$('sizes').addEventListener('click', e => { const b = e.target.closest('[data-size]'); if (!b) return; size = b.dataset.size; renderTabs(); renderPanel(true); });
$('langBtn').addEventListener('click', () => {
  lang = lang === 'en' ? 'ar' : 'en';
  try { localStorage.setItem('alb-lang', lang); } catch (e) {}
  renderAll(); refreshScroll();
});

// Dots for the pinned signature scene (hidden by CSS unless the scene is active).
$('sigDots').innerHTML = SIG.map((s, i) => `<button class="sig-dot" type="button" data-i="${i}" aria-current="${i === 0}"></button>`).join('');
renderAll();

/* ---------- Motion ---------- */
let refreshScroll = () => {};
let goToSig = null;
$('sigDots').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b && goToSig) goToSig(+b.dataset.i); });

document.addEventListener('DOMContentLoaded', () => {
  const { gsap, ScrollTrigger, Lenis } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  refreshScroll = () => ScrollTrigger.refresh();
  // gsap.matchMedia undoes everything below if the visitor turns on reduced motion mid-visit.
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    const root = document.documentElement;
    root.classList.add('anim');
    const lenis = Lenis ? new Lenis({ autoRaf: false, anchors: { offset: -64 } }) : null;
    let raf;
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      raf = time => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }
    const undoHero = heroScene();
    sigScene(lenis);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => {
      undoHero();
      goToSig = null;
      if (lenis) { gsap.ticker.remove(raf); lenis.destroy(); }
      root.classList.remove('anim');
    };
  });
});

/* Hero: the burger photo is cut into horizontal bands along the ingredient lines (data-cuts,
   written by scripts/build_images.py). On scroll the bands lift apart and float, the headline
   swaps to "Tastes right.", then the stack drops back together. */
function heroScene() {
  const { gsap } = window;
  const host = $('heroBurger');
  const img = host.querySelector('img');
  const cuts = (host.dataset.cuts || '').split(',').map(Number).filter(c => c > 0 && c < 1);
  const edges = [0, ...cuts, 1];
  const bands = [], inners = [];
  for (let k = 0; k < edges.length - 1; k++) {
    const band = document.createElement('div');
    band.className = 'band';
    band.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('div');
    inner.className = 'band-in';
    const copy = img.cloneNode();
    copy.alt = '';
    copy.removeAttribute('data-i18n-alt');
    copy.removeAttribute('fetchpriority');
    // Overlap neighbouring bands by a hair so no seam shows when the stack is closed.
    copy.style.clipPath = `inset(${Math.max(0, edges[k] * 100 - .15)}% 0 ${Math.max(0, (1 - edges[k + 1]) * 100 - .15)}% 0)`;
    inner.appendChild(copy);
    band.appendChild(inner);
    host.appendChild(band);
    bands.push(band); inners.push(inner);
  }
  // Until the visitor scrolls, the original photo stays on screen (it's the page's LCP image);
  // the identical-looking bands take over only while the stack is split.
  let split = false;
  const setSplit = on => {
    if (on === split) return;
    split = on;
    if (on) intro.progress(1);
    host.classList.toggle('is-split', on);
  };

  const m = bands.length, mid = (m - 1) / 2;
  const mobile = matchMedia('(max-width: 860px)').matches;
  const gap = (mobile ? 30 : 42) / Math.max(m - 1, 1); // total spread, % of the stage height
  const side = k => (k % 2 ? 1 : -1);

  const intro = gsap.timeline({ delay: .1 });
  intro.from(img, { yPercent: -7, scale: .93, rotation: -3, duration: .8, ease: 'back.out(1.7)' }, 0)
       .from('.hashtag', { scale: 0, rotate: -30, duration: .55, ease: 'back.out(2)' }, .5);

  // While split, each band bobs gently; the amount follows how far apart the stack is.
  const float = { s: 0 };
  const setY = inners.map(el => gsap.quickSetter(el, 'y', 'px'));
  const setR = inners.map(el => gsap.quickSetter(el, 'rotation', 'deg'));
  const bob = time => {
    if (float.s < .001) return;
    for (let k = 0; k < m; k++) {
      setY[k](Math.sin(time * 1.7 + k * 1.1) * 7 * float.s);
      setR[k](Math.sin(time * 1.3 + k * .7) * 1.6 * float.s);
    }
  };
  gsap.ticker.add(bob);

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    onUpdate: () => setSplit(tl.progress() > .002 && tl.progress() < .998),
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=140%', scrub: .6, pin: true, anticipatePin: 1, invalidateOnRefresh: true }
  });
  tl.to(bands, { yPercent: k => (k - mid) * gap, xPercent: k => side(k) * (2 + (k % 3)), rotation: k => side(k) * (3 + (k % 3) * 1.5), duration: 1 }, 0)
    .to(float, { s: 1, duration: .6 }, .3)
    .to('.hero-shadow', { scaleX: .72, opacity: .45, duration: 1 }, 0)
    .to(host, { rotation: -5, scale: mobile ? .9 : .94, duration: 1 }, 0)
    .to('.line-made', { yPercent: -110, autoAlpha: 0, duration: .45, ease: 'power2.in' }, .55)
    .fromTo('.line-tastes', { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: .45, ease: 'power2.out' }, .85)
    .to(float, { s: 0, duration: .6 }, 1.1)
    .to(bands, { yPercent: 0, xPercent: 0, rotation: 0, duration: .9, ease: 'power3.inOut' }, 1.15)
    .to('.hero-shadow', { scaleX: 1.05, opacity: 1, duration: .9, ease: 'power3.inOut' }, 1.15)
    .to(host, { rotation: 0, scale: 1.04, duration: .9, ease: 'power3.inOut' }, 1.15);

  return () => {
    gsap.ticker.remove(bob);
    intro.kill();
    bands.forEach(b => b.remove());
    host.classList.remove('is-split');
  };
}

/* Signature meals: the section pins; scrolling crossfades and zooms through the six burger
   photos while the name, description and price swap alongside. */
function sigScene(lenis) {
  const { gsap } = window;
  const photos = gsap.utils.toArray('.sig-photo');
  const texts = gsap.utils.toArray('.sig-text');
  const glow = document.querySelector('.sig-glow');
  const dots = gsap.utils.toArray('.sig-dot');
  const N = photos.length;
  let active = -1;
  const setActive = i => {
    if (i === active) return;
    active = i;
    $('sigNow').textContent = pad(i);
    dots.forEach((d, j) => d.setAttribute('aria-current', String(j === i)));
  };

  gsap.set(photos, { autoAlpha: 0, scale: .78 });
  // Text only fades (no visibility:hidden), so screen readers still read all six meals.
  gsap.set(texts, { opacity: 0, y: 40 });
  gsap.set(photos[0], { autoAlpha: 1, scale: 1 });
  gsap.set(texts[0], { opacity: 1, y: 0 });
  gsap.set(glow, { color: SIG[0].c });
  setActive(0);

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    // The active dot flips at the middle of each crossfade (step i fades in around time i - 0.3).
    onUpdate: () => setActive(Math.min(N - 1, Math.floor(tl.time() + .3))),
    scrollTrigger: {
      trigger: '.sig-pin', start: 'top top', end: () => '+=' + innerHeight * (N - 1) * .85,
      scrub: .5, pin: true, anticipatePin: 1, invalidateOnRefresh: true
    }
  });
  // Each step: the current burger keeps zooming in slowly, then fades out while it keeps
  // growing; the next one zooms up from small and fades in. Text slides up in step.
  for (let i = 0; i < N; i++) {
    const t = i - 1; // step i starts at time i-1 (step 0 is the starting state)
    if (i > 0) {
      tl.to(photos[i - 1], { scale: 1.28, autoAlpha: 0, duration: .45, ease: 'power2.in' }, t + .5)
        .fromTo(photos[i], { scale: .78, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .5, ease: 'power2.out' }, t + .62)
        .to(texts[i - 1], { y: -40, opacity: 0, duration: .3, ease: 'power2.in' }, t + .5)
        .fromTo(texts[i], { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .35, ease: 'power2.out' }, t + .72)
        .to(glow, { color: SIG[i].c, duration: .5 }, t + .55);
    }
    // slow push-in while the burger is on screen
    tl.to(photos[i], { scale: '+=0.06', duration: .38 }, i === 0 ? .12 : t + 1.12);
  }
  tl.to({}, { duration: .2 });

  goToSig = i => {
    const st = tl.scrollTrigger;
    const time = i === 0 ? 0 : i - 1 + 1.12;
    const y = st.start + (st.end - st.start) * (time / tl.duration());
    if (lenis) lenis.scrollTo(y, { duration: 1.1 }); else scrollTo({ top: y, behavior: 'smooth' });
  };
}
})();
