# Project Overview

**Kippenstummel** is a community-driven platform for collaboratively mapping and
rating cigarette vending machines (CVMs). Users can register CVM locations,
verify and correct positions, and rate machines based on availability and
functionality. A reputation system based on karma and trust scores ensures
data quality through swarm intelligence — rewarding reliable contributors and
surfacing inaccurate or outdated entries.

The platform consists of four components:

- **API** — backend service providing the core business logic, data persistence,
  and REST API consumed by all other components
- **Web** — browser-based map frontend for end users; allows registering, locating,
  and rating CVMs, and manages anonymous user identities and karma
- **KMC** _(Kippenstummel Management Console)_ — internal tooling for moderators
  to review reported machines, manage trust scores, and handle abuse cases
- **CredLib** — utility library containing algorithms for calculating
  an user's credibility.

This repository contains the **API** component of the Kippenstummel project.

## Functionality

Kippenstummel is a crowd-sourced map of cigarette vending machines (CVMs). The
core use case is simple: users report CVM locations, and the community
collectively verifies and maintains their accuracy over time.

**Map & Discovery**
The map displays all registered CVMs, clustered at lower zoom levels for
clarity. Each machine is represented by a badge-coded marker reflecting its
current trust level, derived from its score (ranging from -10 to +10):

- **Top Rated** (+5 to +10) — repeatedly confirmed as working and correctly located
- **Neutral** (0 to +4) — not yet well-verified or mixed feedback
- **Bad** (-1 to -7) — frequently reported as missing or defective
- **For Deletion** (-8 to -10) — likely invalid; pending removal

**CVM Lifecycle**
Any registered user can submit a new CVM location. When submitting, the
reporter provides the exact coordinates (typically via GPS). From that point,
the community takes over: users who encounter the machine in the real world can
upvote it (working, correctly placed) or downvote it (missing, broken, wrong
location). If a machine's position is slightly off, any user can propose a
coordinate correction without re-registering it. In severe cases — spam,
abuse, or gross misplacement — machines can be flagged for moderator review.

**Identity & Anonymity**
Active participation requires an account, but Kippenstummel avoids traditional
registration. Instead, users receive an anonymous identity — no email, no phone
number. This identity is personal and persistent, and tied to all interactions
on the platform.

**Karma & Permissions**
Every user accumulates karma based on the quality and reception of their
contributions. Registering machines that other users confirm as accurate
increases karma; contributing low-quality or incorrect data decreases it.
Karma directly influences a user's permissions and ability to act on the
platform, creating a self-regulating trust hierarchy.

**Moderation**
Moderators operate independently of the crowd-rating system and handle
escalated cases — abuse reports, spam, or systematic data manipulation — that
fall outside what swarm intelligence alone can resolve reliably.

## APIs

The API exposes three separate layers, versioned under `/v1/`.

### Public API

Partially authenticated via anonymous identity token. Provides all endpoints
required for discovering, registering, repositioning, voting on, and reporting
CVMs. Consumed primarily by the web frontend. Handles the full anonymous identity
lifecycle — issuing identities, session token exchange, identity transfer between
devices, and karma-based leaderboard access.

### KMC API

JWT-authenticated internal API consumed exclusively by the Kippenstummel
Moderation Center. Exposes privileged operations for CVM and identity
management, bulk imports (manual, file-based, OSM), background job monitoring,
and aggregated platform statistics.

## Tech Stack

- **Runtime**: Node.js, TypeScript 5+
- **Framework**: NestJS 11+ with Express
- **Architecture**: Event Sourcing via `@ocoda/event-sourcing` (MongoDB event store)
- **Database**: MongoDB (via Mongoose) — event store and read model projections
- **Cache / Locking**: Redis (via Keyv, Redlock)
- **Queue**: BullMQ (background import jobs)
- **Auth**: Passport.js with JWT; anonymous identity
- **Clustering**: Supercluster (server-side CVM geo-clustering)
- **API Docs**: Scalar (`@scalar/nestjs-api-reference`)
- **Testing**: Jest, Testcontainers (MongoDB, Redis), Artillery (load testing)

# Project Structure

## Project Structure

```
.
├── src/
│   ├── core/                         # Domain layer (business logic)
│   │   ├── cvm/                      # CVM aggregate: commands, events, queries, models
│   │   └── ident/                    # Identity aggregate: services, models
│   ├── infrastructure/               # Technical cross-cutting concerns
│   │   ├── datasource/               # Database connection and repository implementations
│   │   ├── eventing/                 # Event store and event bus configuration
│   │   ├── scheduling/               # Background job scheduling and job history
│   │   ├── security/                 # Auth, JWT, captcha guards
│   │   ├── logging/                  # Logging setup
│   │   ├── multithreading/           # Worker thread support
│   │   └── pii/                      # PII handling utilities
│   ├── presentation/                 # API layer (controllers, DTOs, guards)
│   │   ├── cvm/                      # Public CVM endpoints
│   │   ├── ident/                    # Identity endpoints
│   │   ├── kmc/                      # KMC-internal endpoints
│   │   └── common/                   # Shared guards and interceptors
│   ├── worker/                       # BullMQ worker process (import jobs etc.)
│   ├── lib/                          # Shared utilities and base models
│   ├── app.module.ts
│   └── main.ts
├── docs/                             # Operation and configuration documentation
├── migrations/                       # MongoDB migrations
├── config/                           # Environment-specific config files
├── test/                             # Integration and e2e tests
├── Dockerfile
├── nest-cli.json
├── tsconfig.json
├── package.json
└── README.md
```

## Design Decisions

- **Selective CQRS / Event Sourcing**: Not every domain uses the same
  architectural pattern. Complex, audit-sensitive domains (currently CVM) are
  modeled with CQRS and event sourcing — state changes are persisted as an
  immutable event stream, read models are derived projections. Simpler domains
  (e.g. Identity) use a straightforward service/repository pattern where the
  overhead wouldn't pay off.
- **Layered Architecture**: The codebase is split into `core` (domain),
  `infrastructure` (technical concerns), and `presentation` (API). Dependencies
  point inward — presentation depends on core, never the other way around.
- **Separate API surfaces**: The web-facing and KMC-facing APIs are kept
  separate at the controller level and documented independently via two distinct
  OpenAPI specs. This makes it easy to apply different auth, versioning, and
  exposure policies per consumer.
- **Worker Thread for Background Jobs**: BullMQ consumers run in a dedicated
  Node.js worker thread, keeping import and cleanup jobs isolated from the main
  HTTP process. This prevents heavy background workloads from affecting API
  latency.
- **Geo-clustering on the Server**: CVM clustering is performed server-side via
  Supercluster before the response is sent. This offloads computation from
  clients and keeps the web frontend stateless with respect to map data.
- **Anonymous Identity Model**: Users are never asked for PII. Identities are
  issued as opaque credentials and managed through a dedicated credlib. Transfer
  between devices is handled via encrypted tokens with short TTLs.
- **Config Validation at Startup**: All environment variables are validated
  against a Joi schema on boot. Missing or malformed config fails fast rather
  than causing subtle runtime errors.
- **Scheduled Jobs via BullMQ Schedulers**: Recurring jobs (cleanup, orphan
  checks) are registered as BullMQ job schedulers on startup. This keeps
  scheduling logic code-adjacent and version-controlled rather than managed
  externally.
- **Barrel exports per module**: Each module exposes a clean public API via
  `index.ts`. Internal implementation details (handlers, schemas, repositories)
  are not importable from outside the module boundary.
- **Typed domain models over raw DB documents**: Projections and aggregates are
  typed domain models. Raw Mongoose documents are never leaked into the
  presentation layer — controllers only deal with DTOs.
- **Strict TypeScript**: The project targets strict TypeScript throughout.
  `eslint-disable` comments exist only where Mongoose's aggregate typing
  genuinely can't be satisfied without them, and are left with an explanatory
  comment.
- **Constants over magic numbers**: Thresholds, limits, radii, and delays live
  in a central `constants` module. Nothing domain-relevant is hardcoded inline.
- **Fail fast on config and input**: Environment config is validated via Joi at
  startup; request payloads are validated via `class-validator` pipes before
  they reach any handler. Invalid input never propagates into the domain layer.

## General Instructions

- Never dig into node_modules – if you need to understand a dependency, read its docs or types, not its source. If something seems broken, check imports,
  versions, and your own code first. If you need still additional information just ask me.
- Prefer reading before writing – understand the existing structure before generating new files or refactoring. Don't assume conventions; verify them.
- Don't fix what you didn't break – scope changes strictly to what was asked. No opportunistic refactors, formatting fixes, or "while I'm here" changes. But if
  you find something feel free to tell me.
- One task at a time – complete and verify the current task before moving to the next. Don't batch unrelated changes in one go.
