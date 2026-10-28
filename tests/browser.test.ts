import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkProfilePersistence } from '../src/browser.ts';

test('browser cookies persist across separate Chromium launches', { timeout: 60_000 }, async () => {
  const profile = await mkdtemp(join(tmpdir(), 'martie-browser-'));
  try {
    const first = await checkProfilePersistence(profile);
    assert.equal(first.existingCookie, false);
    assert.equal(first.survivedReopen, true);
    const second = await checkProfilePersistence(profile);
    assert.equal(second.existingCookie, true);
    assert.equal(second.survivedReopen, true);
  } finally { await rm(profile, { recursive: true, force: true }); }
});
