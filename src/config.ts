import { constants } from 'node:fs';
import { access, mkdir, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

export async function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const dataDir = env.MARTIE_DATA_DIR ?? '/data';
  if (!isAbsolute(dataDir)) throw new Error('Data directory must be absolute');
  if (env.RAILWAY_ENVIRONMENT_ID && (!env.RAILWAY_VOLUME_MOUNT_PATH || resolve(env.RAILWAY_VOLUME_MOUNT_PATH) !== resolve(dataDir))) {
    throw new Error('The configured data directory must be the Railway volume mount');
  }
  const directory = await stat(dataDir).catch(() => null);
  if (!directory?.isDirectory()) throw new Error('Persistent data directory is missing');
  await access(dataDir, constants.R_OK | constants.X_OK);
  const mode = env.MARTIE_BROWSER_MODE ?? 'headless';
  if (mode !== 'headless' && mode !== 'login') throw new Error('Invalid browser mode');
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(env.MARTIE_OWNER_PASSWORD_HASH ?? '')) {
    throw new Error('A bcrypt owner password hash is required');
  }
  const port = Number(env.PORT ?? '8080');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid public port');
  const stateDir = join(await realpath(dataDir), 'martie');
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  await access(stateDir, constants.R_OK | constants.W_OK | constants.X_OK);
  return { dataDir, stateDir, profileDir: join(stateDir, 'chromium'), mode, port };
}
