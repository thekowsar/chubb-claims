# AI working journal

Running log of what was asked of the AI, what was accepted, challenged or overridden, and why.

## 2026-11-25 — Step 7: first vertical slice (login end to end)

**Asked:** Spring Boot 3.3 project in `server/` with the `common/` package first, Flyway V1 schema and seed users from 03, `POST /api/auth/login` with JWT/BCrypt/role security per 04, service and MockMvc tests; Angular 17 app in `client/` with only login, auth service, interceptors, guards and role-based menu shell, plus Karma/Jasmine tests. No claims, assignment, messages or dashboard. No changes to `planning/`.

| Item | Outcome | Reasoning |
|---|---|---|
| Scope of the slice | Accepted, plus `GET /api/auth/me` and `GET /api/menu` | 05 needs both for the login flow and the menu shell, so the coordinator included them |
| V1 holds the full schema (all 7 tables, sequence, checks, indexes) | AI choice | Flyway migrations shouldn't be edited after they've run, so later slices only add entities |
| Seeder creates users only; the 8 sample claims come with the claims slice | AI choice | Claims are out of scope for this step |
| Error codes `NOT_FOUND` (404) and `METHOD_NOT_ALLOWED` (405) for unknown routes and wrong methods | Flagged, then **approved by Kowsar**: added to `04-api-spec.yaml` ErrorCode and the summary (A7) | The enum had no code for these cases |
| Material theme `indigo-pink` instead of `azure-blue` | AI choice, per 05 §8's fallback | `azure-blue` first ships in Material 18 |
| Menu targets render a placeholder page | AI choice | The menu links need routes to land on; the real screens come in later slices |
| Failed-login WARN logs the username | Followed 02 §1 / §4.1 | 02 specifies it explicitly; the password and token are never logged |
| Disabled user gets 401 `INVALID_CREDENTIALS` on login, 401 `UNAUTHORIZED` on `/me` | AI choice | Same response as a wrong password, so nothing leaks about the account |

**Results (step 7):** server 59/59 tests passing (`mvnw test`), client 81/81 (`ng test`, 98% line coverage). A live smoke test against H2 file mode worked, through the dev proxy and in the browser.

## 2026-11-25 — Step 8: server features

**Asked:** claims, assignment, messages and dashboard in `server/`, exactly from 04, 03 and 02, with the status rules and role checks in the service layer. Flyway migrations as needed (don't edit V1). Unit and MockMvc tests for every endpoint. Multi-stage Dockerfile (temurin 21 JDK to build, JRE to run) plus `.dockerignore`. Don't touch `client/` or `planning/`.

| Item | Outcome | Reasoning |
|---|---|---|
| No new Flyway migration | AI choice | V1 already had every table, check and index from 03, so nothing was missing |
| Role checks at URL level in `SecurityConfig`, as well as `@PreAuthorize` | AI choice | `@PreAuthorize` runs after body validation, which would return 400 before 403. URL rules give the contract order: 401, 403 role, 400 body, 404, 403 ownership, 409, 400 rules. |
| `incidentDate` "not in future" is a Bean Validation constraint using the app `Clock` in UTC | AI choice; 03 says "checked in the service" | Same rule and the same current date, but it appears in the same 400 `details` as the other field errors, as in the 04 example |
| Staff acting on a SUBMITTED claim gets 403, not 409 | Followed the 04 check order | Nobody is assigned yet, so the ownership check fails before the status check |
| `countsByStatus` always lists all five statuses (zeros included); liability is sorted by market and settled totals by currency | AI choice | A fixed order suits the pie chart (05 T24). The 04 examples aren't normative about order. |
| Sample claims seeded by a separate `SampleClaimSeeder` | AI choice | Only runs when `claims` is empty. Timestamps are backdated over 30 days so the filters and periods have data. |
| Docker image not built locally | Blocked | The Docker daemon wasn't running on the machine |

**Results (step 8):** server 255/255 tests passing (`mvnw test`). Live smoke test of the full flow (submit, assign, start, assess, settle, history, dashboard) against the H2 file database worked.

## 2026-11-25 — Step 10: docker-compose and end-to-end test

**Asked:** client Dockerfile, nginx.conf and .dockerignore; root docker-compose.yml (named H2 volume, server healthcheck, client waits for a healthy server, no `latest` tags); .env.example; one-command smoke tests in `tests/` (every role, every status, dashboard, wrong-role 403, error envelope); run up, smoke, down, then the server and client suites; README update. Don't change `planning/` or app code unless a test finds a bug, and ask first.

| Item | Outcome | Reasoning |
|---|---|---|
| Replaced the placeholder `docker-compose.yml` | AI choice | It held only a comment from step 1 |
| Client Dockerfile and `nginx.conf` | Followed 05 §10.2 and §10.3 | `node:20-alpine` → `nginx:1.27-alpine`, `/api/` proxied to `server:8080`, SPA fallback, cache headers, gzip |
| Server healthcheck by opening a TCP connection to 8080 with bash | AI choice | No actuator in the server, and the temurin image may not ship curl. It lets `client` start only after the API is listening. |
| End-to-end smoke tests as a Node script (`tests/smoke.mjs`), no new dependency | AI choice | Node is already needed for the client, built-in `fetch` is enough, and it runs the same on Windows and in CI. It goes through nginx so the proxy is tested too. |
| Second claim done by hand in the browser, ending in a rejection | AI choice | The script covers settle; the UI run covers reject and proves the screens work against the containers |
| Spring Boot logs "Using generated security password" at startup | Flagged, not changed | Default in-memory user manager, never used by the JWT login. Harmless, but a one-line server fix would remove the noise. |

| First pass used `e2e/`, `:latest` image tags and fixed ports | **Corrected to Kowsar's brief** | The brief asks for `tests/`, no `latest` tags and an `.env.example`. Moved to `tests/smoke.mjs`, images tagged `1.0.0`, ports and secrets configurable from `.env`, and a rejection path added so every status is reached. |

**Results (step 10):** images built and the stack started first time. Smoke tests 46/46 passed, server suite 255/255, client suite 270/270 (97.6% lines); a browser walkthrough of submit → assign → start → reject → claimant view → dashboard worked; data survived `docker compose down` and `up`. Details in `tests/RESULTS.md`.
