# Setup milestones

The owner has a Railway Pro account, a dedicated WhatsApp number, and this GitHub repository connected to Railway. The first browser-service implementation builds on Railway; Chromium startup is currently blocked by a sandbox permission error. See the [verification record](browser-verification.md) before attempting login.

1. **Prove the hosted browser.** Package Chromium, configure a persistent volume, and provide temporary authenticated login access. Confirm the correct RedMart account, read the complete Standard list, and verify that closing the browser and restarting the service preserve login. Measure idle and peak memory. Do this before enabling cart writes.
2. **Connect WhatsApp and storage.** Pair the dedicated number, persist its session, configure the allowed group and senders, and verify that only actual bot mentions enter the workflow. Persist requests and deduplicate message delivery.
3. **Import and resolve mappings.** Import the seed, bind private household aliases, and resolve outstanding preferences through confirmation. Configure Jev and Haiku credentials through Railway variables; verify model access, output validation, fallback, and learned-meaning persistence.
4. **Enable verified cart updates.** Add serialized browser actions, clarification handling, restart recovery, and result reporting. Demonstrate one tagged request from a phone, verify the resulting cart, then repeat after a service restart without duplicating additions.

Keep account credentials and session material out of Git. The bot must never perform checkout. Add runnable setup commands, environment examples, recovery steps, and deployment files as their corresponding implementation is completed.

## Browser service

One container runs a small health service and Caddy. In `login` mode it also runs Chromium on Xvfb, with x11vnc and noVNC/websockify bound to loopback. Caddy requires the owner's password for the viewer page, assets, and WebSocket; `/healthz` exposes only readiness and mode. Railway supplies HTTPS. Use the HTTPS domain only, and expose port 8080 alone.

In `headless` mode the service opens and closes Chromium twice to check persistent cookies, then releases browser memory. No viewer process runs. This milestone has no request queue or cart-write code. A healthy service does **not** prove that RedMart login is valid.

### Configure Railway

Use one replica in Singapore, a volume mounted at `/data`, serverless sleeping off, and the included Dockerfile and `railway.json`. The entrypoint prepares `/data/martie` and drops to the unprivileged `node` user before starting the services. Chromium's sandbox is enabled. A missing volume or failed browser launch fails readiness.

Generate owner access once on your own computer:

```sh
npm run owner:credentials
```

This writes `.local/owner-access.json` with restrictive permissions and refuses to overwrite an existing file. Keep the password private. Put only `passwordHash` into Railway's `MARTIE_OWNER_PASSWORD_HASH` variable. Do not paste credentials into chat, commit them, or put them in a URL.

| Variable | Value |
| --- | --- |
| `MARTIE_OWNER_PASSWORD_HASH` | Generated bcrypt hash |
| `MARTIE_DATA_DIR` | `/data` |
| `MARTIE_BROWSER_MODE` | `headless` by default; `login` for owner setup/repair |
| `PORT` | `8080` |

Railway supplies `RAILWAY_VOLUME_MOUNT_PATH`; do not fabricate it to bypass the mount check. The volume contains `martie/chromium/` and private probe reports. Never run multiple services or browser commands against that profile simultaneously.

### Login and persistence proof

1. Deploy in headless mode and check that `/healthz` becomes ready. Anonymous viewer and WebSocket requests must return 401.
2. Set `MARTIE_BROWSER_MODE=login` and deploy. Open the Railway HTTPS domain and authenticate as `owner` using the generated password.
3. Complete Lazada/RedMart login yourself in the viewer, including any OTP or challenge. Confirm the account and open the complete Standard list. Stop if the account is wrong or the list cannot be fully read.
4. Set the mode back to `headless` and deploy, allowing a graceful browser shutdown. Confirm that the viewer is disabled, then run `npm run probe:browser` through Railway SSH while no browser task is running.
5. Reopen login mode to confirm that the account and Standard list are still accessible, then repeat after a service restart. Finish in headless mode.

`/data/martie/profile-check.json` records a synthetic cookie check on `martie.invalid`. `existingCookie: true` on a subsequent deployment proves that this profile marker survived; `survivedReopen: true` proves browser close/reopen persistence. Neither proves merchant login. `npm run probe:browser` visits Lazada read-only and records its page title, but deliberately leaves `merchantLoginVerified: false`; account identity and complete Standard/cart reads still need live verification.

If access expires, re-enable login mode and let the owner repair it. Do not delete the profile, bypass an access challenge, or treat an empty list as a successful read. Record hosted evidence and memory measurements before enabling shopping automation.
