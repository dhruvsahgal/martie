import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BrowserContext } from 'playwright';
import { loadConfig } from './config.ts';
import { checkProfilePersistence, LOGIN_URL, openBrowser } from './browser.ts';

const config = await loadConfig();
let browser: BrowserContext | undefined;
let ready = false;
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json');
  if (request.url !== '/healthz' || request.method !== 'GET') {
    response.writeHead(404).end('{"error":"not_found"}');
    return;
  }
  response.writeHead(ready ? 200 : 503).end(JSON.stringify({ ready, mode: config.mode }));
});
server.listen(3000, '127.0.0.1');

let stopping = false;
const abortStartup = new AbortController();
async function shutdown() {
  if (stopping) return;
  stopping = true;
  ready = false;
  abortStartup.abort();
  await startup.catch(() => undefined);
  await browser?.close().catch(() => undefined);
  server.close(() => process.exit(0));
}
process.once('SIGTERM', () => { void shutdown(); });
process.once('SIGINT', () => { void shutdown(); });

async function initialize() {
  console.log(JSON.stringify({ event: 'browser_starting', mode: config.mode }));
  if (config.mode === 'login') {
    browser = await openBrowser(config.profileDir, false);
    if (stopping) return;
    browser.on('close', () => { if (!stopping) process.exit(1); });
    const page = browser.pages()[0] ?? await browser.newPage();
    // A slow merchant or challenge must not prevent access to the repair viewer.
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 10_000 }).catch(() => undefined);
    console.log(JSON.stringify({ event: 'login_viewer_ready', cartAutomation: false }));
  } else {
    const result = await checkProfilePersistence(config.profileDir, abortStartup.signal);
    const report = { checkedAt: new Date().toISOString(), ...result, merchantLoginVerified: false };
    await writeFile(join(config.stateDir, 'profile-check.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ event: 'profile_checked', ...report }));
  }
  ready = !stopping;
}

const startup = initialize();
void startup.catch(async (error: unknown) => {
  if (stopping) return;
  // Startup errors are operational; no page content, credentials or cookies are logged.
  const message = error instanceof Error ? error.message : 'UnknownError';
  console.error(JSON.stringify({
    event: 'browser_startup_failed',
    summary: message.split('\n')[0],
    sandboxFailure: /sandbox|Failed to move to new namespace/i.test(message),
    diagnostic: message.split('\n').filter(line => /\[err\].*(ERROR|FATAL|Permission denied|Operation not permitted)/.test(line)).map(line => line.slice(0, 500)).slice(0, 3),
  }));
  await browser?.close();
  server.close(() => process.exit(1));
});
