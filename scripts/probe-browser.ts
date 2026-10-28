import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../src/config.ts';
import { openBrowser } from '../src/browser.ts';

const config = await loadConfig();
if (config.mode !== 'headless') throw new Error('Close the login viewer by switching to headless mode before probing');
const browser = await openBrowser(config.profileDir, true);
try {
  const page = browser.pages()[0] ?? await browser.newPage();
  await page.goto('https://www.lazada.sg/', { waitUntil: 'domcontentloaded', timeout: 45_000 });
  const report = {
    checkedAt: new Date().toISOString(),
    origin: new URL(page.url()).origin,
    title: await page.title(),
    merchantLoginVerified: false,
    note: 'Page reached. Owner account and complete Standard/cart reads still require verification.',
  };
  await writeFile(join(config.stateDir, 'merchant-probe.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
