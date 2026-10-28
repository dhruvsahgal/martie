import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { hash } from 'bcryptjs';

await mkdir('.local', { recursive: true, mode: 0o700 });
const password = randomBytes(24).toString('base64url');
const passwordHash = await hash(password, 12);
// Do not print the password or hash into terminal histories and build logs.
await writeFile('.local/owner-access.json', JSON.stringify({ username: 'owner', password, passwordHash }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log('Created .local/owner-access.json (private; ignored by Git).');
