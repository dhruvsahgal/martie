# Chromium sandbox profile

`seccomp_profile.json` is an unmodified copy from [Playwright v1.64.1](https://github.com/microsoft/playwright/blob/v1.64.1/utils/docker/seccomp_profile.json), distributed under Apache-2.0. See the adjacent `LICENSE.playwright`.

Playwright describes it as Docker's default seccomp profile with the user-namespace permissions Chromium needs. Compose applies it at the container runtime; copying it into an image alone does not enable it. See [Playwright's Docker guidance](https://playwright.dev/docs/docker).

Keep this file pinned with the Playwright dependency and verify browser startup after an upgrade. Do not replace it with an unconfined profile or disable Chromium's sandbox to make a failed deployment pass.
