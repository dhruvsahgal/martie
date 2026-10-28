import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkProfilePersistence } from '../src/browser.ts';

for (const event of ['browser_starting', 'profile_checked']) {
  test(`service closes its profile when stopped at ${event}`, { timeout: 40_000 }, async () => {
    const root = await mkdtemp(join(tmpdir(), 'martie-shutdown-'));
    const child = spawn(process.execPath, ['src/main.ts'], {
      env: { ...process.env, MARTIE_DATA_DIR: root, MARTIE_BROWSER_MODE: 'headless', MARTIE_OWNER_PASSWORD_HASH: '$2b$12$' + 'a'.repeat(53), RAILWAY_ENVIRONMENT_ID: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const exited = once(child, 'exit');
    let output = '';
    child.stderr.on('data', (data) => { output += String(data); });
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Startup event missing: ${output}`)), 20_000);
        child.once('error', reject);
        child.stdout.on('data', (data) => {
          output += String(data);
          if (output.includes(`"event":"${event}"`)) { clearTimeout(timer); resolve(); }
        });
      });
      child.kill('SIGTERM');
      const [code, signal] = await exited;
      assert.equal(signal, null);
      assert.equal(code, 0, output);
      const reopened = await checkProfilePersistence(join(root, 'martie', 'chromium'));
      assert.equal(reopened.survivedReopen, true);
      if (event === 'profile_checked') assert.equal(reopened.existingCookie, true);
    } finally {
      if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited; }
      await rm(root, { recursive: true, force: true });
    }
  });
}
