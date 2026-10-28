# Martie architecture

This is the repository's concise behavior contract and component outline. The browser hosting foundation is implemented; the shopping workflow below remains planned.

## Request flow

1. A message arrives through the dedicated WhatsApp number.
2. Check the allowed group and sender, then require an actual WhatsApp `@` mention of the bot. Ordinary chat, a typed bot name, or a mention only inside quoted text causes no action, model call, or message-body storage.
3. Parse the requested items and quantities. Resolve confirmed household aliases and saved language meanings before making a model call.
4. Read the complete live RedMart Standard list. Use Jev for remaining matching decisions and Haiku as the fallback for uncertainty, invalid output, or provider failure.
5. Validate the meaning and all relevant product candidates. Application code chooses the cheapest currently available compatible listed pack. Unknown household preferences need explicit confirmation; an item absent from Standard is skipped.
6. A single browser worker checks the existing cart, asks about unresolved quantities or existing-item handling, and verifies each authorized cart change. Preserve unrelated cart items and avoid repeating additions after duplicate messages or a restart.
7. Report added, skipped, and pending items in WhatsApp. The owner vets the cart and performs checkout manually.

No model receives browser control or checkout tools. The browser worker acts on validated application decisions, using current account, list, stock, price, and cart observations.

## Components

| Component | Responsibility | Planned location |
| --- | --- | --- |
| WhatsApp adapter and message gate | Baileys connection, actual mentions, sender/group checks, clarification replies | `src/` |
| Interpretation and semantic memory | Alias lookup, Jev/Haiku adapters, validated learning and corrections | `src/` |
| Product matching | Complete candidate coverage, compatibility constraints, deterministic price comparison | `src/` |
| RedMart browser worker | Persistent Playwright Chromium profile, Standard reads, serialized cart actions and verification | `src/` |
| Workflow and storage | Durable requests, per-item progress, deduplication, mapping revisions and mutation recovery | `src/`, `migrations/` |
| Deployment and operations | Container setup, persistent volume, protected login/repair access | `deploy/`, `docs/operations/` |

Keep one TypeScript service with SQLite and an on-demand Chromium browser. The WhatsApp listener stays connected while the browser is idle. Railway is the intended host; hosted login, session persistence, WhatsApp pairing, and resource use still need live verification.

## Mapping and learning

- The committed JSON is a seed. Runtime mappings and revision history live in the persistent database. Seed import must preserve later confirmations and corrections.
- Confirmed household preferences take precedence over model-learned language. Baby-specific and adult variants remain distinct unless explicitly confirmed equivalent.
- A validated Haiku resolution can save a reusable phrase-to-meaning mapping. A private nickname such as “Mom's shampoo” still requires an explicit household confirmation before binding it to a product.
- Learn meanings and constraints, never a request's quantity, today's cheapest SKU, price, stock state, or temporary absence from Standard.
- Accept confirmations and corrections only from eligible tagged messages. Record provenance and revisions; an owner correction takes precedence and stale model results must not overwrite it.
- Recheck live Standard membership, compatibility, availability, price, and cart state on every request, including requests using saved aliases.

## Data boundaries

`data/seed/` holds the sanitized starting vocabulary. `data/catalogue/` holds dated supporting observations, including historical snapshots referenced by the map. Neither directory is a live cart queue or a mutable session store.

Local credentials, private name bindings, databases, and browser/WhatsApp session state belong under ignored `.local/` or in environment variables. The hosted service needs a separate persistent volume. Login repair access must be authenticated and disabled outside a repair session.

The browser dependencies and deployment commands are pinned in the package lockfile, Dockerfile, and [operations guide](operations/README.md). Model integrations and merchant-specific locators still require implementation and verification.
