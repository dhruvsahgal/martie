# Martie

Martie will turn grocery lists addressed to a WhatsApp bot into a RedMart cart for the owner to review and check out.

**Current status:** project scaffold and semantic seed data. The bot, model integrations, browser worker, and Railway deployment configuration are not implemented yet. There is no install or start command at this stage.

## Project layout

```text
data/
  seed/             Grocery meanings, aliases, and confirmation status
  catalogue/        Dated Standard-list observations supporting the seed
src/                Planned TypeScript application modules
migrations/         Planned SQLite schema migrations
tests/
  fixtures/         Sanitized test inputs and browser fixtures
scripts/            Integration probes and model evaluation utilities
deploy/             Railway/container startup and access configuration
docs/
  architecture.md   Agreed behavior and component boundaries
  operations/       Setup milestones and recovery documentation
```

Empty application directories contain `.gitkeep` markers so Git preserves the layout.

## Semantic mapping

The [seed map](data/seed/martie-semantic-map.json) contains **50 distinct grocery entries** derived from 60 historical mentions. Repeated mentions are vocabulary evidence, not order quantities. Household names use the `{child}` placeholder; bind this privately during setup.

The latest combined observations classify 18 entries as matched, one as matched but sold out, 16 as needing confirmation, and 15 as absent from Standard. These are setup observations, not live shopping decisions.

The [catalogue directory](data/catalogue/) preserves the original 75-product snapshot, the complete 79-product refresh, and a later single-product confirmation for Australian carrots. The carrots supplement does not claim a fresh full-list scan. JSON `file` references resolve from the repository root; `snapshot_id` references identify the dated evidence used by each match.

At runtime, Martie must read the complete live Standard list, recheck availability and prices, and select the cheapest compatible listed pack. An old match or price winner never grants permission to add an item.

## Build and setup

Read the [architecture](docs/architecture.md) and [setup milestones](docs/operations/README.md). The first milestone is proving that a Railway-hosted browser can log in to the correct RedMart account, read Standard, and retain the session across a restart.

Keep local secrets, household-name bindings, browser profiles, WhatsApp authentication, and databases in `.env` or `.local/`, both ignored by Git. Hosted runtime state belongs on a persistent volume, separate from the versioned seed and catalogue data. Never commit session exports or credentials.
