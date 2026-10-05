// Render cards/build/*.html to print files: PDF (76 x 136 mm incl. 3 mm bleed) and 300 dpi PNG.
// Usage: serve the repo root on :8799 (python3 -m http.server 8799), then: node cards/render.js
const path = require("path");
const fs = require("fs");
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");

const HERE = __dirname, BUILD = path.join(HERE, "build"), OUT = path.join(HERE, "print");
const MM = 96 / 25.4, W = 76, H = 136, DPI = 300;

(async () => {
  fs.mkdirSync(path.join(OUT, "png"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "pdf"), { recursive: true });
  const cards = fs.readFileSync(path.join(BUILD, "cards.tsv"), "utf8").trim().split("\n").map((l) => l.split("\t"));
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: Math.round(W * MM), height: Math.round(H * MM) }, deviceScaleFactor: DPI / 96 });
  for (const [name] of cards) {
    await page.goto(`http://127.0.0.1:8799/cards/build/${name}.html`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: path.join(OUT, "pdf", `${name}.pdf`), width: `${W}mm`, height: `${H}mm`, printBackground: true, pageRanges: "1" });
    await page.screenshot({ path: path.join(OUT, "png", `${name}.png`) });
    process.stdout.write(".");
  }
  await b.close();
  console.log(`\n${cards.length} cards rendered -> ${OUT}`);
})();
