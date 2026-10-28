import { chromium } from 'playwright';

export const LOGIN_URL = 'https://www.lazada.sg/';

export function openBrowser(profileDir: string, headless: boolean) {
  return chromium.launchPersistentContext(profileDir, {
    headless,
    channel: 'chromium',
    chromiumSandbox: true,
    locale: 'en-SG',
    timezoneId: 'Asia/Singapore',
    viewport: { width: 1280, height: 800 },
    acceptDownloads: false,
    timeout: 15_000,
  });
}

// This cookie proves profile persistence only. It says nothing about a merchant login.
export async function checkProfilePersistence(profileDir: string, signal?: AbortSignal) {
  const name = 'martie_profile_check';
  const url = 'https://martie.invalid';
  const first = await openBrowser(profileDir, true);
  let existingCookie: boolean;
  try {
    signal?.throwIfAborted();
    existingCookie = (await first.cookies(url)).some(cookie => cookie.name === name && cookie.value === 'v1');
    await first.addCookies([{ name, value: 'v1', url, expires: Math.floor(Date.now() / 1000) + 365 * 86400 }]);
  } finally { await first.close(); }
  signal?.throwIfAborted();
  const reopened = await openBrowser(profileDir, true);
  try {
    signal?.throwIfAborted();
    const survivedReopen = (await reopened.cookies(url)).some(cookie => cookie.name === name && cookie.value === 'v1');
    if (!survivedReopen) throw new Error('Browser profile did not persist across reopen');
    return { existingCookie, survivedReopen };
  } finally { await reopened.close(); }
}
