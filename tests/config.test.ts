import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.ts';

const auth = { MARTIE_OWNER_PASSWORD_HASH: '$2b$12$' + 'a'.repeat(53) };

test('requires the Railway volume instead of creating ephemeral profile storage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'martie-config-'));
  try {
    await assert.rejects(loadConfig({ ...auth, RAILWAY_ENVIRONMENT_ID: 'production', MARTIE_DATA_DIR: root }), /volume/i);
    await assert.rejects(loadConfig({ ...auth, RAILWAY_ENVIRONMENT_ID: 'production', MARTIE_DATA_DIR: root, RAILWAY_VOLUME_MOUNT_PATH: '/different' }), /volume/i);
    const config = await loadConfig({ ...auth, RAILWAY_ENVIRONMENT_ID: 'production', MARTIE_DATA_DIR: root, RAILWAY_VOLUME_MOUNT_PATH: root });
    assert.equal(config.profileDir, join(await realpath(root), 'martie', 'chromium'));
    assert.equal(config.mode, 'headless');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('refuses missing storage and invalid viewer configuration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'martie-config-'));
  try {
    await assert.rejects(loadConfig({ ...auth, MARTIE_DATA_DIR: join(root, 'missing') }), /directory/i);
    await assert.rejects(loadConfig({ MARTIE_DATA_DIR: root }), /password hash/i);
    await assert.rejects(loadConfig({ ...auth, MARTIE_DATA_DIR: root, MARTIE_BROWSER_MODE: 'typo' }), /mode/i);
    await assert.rejects(loadConfig({ ...auth, MARTIE_DATA_DIR: root, PORT: 'not-a-port' }), /port/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});
