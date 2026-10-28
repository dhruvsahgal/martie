# Browser hosting verification

Date: 2026-10-28. Scope: the browser portion of the first setup milestone, before account login or cart changes.

## Verified

- The existing `martie` Railway service is in Singapore, with one replica, serverless sleeping off, and a persistent volume mounted at `/data`.
- The Node 24 / Playwright 1.64.1 / Chromium container builds successfully on Railway, including the TypeScript build and runtime dependency installation.
- The unprivileged application starts and the gateway runs, but Chromium fails before readiness.
- Local real-Chromium tests preserve a synthetic cookie across separate launches.
- Local real-Caddy tests reject anonymous and incorrect-password HTTP and WebSocket access, reject an authenticated cross-origin WebSocket, and disable the viewer in headless mode.
- Local subprocess tests stop the service during startup and after its profile check, then reopen the profile successfully.
- TypeScript checking and shell syntax checks pass. No lint tool is configured.

## Hosted blocker

With `chromiumSandbox: true`, Chromium fails in the Railway runtime with:

```text
FATAL:sandbox/linux/services/credentials.cc:131
Check failed: . : Permission denied (13)
```

This establishes that the deployed configuration cannot start sandboxed Chromium. It does not identify the precise Railway kernel/runtime restriction or prove that every Railway product is unsuitable.

The sandbox remains enabled. No public viewer domain was created, no account credentials were entered, and no cart was touched. The service cannot pass its health check in this state. The failed deployment is not a usable browser endpoint.

Next decision: obtain a supported sandbox configuration or use a browser host where it can be verified; alternatively, explicitly accept running Chromium without its own sandbox inside Railway's container isolation. Container isolation is not equivalent to Chromium's per-process sandbox. Do not silently add `--no-sandbox` or privileged-container settings as a deployment fix.

## Still unverified

- Protected viewer access over the deployed Railway HTTPS endpoint.
- Correct RedMart account login and complete Standard-list/cart reads.
- Merchant login persistence after browser close, mode changes, and service restarts.
- Hosted idle/peak memory and actual monthly usage.

The synthetic profile marker is a storage check, not merchant-login evidence. There are no cart mutation functions in this milestone.

## References

- [Railway Playwright guide](https://docs.railway.com/guides/playwright)
- [Playwright container sandbox guidance](https://playwright.dev/docs/docker)
