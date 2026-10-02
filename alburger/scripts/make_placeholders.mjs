#!/usr/bin/env node
// Renders the original SVG burger illustrations to transparent PNGs in images/_placeholder/.
// build_images.py uses them only for burgers that have no real photo in images/ yet,
// so the site works end to end before the photo shoot.
//
// Usage: node scripts/make_placeholders.mjs   (needs playwright-core and a Chromium;
//        set CHROMIUM_PATH if it isn't at /opt/pw-browsers/chromium)
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "images", "_placeholder");
const SIZE = 1600;

/* ---------- Burger illustration engine (from the original one-page site) ---------- */
const C={bunHi:'#F3B65C',bun:'#D98A33',bunLo:'#A95F1E',seed:'#F8EBCB',patty:'#5B2E1A',char:'#38190C',cheese:'#F2B01E',lettuce:'#6DAA3A',lettuceLo:'#3F7A22',tomato:'#D7432C',crispy:'#EFC060',crispyLo:'#A8621A',mayo:'#F7F0DC',ketchup:'#C8321E',bbq:'#5E2414',mustard:'#E8B623',jal:'#83B544',jalLo:'#3E7322',onion:'#E9D6EE'};
function seeds(long){
  const pts=long?[[70,40,-15],[110,28,10],[150,22,-5],[195,20,15],[240,22,-10],[285,28,20],[325,40,-20],[130,48,5],[215,46,-15],[300,52,10]]
               :[[135,42,-20],[178,26,10],[224,30,-10],[266,46,25],[108,70,15],[160,58,-5],[208,54,20],[252,72,-15],[300,74,10],[92,92,-25],[146,90,5],[196,84,-12],[316,96,18]];
  return pts.map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="6.5" ry="3.2" transform="rotate(${r} ${x} ${y})" fill="${C.seed}"/>`).join('');
}
function wave(x0,x1,step,ampTop,ampBot,yMid){
  let d=`M${x0} ${yMid}`; let up=true;
  for(let x=x0;x<x1;x+=step){d+=` Q${x+step/2} ${up?ampTop:ampBot} ${Math.min(x+step,x1)} ${yMid}`;up=!up;}
  return d;
}
function scallop(x0,x1,step,top,bot,mid){
  let d=`M${x0} ${mid}`;
  for(let x=x0;x<x1;x+=step) d+=` Q${x+step/2} ${top} ${Math.min(x+step,x1)} ${mid}`;
  d+=` Q${x1+8} ${(mid+bot)/2} ${x1} ${bot-mid+top+(mid-top)}`;
  for(let x=x1;x>x0;x-=step) d+=` Q${x-step/2} ${bot+6} ${Math.max(x-step,x0)} ${bot-2}`;
  d+=` Q${x0-8} ${(mid+bot)/2} ${x0} ${mid}Z`;
  return d;
}
const L={
  topBun:()=>({h:112,s:`<path d="M42 100 Q40 8 200 4 Q360 8 358 100 Q358 112 344 112 L56 112 Q42 112 42 100Z" fill="url(#b)"/><path d="M98 40 Q150 16 214 16" stroke="${C.bunHi}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".6"/>${seeds(false)}`}),
  topRoll:()=>({h:72,s:`<path d="M22 62 Q28 6 200 4 Q372 6 378 62 Q380 72 368 72 L32 72 Q20 72 22 62Z" fill="url(#b)"/><path d="M80 26 Q200 6 320 26" stroke="${C.bunHi}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".6"/>${seeds(true)}`}),
  bottomBun:()=>({h:52,s:`<path d="M44 0 H356 Q360 36 330 46 Q200 56 70 46 Q40 36 44 0Z" fill="url(#c)"/>`}),
  bottomRoll:()=>({h:44,s:`<path d="M22 0 H378 Q382 30 350 38 Q200 48 50 38 Q18 30 22 0Z" fill="url(#c)"/>`}),
  patty:()=>({h:44,s:`<rect x="34" y="2" width="332" height="40" rx="20" fill="${C.patty}"/><path d="M62 15 Q122 8 182 15 T302 15 T350 16" stroke="${C.char}" stroke-width="5" fill="none" opacity=".75"/><path d="M52 30 Q112 23 172 30 T292 30 T352 28" stroke="${C.char}" stroke-width="4" fill="none" opacity=".55"/><path d="M70 8 Q200 2 330 8" stroke="#8A4A2C" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>`}),
  crispy:()=>({h:46,s:`<path d="${scallop(36,364,22,0,44,10)}" fill="${C.crispy}" stroke="${C.crispyLo}" stroke-width="3" stroke-linejoin="round"/><g fill="${C.crispyLo}" opacity=".7"><circle cx="80" cy="22" r="4"/><circle cx="130" cy="30" r="3"/><circle cx="180" cy="18" r="4"/><circle cx="235" cy="28" r="3.5"/><circle cx="290" cy="20" r="4"/><circle cx="330" cy="30" r="3"/><circle cx="105" cy="16" r="2.5"/><circle cx="260" cy="34" r="2.5"/></g>`}),
  crispyLong:()=>({h:36,s:`<path d="${scallop(16,384,24,0,34,8)}" fill="${C.crispy}" stroke="${C.crispyLo}" stroke-width="3" stroke-linejoin="round"/><g fill="${C.crispyLo}" opacity=".7"><circle cx="60" cy="18" r="3.5"/><circle cx="120" cy="22" r="3"/><circle cx="185" cy="15" r="3.5"/><circle cx="250" cy="22" r="3"/><circle cx="315" cy="16" r="3.5"/><circle cx="360" cy="22" r="2.5"/></g>`}),
  cheese:()=>({h:22,s:`<path d="M30 0 H370 L362 9 L352 9 L346 22 L338 9 L252 9 L244 19 L236 9 L124 9 L114 22 L104 9 L40 9Z" fill="${C.cheese}"/>`}),
  lettuce:()=>({h:24,s:`<path d="${wave(28,372,20,0,22,10)} L372 18 L28 18Z" fill="${C.lettuce}" stroke="${C.lettuceLo}" stroke-width="2" stroke-linejoin="round"/>`}),
  tomato:()=>({h:14,s:`<rect x="66" y="0" width="128" height="14" rx="7" fill="${C.tomato}"/><rect x="206" y="0" width="128" height="14" rx="7" fill="${C.tomato}"/><g fill="#F4A08F" opacity=".8"><circle cx="100" cy="7" r="2"/><circle cx="160" cy="7" r="2"/><circle cx="240" cy="7" r="2"/><circle cx="300" cy="7" r="2"/></g>`}),
  jal:()=>({h:18,s:[86,148,210,272,322].map(x=>`<circle cx="${x}" cy="9" r="9" fill="${C.jal}" stroke="${C.jalLo}" stroke-width="2.5"/><circle cx="${x}" cy="9" r="3" fill="#E9F0C8"/>`).join('')}),
  onion:()=>({h:12,s:[92,150,206,262,314].map(x=>`<ellipse cx="${x}" cy="6" rx="26" ry="5" fill="none" stroke="${C.onion}" stroke-width="4"/>`).join('')}),
  sauce:(c)=>({h:12,s:`<path d="M48 2 Q200 -3 352 2 L352 6 Q342 6 338 13 Q333 6 300 6 L204 6 Q198 6 194 15 Q189 6 150 6 L64 6 Q54 6 52 12 Q49 6 48 2Z" fill="${c}"/>`})
};
const RECIPES={
  hero:[['bottomBun'],['patty'],['cheese'],['patty'],['cheese'],['tomato'],['lettuce'],['topBun']],
  beefy:[['bottomBun'],['patty'],['cheese'],['tomato'],['lettuce'],['topBun']],
  crunchy:[['bottomBun'],['crispy'],['sauce',C.mayo],['lettuce'],['topBun']],
  hotbeef:[['bottomBun'],['patty'],['cheese'],['jal'],['sauce',C.ketchup],['topBun']],
  dijon:[['bottomBun'],['crispy'],['sauce',C.mustard],['lettuce'],['topBun']],
  smokey:[['bottomBun'],['patty'],['sauce',C.bbq],['onion'],['cheese'],['topBun']],
  looong:[['bottomRoll'],['crispyLong'],['lettuce'],['sauce',C.mayo],['topRoll']]
};
const OV=5;
// Returns the SVG plus each layer's [top, bottom] in viewBox units (bottom layer first).
function burgerSVG(name){
  const parts=RECIPES[name].map(([k,a])=>L[k](a));
  const H=parts.reduce((s,p)=>s+p.h,0)-OV*(parts.length-1);
  let cur=200+H/2, out='';
  const spans=[];
  parts.forEach(p=>{const y=cur-p.h;spans.push([y,y+p.h]);out+=`<g transform="translate(0 ${y.toFixed(1)})">${p.s}</g>`;cur=y+OV;});
  const svg=`<svg viewBox="0 0 400 400" width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bunHi}"/><stop offset=".55" stop-color="${C.bun}"/><stop offset="1" stop-color="${C.bunLo}"/></linearGradient>
  <linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bun}"/><stop offset="1" stop-color="${C.bunLo}"/></linearGradient></defs>${out}</svg>`;
  // Drawn extents: buns/rolls start 4 units below their box top and end 1 unit above their box bottom.
  return {svg,spans,top:spans[spans.length-1][0]+4,bottom:spans[0][1]-1};
}

mkdirSync(OUT, { recursive: true });
const executablePath = process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined)
  || readdirSync("/opt/pw-browsers").filter(d => d.startsWith("chromium")).map(d => join("/opt/pw-browsers", d, "chrome-linux", "chrome")).find(existsSync);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
for (const name of Object.keys(RECIPES)) {
  const { svg, spans, top, bottom } = burgerSVG(name);
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: join(OUT, `${name}.png`), omitBackground: true });
  if (name === "hero") {
    // Cut lines between ingredients (at the upper layer's bottom edge, since upper layers are drawn on top), as fractions of the burger's height from the top
    // (the same format as images/hero.cuts.json for a real photo).
    const cuts = spans.slice(0, -1).map(([t]) => +(((t + OV) - top) / (bottom - top)).toFixed(4)).reverse();
    writeFileSync(join(OUT, "hero.cuts.json"), JSON.stringify(cuts) + "\n");
  }
  console.log("rendered", name);
}
await browser.close();
