import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer, request, type Server } from 'node:http';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { hashSync } from 'bcryptjs';

async function listen(server: Server, port: number) {
  server.listen(port, '127.0.0.1');
  await once(server, 'listening');
}

async function availablePort() {
  const server = createServer();
  await listen(server, 0);
  const address = server.address();
  assert(address && typeof address !== 'string');
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

function upgradeStatus(url: string, headers: Record<string, string> = {}) {
  return new Promise<number | undefined>((resolve, reject) => {
    const req = request(url, { headers: { Connection: 'Upgrade', Upgrade: 'websocket', ...headers } });
    req.on('response', (response) => { response.resume(); resolve(response.statusCode); });
    req.on('upgrade', (response, socket) => { socket.destroy(); resolve(response.statusCode); });
    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy(new Error('Upgrade timed out')));
    req.end();
  });
}

test('the real gateway protects viewer HTTP and WebSocket access in both modes', { timeout: 120_000 }, async () => {
  const password = 'integration-test-password';
  const authorization = `Basic ${Buffer.from(`owner:${password}`).toString('base64')}`;
  const health = createServer((_req, res) => res.end('{"ready":true}'));
  let viewerRequests = 0;
  const viewer = createServer((_req, res) => { viewerRequests++; res.end('viewer'); });
  viewer.on('upgrade', (_req, socket) => {
    viewerRequests++;
    socket.end('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
  });
  await listen(health, 3000);
  await listen(viewer, 6080);
  try {
    for (const [deployment, mode] of [['railway', 'login'], ['railway', 'headless'], ['vm', 'login'], ['vm', 'headless']] as const) {
      const port = await availablePort();
      const base = `http://127.0.0.1:${port}`;
      const origin = deployment === 'vm' ? `http://localhost:${port}` : `https://127.0.0.1:${port}`;
      const gateway = spawn(process.env.CADDY_BIN ?? 'caddy', ['run', '--config', 'deploy/Caddyfile', '--adapter', 'caddyfile'], {
        env: { ...process.env, PORT: String(port), MARTIE_BROWSER_MODE: mode, MARTIE_OWNER_PASSWORD_HASH: hashSync(password, 4), MARTIE_VIEWER_ORIGIN: deployment === 'vm' ? origin : '' },
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let log = '';
      gateway.stderr.on('data', (data) => { log += String(data); });
      const exited = once(gateway, 'exit');
      try {
        let started = false;
        for (let attempt = 0; attempt < 300; attempt++) {
          if (gateway.exitCode !== null) throw new Error(`Gateway exited: ${log}`);
          started = await fetch(`${base}/healthz`).then((res) => res.status === 200).catch(() => false);
          if (started) break;
          await delay(100);
        }
        assert(started, `Gateway did not start: ${log}`);
        const before = viewerRequests;
        for (const path of ['/', '/vnc.html', '/websockify']) {
          const response = await fetch(base + path, { redirect: 'manual' });
          assert.equal(response.status, 401);
          assert.match(response.headers.get('www-authenticate') ?? '', /^Basic/);
        }
        assert.equal(await upgradeStatus(`${base}/websockify`), 401);
        assert.equal((await fetch(`${base}/vnc.html`, { headers: { authorization: 'Basic b3duZXI6d3Jvbmc=' } })).status, 401);
        assert.equal(await upgradeStatus(`${base}/websockify`, { authorization, Origin: 'https://untrusted.invalid' }), 403);
        assert.equal(await upgradeStatus(`${base}/websockify`, { authorization, Origin: origin.replace(/:\d+$/, ':1') }), 403);
        assert.equal(viewerRequests, before, 'rejected requests never reach the viewer');
        const response = await fetch(`${base}/vnc.html`, { headers: { authorization } });
        assert.equal(response.status, mode === 'login' ? 200 : 423);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(await upgradeStatus(`${base}/websockify`, { authorization, Origin: origin }), mode === 'login' ? 101 : 423);
      } finally {
        gateway.kill('SIGTERM');
        await exited;
      }
    }
  } finally {
    await Promise.all([health, viewer].map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  }
});
