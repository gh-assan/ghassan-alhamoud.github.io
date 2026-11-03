// Renders a clip page frame by frame. Each page exposes window.DUR and window.seek(seconds).
// Usage: PLAYWRIGHT_CORE=<path to playwright-core> node scripts/clips/render-clip.mjs <page.html> <frames-dir> [fps]
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
const {chromium} = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
const [page, out, fps = '15'] = process.argv.slice(2);
mkdirSync(out, {recursive: true});
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME});
const tab = await browser.newPage({viewport: {width: 1280, height: 720}});
await tab.goto(pathToFileURL(resolve(page)).href);
await tab.evaluate(() => document.fonts.ready);
const dur = await tab.evaluate(() => window.DUR);
const total = Math.round(dur * Number(fps));
for (let i = 0; i < total; i++) {
  await tab.evaluate((t) => window.seek(t), i / Number(fps));
  await tab.screenshot({path: `${out}/${String(i).padStart(5, '0')}.png`});
}
await browser.close();
console.log(`${total} frames`);
