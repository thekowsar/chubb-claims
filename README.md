# chubb-claims

A claims management platform, built as a take-home assessment for Chubb APAC.

Claimants report incidents, track their claims, supply extra information and receive decisions. Claims staff pick up, assess, settle or reject claims. Managers assign work and see team workload, performance and outstanding liability. One Angular app serves all three roles, and the menu each role sees comes from the database.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.3, Spring Data JPA, Spring Security (stateless JWT, BCrypt), Bean Validation |
| Database | H2 in file mode (`./data/db`), schema managed by Flyway (Hibernate `ddl-auto=validate`) |
| API docs | springdoc-openapi (Swagger UI), contract in `planning/04-api-spec.yaml` |
| Frontend | Angular 17 (standalone components, signals), Angular Material 17 |
| Tests | JUnit 5, Mockito, Spring MockMvc (server); Karma and Jasmine (client) |
| Build | Maven (wrapper included), Angular CLI 17 |

## Contents

| I want to | Go to |
|---|---|
| Run the whole app with one command | [Run with Docker](#run-with-docker-one-command) |
| Run the server, client and end-to-end tests | [Run the tests](#run-the-tests) |
| Run the server and client without Docker | [Run on Windows without Docker](#run-on-windows-without-docker) |
| Log in | [Seed users](#seed-users) |

## Run with Docker (one command)

Start Docker Desktop, then from the repository root run:

```powershell
docker compose up -d --build
```

This builds both images and starts the server and the client. The client waits until the server is healthy. The first build takes a few minutes.

| URL | What |
|---|---|
| http://localhost:4200 | The app. Log in as `claimant1`, `staff1` or `manager1` with password `Password123!` ([all seed users](#seed-users)) |
| http://localhost:8080/swagger-ui.html | Swagger UI |
| http://localhost:8080/v3/api-docs | OpenAPI JSON |

| To | Run |
|---|---|
| See the containers | `docker compose ps` |
| Follow the server log | `docker compose logs -f server` |
| Stop, keep the database | `docker compose down` |
| Stop and wipe the database (re-seeded on next start) | `docker compose down -v` |

Ports, the JWT secret and the seed password can be changed by copying `.env.example` to `.env` ([settings](#full-stack-with-docker-compose-step-10)).

## Run the tests

| Suite | What it covers | Needs |
|---|---|---|
| [Server tests](#server-tests) | JUnit 5 and MockMvc tests for every endpoint, 255 tests | JDK 21 |
| [Client tests](#client-tests) | Karma and Jasmine tests for every component and service, 270 tests | Node 20, Chrome |
| [End-to-end tests](#end-to-end-tests) | Smoke tests against the running Docker stack, 46 checks | Docker Desktop, Node 18+ |

### Server tests

```powershell
cd server
.\mvnw.cmd test
```

They use an in-memory H2 database with the same Flyway migrations, so `server/data/` is not touched. Expect `Tests run: 255, Failures: 0` and `BUILD SUCCESS`.

### Client tests

```powershell
cd client
npm install
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage
```

`npm install` is only needed the first time. Expect `TOTAL: 270 SUCCESS`. The coverage report is written to `client/coverage/`.

### End-to-end tests

From the repository root, in one line: start the stack, run the tests, stop the stack.

```powershell
docker compose up -d --build --wait; node tests/smoke.mjs; docker compose down
```

If the stack is already running, just run:

```powershell
node tests/smoke.mjs
```

`tests/smoke.mjs` is plain Node with no dependencies. It goes through nginx on port 4200 and:

- logs in as every role
- takes one claim through SUBMITTED, ASSIGNED, IN_PROGRESS and SETTLED, with messages and an assessment
- takes a second claim to REJECTED
- checks the claimant sees each decision, and the dashboard counts and settled totals change
- checks forbidden actions for the wrong role (403), and 401, 404, 409 and 400 errors
- checks the response envelope on every call

It prints `ok` for each check, ends with `All 46 checks passed`, and exits with code 1 on the first failure. To run it straight against the server, set `$env:BASE_URL="http://localhost:8080"` first. The last recorded run is in [`tests/RESULTS.md`](tests/RESULTS.md).

## Prerequisites

| Tool | Version |
|---|---|
| JDK | 21 (e.g. Eclipse Temurin) |
| Maven | Not needed: the wrapper `mvnw.cmd` downloads Maven 3.8.6 |
| Node.js | 20.19 or later (npm 10) |
| Angular CLI | 17.3 (optional; `npx ng` works too) |
| Chrome | For the headless client tests |
| Docker Desktop | For `docker compose` (tested with Engine 20.10 and Compose v2.7) |

## Run on Windows without Docker

### 1. Server (http://localhost:8080)

```powershell
cd server
.\mvnw.cmd spring-boot:run
```

The first start creates `server/data/db.mv.db`, runs the Flyway migrations and seeds the users. The data survives restarts. To reset, stop the server and delete `server/data/`.

To turn on the H2 console at http://localhost:8080/h2-console (JDBC URL `jdbc:h2:file:./data/db`, user `sa`), use the dev profile:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

### 2. Client (http://localhost:4200)

```powershell
cd client
npm install
npx ng serve
```

`ng serve` proxies `/api` to http://localhost:8080 (`client/proxy.conf.json`), so start the server first.

### Configuration

| Environment variable | Default | Purpose |
|---|---|---|
| `JWT_SECRET` | dev-only value in `application.yml` | HS256 signing key, at least 32 characters. Set it outside local dev. |
| `SEED_DEMO_PASSWORD` | `Password123!` | Password given to every seed user |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | Origins allowed to call the API directly |
| `DB_PASSWORD` | empty | H2 password |

## API docs

| What | URL |
|---|---|
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |
| Contract (source of truth) | [`planning/04-api-spec.yaml`](planning/04-api-spec.yaml) |

Every response uses the same envelope: `{ success, data, error: { code, message, details }, timestamp }`.

## Seed users

All five users share the demo password `Password123!` (the `SEED_DEMO_PASSWORD` default).

| Username | Display name | Role | Password | Home page after login |
|---|---|---|---|---|
| `claimant1` | Alice Tan | CLAIMANT | `Password123!` | My claims |
| `claimant2` | Ben Wong | CLAIMANT | `Password123!` | My claims |
| `staff1` | Chris Lim | CLAIMS_STAFF | `Password123!` | My work queue |
| `staff2` | Dana Ng | CLAIMS_STAFF | `Password123!` | My work queue |
| `manager1` | Evan Lee | MANAGER | `Password123!` | Dashboard |

These are demo accounts for local use only.

## Features

| Feature | Status |
|---|---|
| Login with JWT, current user (`/api/auth/me`), role menu from the database (`/api/menu`) | Done (step 7) |
| App shell with role-based side menu, route guards, logout | Done (step 7) |
| Claims API: submit, role-scoped list with filters, sorting and paging, detail, status history | Server done (step 8), UI done (step 9) |
| Claim workflow API: assign and reassign, start, assess, settle, reject, with the status rules and ownership checks in the service layer | Server done (step 8), UI done (step 9) |
| Messages API between claimant and assigned staff (IN_PROGRESS only, readable after close) | Server done (step 8), UI done (step 9) |
| Staff list for assignment (`/api/users?role=CLAIMS_STAFF`) | Server done (step 8), UI done (step 9) |
| Manager dashboard API (`?period=WEEK\|MONTH\|ALL`): counts by status, unassigned, workload, outstanding liability by market and currency, settled totals | Server done (step 8), UI and charts done (step 9) |
| Sample data: 5 users and 8 claims with history and messages (03 §7), seeded once | Done (step 8) |
| docker-compose for server and client, end-to-end test of the full flow | Done (step 10) |

## Docker

### Server image (step 8)

Multi-stage build: `eclipse-temurin:21-jdk` builds the jar with the Maven wrapper, and `eclipse-temurin:21-jre` runs it as a non-root user with the `docker` profile (H2 console off).

```powershell
cd server
docker build -t chubb-claims-server .
docker run --rm -p 8080:8080 -v chubb-claims-data:/app/data chubb-claims-server
```

The `chubb-claims-data` volume keeps the H2 database between containers. Tests are not run inside the image build; run `.\mvnw.cmd test` first.

### Full stack with docker-compose (step 10)

See [Run with Docker](#run-with-docker-one-command) for the command and URLs.

| Service | Image | Notes |
|---|---|---|
| `server` | `server/Dockerfile` | `docker` profile, H2 in the `claims-data` volume at `/app/data`, healthcheck on port 8080 |
| `client` | `client/Dockerfile` | `node:20-alpine` builds the production bundle, `nginx:1.27-alpine` serves it with `client/nginx.conf` (SPA fallback, `/api/` proxy to `server:8080`, gzip, long cache for hashed files, `index.html` no-cache). Starts after the server is healthy. |

The browser only talks to nginx, so there is no CORS in Docker. Images are tagged `1.0.0` and the base images are pinned (`eclipse-temurin:21`, `node:20-alpine`, `nginx:1.27-alpine`), so nothing uses `latest`.

| Setting (`.env`) | Default | Purpose |
|---|---|---|
| `JWT_SECRET` | demo value in `docker-compose.yml` | JWT signing key, at least 32 characters |
| `SEED_DEMO_PASSWORD` | `Password123!` | Password for the seed users on first start |
| `SERVER_PORT` | `8080` | Host port for the API and Swagger UI |
| `CLIENT_PORT` | `4200` | Host port for the app; also added to the server's CORS allow-list |

```powershell
docker compose logs -f server
```

```powershell
docker compose down
```

`down` keeps the database. `docker compose down -v` also deletes the `claims-data` volume, and the seed data comes back on the next start.

## Folder structure

```
chubb-claims/
├── planning/              Client brief, requirements, workflow, DB design, API spec, frontend spec
├── server/                Spring Boot API
│   ├── src/main/java/com/chubb/claims/
│   │   ├── common/        ApiResponse envelope, errors, GlobalExceptionHandler, correlation-id filter, base entities
│   │   ├── config/        Typed properties, JPA auditing, OpenAPI
│   │   ├── security/      JWT service and filter, security config, 401/403 handlers, role codes
│   │   ├── auth/          Login and current user
│   │   ├── user/          User and Role entities, repositories, DTOs, staff list endpoint
│   │   ├── menu/          Menu entity, role-menu query, controller
│   │   ├── claim/         Claim, message and history entities, status policy, access rules, services, controllers
│   │   ├── dashboard/     Dashboard queries, period window, controller
│   │   └── seed/          Startup role check, user seeder, sample claim seeder
│   ├── src/main/resources/db/migration/   Flyway V1 (schema) and V2 (roles, menus)
│   ├── src/test/          Unit and MockMvc tests
│   ├── Dockerfile         Multi-stage build (temurin 21 JDK to build, JRE to run)
│   └── .dockerignore
├── client/                Angular 17 app
│   ├── src/app/
│   │   ├── core/          Auth, guards, HTTP interceptors, menu service, shell layout, models
│   │   └── features/      Login page and role route files
│   ├── Dockerfile         Multi-stage build (node 20 to build, nginx 1.27 to serve)
│   └── nginx.conf         SPA fallback and /api proxy to the server container
├── tests/                 End-to-end smoke tests (smoke.mjs), last run and screenshots
├── CLAUDE.md              Project rules for the AI assistant
├── context.md             Short project context
├── AI_JOURNAL.md          AI working journal
├── docker-compose.yml     server + client, H2 data volume
└── .env.example           Settings for docker compose (copy to .env)
```

## Planning documents

| # | Document |
|---|---|
| 00 | [Client brief](planning/00-candidate_assessment_brief.docx) |
| 01 | [Requirements](planning/01-requirements.md) |
| 02 | [Workflow: status lifecycle, user flows, permissions](planning/02-workflow.md) |
| 03 | [DB design](planning/03-db-design.md) |
| 04 | [API spec (OpenAPI)](planning/04-api-spec.yaml) and [API summary](planning/04-api-summary.md) |
| 05 | [Frontend spec](planning/05-frontend-spec.md) |

## Status

| Step | Description | Status |
|:-:|---|---|
| 1 | Client brief and project setup | Done |
| 2 | Requirements | Done |
| 3 | Workflow | Done |
| 4 | DB design | Done |
| 5 | API spec (OpenAPI) | Done |
| 6 | Frontend spec | Done |
| 7 | First vertical slice: login end to end (DB → API → UI) | Done |
| 8 | Remaining server features with tests + Dockerfile | Done |
| 9 | Remaining client features with tests | Done |
| 10 | docker-compose and full end-to-end test | Done |
