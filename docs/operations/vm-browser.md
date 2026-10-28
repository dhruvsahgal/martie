# Browser VM setup

The chosen direction is Railway for Martie's WhatsApp, matching, and workflow service, plus a separate VM for the persistent RedMart browser. This package prepares the browser milestone. The VM is not provisioned yet and the Railway-to-browser job connection is not implemented.

## Host and cost

Start with a Singapore x86-64 VM, Debian 12, 1 vCPU, 2 GB RAM, and at least 25 GB disk. The 2 GB target is a starting estimate for one browser and its temporary login viewer; measure it with the real site before accepting it.

Prices checked on 2026-10-28, before tax and optional services:

| Provider | Plan | Monthly base price | Evidence |
| --- | --- | --- | --- |
| Vultr | `vc2-1c-2gb`, Singapore (`sgp`), 55 GB SSD | US$10 | [Public plans API](https://api.vultr.com/v2/plans) lists the price and region |
| DigitalOcean | Basic Regular, 1 vCPU / 2 GiB / 50 GiB, Singapore | US$12 | [Pricing](https://www.digitalocean.com/pricing/droplets), [availability](https://docs.digitalocean.com/products/droplets/details/availability/) |

Select the provider and authorize its recurring charge before creating the VM. Do not add paid backups or other extras without approval. Plan listings are not a guarantee of capacity at purchase time.

## Provision and install

1. Create the selected VM with an SSH key. Verify its SSH host fingerprint through the provider console before connecting. Restrict inbound SSH to the owner's address in the provider firewall. No browser or debugging port needs an inbound rule.
2. Install Docker Engine and Compose from [Docker's Debian repository](https://docs.docker.com/engine/install/debian/). Use Engine 28 or newer and Compose 2.30 or newer. Keep normal host security and automatic security updates enabled.
3. Clone this repository on the VM and check out the reviewed browser implementation commit. Run deployment commands from the repository root. Use one copy of the browser service only.
4. Create `.local/vm.env` with permissions `0600` inside a `0700` `.local` directory. Set exactly `MARTIE_OWNER_PASSWORD_HASH=<existing generated bcrypt hash>` with no surrounding quotes. Transfer the hash privately from `.local/owner-access.json`; the owner password stays on the owner's computer. Compose's `raw` env-file format preserves bcrypt's dollar signs.

The named volume `martie-browser-profile` is created on the VM disk and mounted at `/data`. The entrypoint prepares the private state directory and drops to the `node` user. The Playwright seccomp profile permits Chromium's namespace sandbox while retaining a syscall filter. No privileged mode, additional capabilities, unconfined profile, or sandbox-disable flag is used.

## Start and prove storage

```sh
docker compose -f deploy/vm/compose.yaml config --quiet
docker compose -f deploy/vm/compose.yaml up -d --build --wait
docker compose -f deploy/vm/compose.yaml logs --tail=50 browser
docker compose -f deploy/vm/compose.yaml exec --user node browser cat /data/martie/profile-check.json
docker compose -f deploy/vm/compose.yaml restart browser
```

Wait for health again and read the profile report. Require `existingCookie: true` and `survivedReopen: true` after restart. Confirm the Chromium command line has no sandbox-disable flag and verify `chrome://sandbox` reports the namespace and seccomp sandbox enabled in login mode. Stop if either fails; do not loosen host isolation to proceed.

The synthetic cookie proves profile storage only. It does not prove account login.

## Owner login

On the VM:

```sh
MARTIE_BROWSER_MODE=login docker compose -f deploy/vm/compose.yaml up -d --wait
```

On the owner's computer, replacing `VM_SSH_HOST` with the verified SSH destination:

```sh
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:8080:127.0.0.1:8080 VM_SSH_HOST
```

Open `http://localhost:8080` and authenticate as `owner` with the generated password. Use that exact address because the viewer checks its origin. The HTTP hops are local; SSH encrypts the connection to the VM. The viewer still requires its password. Docker publishes port 8080 only on the VM's loopback interface. Confirm it is unreachable from outside the VM before entering credentials.

Complete the merchant login yourself, including OTP or challenges. Verify the account, complete Standard list, and existing cart without changing it. Return to headless mode:

```sh
MARTIE_BROWSER_MODE=headless docker compose -f deploy/vm/compose.yaml up -d --wait
docker compose -f deploy/vm/compose.yaml exec --user node browser npm run probe:browser
```

Reopen login mode and confirm the same account and Standard list remain accessible. Repeat after a service restart and a VM reboot, then finish in headless mode. Measure idle and login-mode memory with `docker stats --no-stream`. Check anonymous HTTP and WebSocket requests return 401, authenticated cross-origin WebSocket requests return 403, and authenticated viewer access returns 423 in headless mode.

Closing the SSH tunnel or the owner's laptop does not stop the VM. The tunnel is for owner setup/repair; it is not the planned Railway job connection. Phone-only login repair access is not configured by this package.

## Railway connection and recovery

Keep Railway as the intended application host. The current branch still contains only the browser foundation, so do not redeploy it as a working Railway application or claim the two hosts are connected. Build the Railway worker connection when implementing the shopping workflow: authenticate the service, serialize jobs on the VM, and expose only validated Standard/cart operations. Keep the browser's debugging interface private and owner login separate from machine access.

Preserve the named volume across image rebuilds. `docker compose stop` stops the service without erasing it. Never use `down --volumes`, delete the VM, or prune its volume as a login-repair step. Re-enable login mode for the owner when the merchant session expires. Restarts can preserve a session, but the merchant can still revoke it.

Record the host, deployed commit, sandbox results, persistence results, and resource measurements in [browser-verification.md](browser-verification.md). Do not enable cart writes until that evidence exists.
