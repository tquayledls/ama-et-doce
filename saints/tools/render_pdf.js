// Render a Paged.js print HTML file to PDF.  Usage: node render_pdf.js in.html out.pdf
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [inp, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.addInitScript(() => { window.PagedConfig = { auto: true, after: () => { window.__pagedDone = true; } }; });
  await p.goto('file://' + path.resolve(inp), { waitUntil: 'networkidle', timeout: 120000 });
  await p.waitForFunction(() => window.__pagedDone === true, null, { timeout: 120000 });
  await p.evaluate(() => document.fonts.ready);
  const pages = await p.evaluate(() => document.querySelectorAll('.pagedjs_page').length);
  await p.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
  console.log(`Wrote ${out} (${pages} pages)`);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
