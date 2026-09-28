// Renders the PWA icons and the social preview image (og.png) from SVG/HTML.
// Needs Playwright with Chromium: `npx playwright install chromium` (once), then `npm run images`.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const icon = await fs.readFile(path.join(root, 'public/icons/icon.svg'), 'utf8');
const ajrak = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='12' viewBox='0 0 28 12'><rect width='28' height='12' fill='#a3212a'/><path d='M14 1.5 18.5 6 14 10.5 9.5 6z' fill='#26306b'/><circle cx='14' cy='6' r='1.6' fill='#fbf6ee'/><circle cx='2' cy='6' r='1.3' fill='#1b1530'/><circle cx='26' cy='6' r='1.3' fill='#1b1530'/><path d='M0 0h28M0 12h28' stroke='#1b1530' stroke-width='1.5'/></svg>",
)}")`;

const iconPage = (size, padding) => `<!doctype html><html><body style="margin:0;background:${padding ? '#a3212a' : 'transparent'}">
  <div style="width:${size}px;height:${size}px;display:grid;place-items:center">
    <div style="width:${size - padding * 2}px;height:${size - padding * 2}px">${icon.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
  </div></body></html>`;

const ogPage = `<!doctype html><html><head><style>
  body { margin:0; width:1200px; height:630px; background:#fbf6ee; font-family: Georgia, 'Liberation Serif', serif; color:#231a2e; position:relative; overflow:hidden }
  .band { position:absolute; left:0; right:0; height:36px; background:${ajrak} repeat-x center / 84px 36px }
  .top { top:0 } .bottom { bottom:0 }
  .wrap { position:absolute; inset:36px 0; display:flex; align-items:center; gap:56px; padding:0 80px }
  .logo { width:210px; height:210px; flex:none }
  .kicker { font: 700 24px/1 system-ui, 'Liberation Sans', sans-serif; letter-spacing:.12em; color:#a3212a; margin:0 0 20px }
  h1 { font-size:64px; line-height:1.02; margin:0 0 22px; letter-spacing:-.01em }
  h1 span { color:#a3212a }
  p { font: 28px/1.4 system-ui, 'Liberation Sans', sans-serif; color:#5f5569; margin:0; max-width:760px }
</style></head><body>
  <div class="band top"></div><div class="band bottom"></div>
  <div class="wrap">
    <div class="logo">${icon.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    <div>
      <p class="kicker">FOR SINDHI FAMILIES · FREE FOREVER</p>
      <h1>Keep Dadi’s voice.<br><span>Teach the kids Sindhi in it.</span></h1>
      <p>Stories of Sindh, the 1947 journey, lullabies, recipes and 50 Sindhi words — in your grandparent’s own voice.</p>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch();
async function shot(html, width, height, file, transparent = false) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html);
  await page.screenshot({ path: path.join(root, 'public', file), omitBackground: transparent });
  await page.close();
  console.log('wrote', file);
}

await shot(iconPage(192, 0), 192, 192, 'icons/icon-192.png', true);
await shot(iconPage(512, 0), 512, 512, 'icons/icon-512.png', true);
await shot(iconPage(512, 64), 512, 512, 'icons/icon-maskable-512.png');
await shot(iconPage(180, 14), 180, 180, 'icons/apple-touch-icon.png');
await shot(ogPage, 1200, 630, 'og.png');
await browser.close();
