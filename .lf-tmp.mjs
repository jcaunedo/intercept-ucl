import { chromium } from "playwright";
const sp = process.argv[2];
const b = await chromium.launch();
for (const id of ["layouts-intercept-live-census--default", "layouts-intercept-live-monitoring--default"]) {
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.on("console", (m) => { if (["error", "warning"].includes(m.type())) errs.push(m.type() + ": " + m.text().slice(0, 300)); });
  await p.goto(`http://localhost:6006/iframe.html?id=${id}&viewMode=story`);
  await p.waitForTimeout(1500);
  const btn = p.locator("button[aria-controls='live-feed']");
  const n = await btn.count();
  const text0 = n ? (await btn.first().innerText()).replace(/\s+/g, " ") : null;
  await p.waitForTimeout(6000);
  const text1 = n ? (await btn.first().innerText()).replace(/\s+/g, " ") : null;
  let opened = null, box = null;
  if (n) {
    await btn.first().click();
    await p.waitForTimeout(1200);
    opened = await p.locator("#live-feed").count();
    box = opened ? await p.locator("#live-feed").boundingBox() : null;
  }
  await p.screenshot({ path: `${sp}/lf-${id.split("--")[0].split("-").pop()}.png` });
  console.log(JSON.stringify({ id, buttons: n, text0, text1, expanded: n ? await btn.first().getAttribute("aria-expanded") : null, opened, box, errs: errs.slice(0, 8) }, null, 1));
  await p.close();
}
await b.close();
