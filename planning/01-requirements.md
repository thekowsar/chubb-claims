# 01 — Requirements

**Project:** chubb-claims (Chubb APAC take-home assessment)
**Status:** Approved by Kowsar (2026-11-25). Revised the same day with Kowsar's OK: the role-to-menu mapping and roles now live in the database (see 03-db-design §3.0 and §3.5).
**Date:** 2026-11-25
**Sources:** `00-candidate_assessment_brief.docx`, `CLAUDE.md`, `context.md`, and Kowsar's answers to the clarifying questions

---

## 1. Overview

Chubb APAC handles motor and property claims in six markets. Today claimants submit claims by phone or email and get no visibility afterwards. Staff work from shared inboxes and spreadsheets. Managers have no live picture of open claims or liability.

chubb-claims is a single Angular 17 app on a Spring Boot 3 REST API. It serves three seeded user roles:

- **Claimants** report incidents, track their claims, add information and see decisions.
- **Managers** see the incoming queue, assign claims to staff, and watch workload and outstanding liability.
- **Claims staff** work the claims assigned to them and settle or reject them with notes.

The backend comes first, as the brief asks. The frontend is built on top of the agreed API contract (`04-api-spec.yaml`).

## 2. Scope

### 2.1 In scope

| # | Item |
|---|---|
| S1 | Username/password login that returns a JWT. Users are seeded at startup. |
| S2 | Three roles (CLAIMANT, CLAIMS_STAFF, MANAGER), each with its own menu and route guards |
| S3 | Claimant: submit, list and view their own claims, and exchange messages with the assigned staff member while the claim is IN_PROGRESS |
| S4 | Manager: see all claims, filter for unassigned ones, and assign a claim to a staff member |
| S5 | Staff: see the claims assigned to them, start work, record the assessed amount, message the claimant, and settle or reject with a required note |
| S6 | Status workflow SUBMITTED → ASSIGNED → IN_PROGRESS → SETTLED / REJECTED, enforced on the server |
| S7 | Manager dashboard: workload per staff member and outstanding liability by market and currency |
| S8 | Standard API response envelope, global error handling, and correlation-id logging |
| S9 | H2 database in file mode, OpenAPI contract, and Swagger UI generated from the code |
| S10 | JUnit 5 / MockMvc tests on every endpoint and Karma/Jasmine tests on every component |
| S11 | Dockerfiles plus docker-compose that start the API and the client locally |
| S12 | Filtering by status, market, type and submitted date range, plus server-side pagination, on every claim list (claimant, staff and manager) |

### 2.2 Out of scope

| # | Item | Reason |
|---|---|---|
| O1 | Kafka or any message broker | Small scope and a 2 to 3 hour budget. Everything is synchronous REST (see §8). |
| O2 | User registration, user admin, password reset | Users come from seed data (Kowsar's decision) |
| O3 | File attachments (photos, documents) | Kowsar's decision. Storage and scanning add a lot of work. |
| O4 | Currency conversion | Kowsar's decision. Amounts are reported per currency. |
| O5 | Claimant withdrawal of a claim | Not in the agreed status flow |
| O6 | Refresh tokens, SSO, MFA | Demo-grade authentication is enough for the assessment |
| O7 | Policy management and policy validation | Not part of the brief. The policy number is free text. |
| O8 | Email or SMS notifications | No external integrations |
| O9 | Multiple services or microservices | One modular Spring Boot service is enough at this size (see §8) |

### 2.3 Nice-to-have (only if time allows)

| # | Item |
|---|---|
| N1 | Claim timeline showing each status change with actor and time |
| N2 | In-app notifications, such as "your claim was settled" |
| N3 | Performance metrics such as average time to settle and settled/rejected counts per staff member |

## 3. User roles

All users are created by seed data at startup. There is no registration screen and no user-management API.

| Role | Who | Can do | Cannot do |
|---|---|---|---|
| `CLAIMANT` | Policyholder reporting an incident | Submit a claim, see **only their own** claims, message the assigned staff member while the claim is IN_PROGRESS, and see decisions with the staff note | See other people's claims, change status, see the dashboard |
| `CLAIMS_STAFF` | Claims officer | See claims **assigned to them**, start work, set the assessed amount, message the claimant while IN_PROGRESS, and settle or reject with a note | Assign claims, see the manager dashboard, work claims assigned to someone else |
| `MANAGER` | Claims team lead | See **all** claims (including their messages, read only), assign or reassign SUBMITTED/ASSIGNED claims to staff, see the workload and liability dashboard | Settle or reject claims, which stays a staff action |

### 3.1 Seed users

Passwords are stored BCrypt-hashed. The demo password is documented in the README and is never logged.

| Username | Role | Display name |
|---|---|---|
| `claimant1` | CLAIMANT | Alice Tan |
| `claimant2` | CLAIMANT | Ben Wong |
| `staff1` | CLAIMS_STAFF | Chris Lim |
| `staff2` | CLAIMS_STAFF | Dana Ng |
| `manager1` | MANAGER | Evan Lee |

Seed data also includes a handful of sample claims spread across statuses and markets, so the dashboard and lists are not empty on first run.

### 3.2 Role-specific menu

| Menu item | CLAIMANT | CLAIMS_STAFF | MANAGER |
|---|:-:|:-:|:-:|
| My claims | ✓ | | |
| New claim | ✓ | | |
| My work queue (assigned to me) | | ✓ | |
| All claims / unassigned queue | | | ✓ |
| Dashboard (workload and liability) | | | ✓ |
| Claim detail (opened from a list) | ✓ own | ✓ assigned | ✓ all |
| Logout | ✓ | ✓ | ✓ |

Roles and the role-to-menu mapping are **stored in the database** (`roles`, `menus`, `role_menu`). After login the client calls `GET /api/menu`, which returns the caller's menu in display order, and builds the menu from that. The first item is the role's home page. Claim detail and Logout aren't stored menu items: detail opens from a list, and Logout is always shown. Angular route guards block direct URL access using the role in the JWT, and the API enforces the same rules. The menu and guards are for user experience only. The API is the real access control.

## 4. Login

| Item | Requirement |
|---|---|
| Screen | One login page with username, password and a Login button. It shows an error on failure. |
| Endpoint | `POST /api/auth/login` returns `{ token, username, displayName, role }` inside the envelope |
| Token | JWT signed with HS256. It carries `sub` (user id), `username` and `role`, and expires after 60 minutes. |
| Client | The token is kept in memory or sessionStorage. An HTTP interceptor adds `Authorization: Bearer …`. |
| Failure | Wrong credentials return 401 `INVALID_CREDENTIALS`, with the same message for an unknown user and a wrong password |
| Expiry | A 401 from any call clears the session and sends the user back to login |
| Logout | Client side only: discard the token |

## 5. Claim model and workflow

### 5.1 Claim fields

| Field | Set by | Rule |
|---|---|---|
| `claimNumber` | System | Unique and human readable, e.g. `CLM-2026-000123` |
| `type` | Claimant | `MOTOR` or `PROPERTY` |
| `market` | Claimant | One of `SG`, `HK`, `AU`, `MY`, `TH`, `ID` (assumed, see §10) |
| `policyNumber` | Claimant | Required free text, max 30 characters |
| `incidentDate` | Claimant | Required, not in the future |
| `location` | Claimant | Required, max 200 characters |
| `description` | Claimant | Required, 10 to 2000 characters |
| `estimatedAmount` | Claimant | Required, > 0, 2 decimal places |
| `currency` | Claimant | ISO code. Defaults to the market's currency (SGD, HKD, AUD, MYR, THB, IDR). |
| `status` | System / actions | See §5.2 |
| `claimantId` | System | Taken from the JWT |
| `assignedStaffId` | Manager | Set on assignment |
| `assessedAmount` | Staff | ≥ 0. Optional while IN_PROGRESS and required before settling. |
| `settledAmount` | Staff | > 0 and ≤ assessed amount. Required to settle. |
| `decisionNote` | Staff | **Required** to settle or reject, max 2000 characters. Shown to the claimant. |
| `createdAt`, `updatedAt`, `assignedAt`, `startedAt`, `closedAt` | System | UTC timestamps |

**Messages** are a conversation attached to a claim: a list of `{ author, role, text, createdAt }` items, 1 to 2000 characters each. This is how the brief's "provide additional information when asked" is covered (Kowsar's decision):

- Messages can be sent **only while the claim is IN_PROGRESS**.
- Only the **claimant** who owns the claim and the **assigned staff member** can send them.
- Managers can read them but not send them.
- Sending in any other status returns 409 `MESSAGING_NOT_ALLOWED`.
- The conversation stays readable after the claim is closed.

The **decision note** is separate from messages. It is a required field on the settle and reject actions.

### 5.2 Status workflow

```
SUBMITTED ──(manager assigns)──▶ ASSIGNED ──(staff starts)──▶ IN_PROGRESS ──(staff settles + note)──▶ SETTLED
                                   ▲  │                                   └─(staff rejects + note)──▶ REJECTED
                                   └──┘ (manager reassigns)
```

| From | To | Who | Preconditions |
|---|---|---|---|
| — | SUBMITTED | CLAIMANT | Valid claim fields |
| SUBMITTED | ASSIGNED | MANAGER | Target user has the CLAIMS_STAFF role |
| ASSIGNED | ASSIGNED (reassign) | MANAGER | Target user has the CLAIMS_STAFF role |
| ASSIGNED | IN_PROGRESS | CLAIMS_STAFF | Caller is the assigned staff member |
| IN_PROGRESS | SETTLED | CLAIMS_STAFF | Caller is the assigned staff member, with assessed amount, settled amount and decision note |
| IN_PROGRESS | REJECTED | CLAIMS_STAFF | Caller is the assigned staff member, with a decision note |

SETTLED and REJECTED are final. Any other transition returns **409 `INVALID_STATUS_TRANSITION`**.

### 5.3 Outstanding liability

- A claim is **open** when its status is SUBMITTED, ASSIGNED or IN_PROGRESS.
- **Outstanding liability** is the sum, over open claims, of `assessedAmount` when it is set and `estimatedAmount` otherwise.
- Totals are grouped by **market and currency**. There is no conversion, so amounts in different currencies are never added together.
- **Settled total** is the sum of `settledAmount` for SETTLED claims, also grouped by currency. It is shown for context.

## 6. User stories with acceptance criteria

### Authentication

**US-01: Log in.** As any user, I want to log in with my username and password so that I see the screens for my role.
- Valid credentials give a JWT, and I land on my role's home page (claimant: My claims, staff: My work queue, manager: Dashboard).
- Invalid credentials show "Invalid username or password". The API returns 401 `INVALID_CREDENTIALS`.
- Calling any protected endpoint without a valid token returns 401. Calling one my role isn't allowed to use returns 403 `ACCESS_DENIED`.

**US-02: Role menu.** As any user, I want to see only the menu items for my role.
- The menu matches §3.2 for each role.
- Typing a URL for another role's page redirects to my home page.

### Claimant

**US-03: Submit a claim.** As a claimant, I want to report an incident so that the claim gets processed.
- The form has the claimant fields from §5.1 with client-side and server-side validation.
- A valid submission returns 201 with the claim in SUBMITTED status and a claim number.
- An invalid submission returns 400 `VALIDATION_FAILED`, and `details` lists each field error.

**US-04: Track my claims.** As a claimant, I want to see my claims and their status.
- The list shows claim number, type, market, incident date, estimated amount, status and last updated time. It shows only my claims.
- I can filter by status, market, type and submitted date range, and the list is paginated (see FR-23).
- Opening another claimant's claim returns 404 `CLAIM_NOT_FOUND`, so its existence isn't revealed.

**US-05: Provide more information.** As a claimant, I want to reply to staff messages on my claim when they ask for more detail.
- I can send a message only while my claim is IN_PROGRESS.
- Sending a message in any other status returns 409 `MESSAGING_NOT_ALLOWED`.
- Messages from staff and from me show on the claim detail in time order, and stay visible after the claim is closed.

**US-06: See the decision.** As a claimant, I want to see the result and the reason.
- A SETTLED claim shows the settled amount, currency and decision note.
- A REJECTED claim shows the decision note.

### Manager

**US-07: See incoming claims.** As a manager, I want to see all claims, with unassigned ones easy to find.
- The list shows all claims, filtered by status (e.g. SUBMITTED for unassigned), market, type and submitted date range, and is paginated.
- Each row shows the assigned staff member, or "Unassigned".

**US-08: Assign a claim.** As a manager, I want to assign a submitted claim to a staff member.
- I choose a staff member from a list of CLAIMS_STAFF users.
- The claim moves to ASSIGNED, with `assignedStaffId` and `assignedAt` set.
- Assigning to a user who isn't staff returns 400 `INVALID_ASSIGNEE`. Assigning a claim that is IN_PROGRESS or closed returns 409 `INVALID_STATUS_TRANSITION`.
- I can reassign while the claim is still ASSIGNED.

**US-09: Workload and liability dashboard.** As a manager, I want a live view of team workload and exposure.
- Workload: for each staff member, the count of ASSIGNED and IN_PROGRESS claims.
- A count of unassigned (SUBMITTED) claims.
- Claim counts by status.
- Outstanding liability by market and currency, using the rule in §5.3.
- I can choose a period: this week, this month or all time (the default). Weeks and months are calendar periods in UTC.
- Submitted counts, counts by status and settled and rejected totals follow the period. Unassigned count, workload and outstanding liability always show the current state.
- The numbers reflect the current database state each time the page loads.

### Claims staff

**US-10: My work queue.** As a staff member, I want to see the claims assigned to me.
- The list shows only claims where I'm the assigned staff member, in ASSIGNED or IN_PROGRESS status. Closed claims can be shown with the status filter. Market, type and submitted date filters and pagination also apply.

**US-11: Start work.** As a staff member, I want to start work on an assigned claim.
- An ASSIGNED claim of mine moves to IN_PROGRESS and `startedAt` is set.
- Starting a claim assigned to someone else returns 403 `ACCESS_DENIED`.

**US-12: Assess and message the claimant.** As a staff member, I want to record the assessed amount and ask the claimant for more information.
- I can set or update `assessedAmount` while the claim is IN_PROGRESS.
- I can send messages to the claimant while the claim is IN_PROGRESS, and I see their replies on the claim detail.
- Messaging on a claim that isn't assigned to me returns 403 `ACCESS_DENIED`.

**US-13: Settle a claim.** As a staff member, I want to settle a claim with an amount and a note.
- This requires an assessed amount, a settled amount (> 0 and ≤ assessed) and a decision note.
- The claim moves to SETTLED and `closedAt` is set.
- A missing or invalid field returns 400 `VALIDATION_FAILED`.

**US-14: Reject a claim.** As a staff member, I want to reject a claim with a reason.
- This requires a decision note.
- The claim moves to REJECTED and `closedAt` is set.

## 7. Functional requirements

Priority: **M** = must-have, **S** = should-have (planned but can be cut), **C** = could-have (nice-to-have, §2.3).

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Seed five users (2 claimants, 2 staff, 1 manager) and sample claims at startup if they are missing | M |
| FR-02 | `POST /api/auth/login` checks credentials and returns a JWT with the role | M |
| FR-03 | All `/api/**` endpoints except login and Swagger need a valid JWT | M |
| FR-04 | Role-based access is enforced on the server for every endpoint (§3) | M |
| FR-05 | `GET /api/auth/me` returns the current user, so the client can rebuild the session | S |
| FR-06 | The client shows a role-specific menu, loaded from `GET /api/menu`, and uses route guards (§3.2) | M |
| FR-07 | A claimant can create a claim with validated fields (§5.1). It starts as SUBMITTED. | M |
| FR-08 | A claimant can list and view only their own claims | M |
| FR-09 | Claimant and assigned staff can exchange messages on a claim only while it is IN_PROGRESS. Managers can read them. Other statuses return 409 `MESSAGING_NOT_ALLOWED`. | M |
| FR-10 | A manager can list all claims and filter by status | M |
| FR-11 | `GET /api/users?role=CLAIMS_STAFF` lists staff, for assignment (manager only) | M |
| FR-12 | A manager can assign or reassign a claim (SUBMITTED/ASSIGNED → ASSIGNED) | M |
| FR-13 | Staff can list the claims assigned to them | M |
| FR-14 | Staff can start an assigned claim (ASSIGNED → IN_PROGRESS) | M |
| FR-15 | Staff can set the assessed amount on an IN_PROGRESS claim | M |
| FR-16 | Staff can settle (with amounts and a required decision note) or reject (with a required decision note) an IN_PROGRESS claim | M |
| FR-17 | The server enforces the status machine in §5.2. Invalid moves return 409 `INVALID_STATUS_TRANSITION`. | M |
| FR-18 | The manager dashboard endpoint returns workload per staff member, counts by status, the unassigned count, outstanding liability by market and currency, and settled and rejected totals. An optional `period` (WEEK = this calendar week, MONTH = this calendar month, ALL = all time, the default; UTC) applies to the submitted, settled and rejected figures. Unassigned count, workload and liability are always current. | M |
| FR-19 | Claim numbers are unique and generated by the system | M |
| FR-20 | Every status change is recorded (`claim_status_history`: from, to, actor, time) | S |
| FR-21 | Claim timeline UI on the claim detail page, built from FR-20 | C |
| FR-22 | In-app notifications for the claimant on assign, start, settle and reject | C |
| FR-23 | All claim list endpoints accept optional filters `status`, `market`, `type`, `submittedFrom`, `submittedTo` (dates, inclusive, compared against `createdAt` in UTC; combined with AND) and server-side pagination `page` (0-based), `size` (default 20, max 100) and `sort` (default `createdAt,desc`). They return the items with `page`, `size`, `totalElements` and `totalPages`. Role scoping (own, assigned, all) is applied before filters. Invalid filter values return 400 `VALIDATION_FAILED`. The UI has filter controls and a paginator on each list. | M |
| FR-24 | Metrics on the dashboard: average time to settle and settled/rejected counts per staff member | C |
| FR-25 | Roles and the role-to-menu mapping are stored in the database (`roles`, `menus`, `role_menu`) and seeded at startup. `GET /api/menu` returns the logged-in user's menu items (code, label, route, order). | M |

## 8. Architecture decisions that come from the requirements

These are decided here so the next documents can build on them. The workflow and DB design documents will cover the detail.

| Decision | Choice | Reason |
|---|---|---|
| Service boundaries | **One Spring Boot service** with packages by module (`auth`, `user`, `claim`, `dashboard`) | One team, one database and a 2 to 3 hour budget. Clear modules keep a later split possible. |
| Communication | **REST/HTTP only, no Kafka** | Every user action needs an immediate answer, such as validation or a state-transition result. The dashboard reads live data. There are no external consumers yet. A broker would add infrastructure and failure modes without adding value at this size. For the walkthrough, the natural first Kafka use is publishing `ClaimStatusChanged` events for notifications, analytics or downstream systems. |
| "Async nature" of claims | Modelled as **persisted state plus a status machine**, and the UI re-fetches on navigation | Claims take days, not milliseconds. The system's job is to store state and enforce transitions, not to run asynchronous jobs. |
| Two user types, one Angular app | The **menu comes from the database** through `GET /api/menu`. The **role in the JWT** drives lazy-loaded routes and route guards. The API enforces the same rules. | One codebase. Menus can change without a frontend release, and access control lives on the server. |
| Contract | `planning/04-api-spec.yaml` (OpenAPI) is the source of truth. springdoc generates Swagger UI, which must match it. | Contract first, as in CLAUDE.md |
| Database | H2 file mode (`jdbc:h2:file:./data/db`) | As in CLAUDE.md. Data survives restarts and there is zero setup. |

## 9. Non-functional requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-01 | Layering | Controller → service → repository. Controllers take and return DTOs, never entities. Mapping happens in the service layer. |
| NFR-02 | Response envelope | Every endpoint, including errors, returns `ApiResponse<T>` `{ success, data, error{code,message,details}, timestamp }` |
| NFR-03 | Error handling | One `@RestControllerAdvice`. Real HTTP codes: 200, 201, 400, 401, 403, 404, 409, 500. Stable UPPER_SNAKE_CASE codes (`VALIDATION_FAILED`, `INVALID_CREDENTIALS`, `ACCESS_DENIED`, `CLAIM_NOT_FOUND`, `INVALID_STATUS_TRANSITION`, `INVALID_ASSIGNEE`, `MESSAGING_NOT_ALLOWED`, `INTERNAL_ERROR`). A 500 sends a generic message to the client, with detail only in the ERROR log. |
| NFR-04 | Logging | SLF4J via `@Slf4j`, with no `System.out`. INFO for business events (claim created, assigned, started, settled, rejected, login success). WARN for rejected or invalid input and failed logins. ERROR with stack trace for exceptions. |
| NFR-05 | Correlation id | A servlet filter reads `X-Correlation-Id` or generates one, puts it in MDC, adds it to the response header, and clears it afterwards. Every log line carries it. |
| NFR-06 | Privacy in logs | Never log personal data (names, descriptions, locations), passwords, tokens, or full request or response bodies. Log ids, statuses and types only. |
| NFR-07 | Security | Passwords are BCrypt-hashed. JWT secret comes from config or an environment variable. Sessions are stateless. CORS allows only the client origin. |
| NFR-08 | Persistence | H2 file mode. `data/` is git-ignored. Seed data is safe to run again. |
| NFR-09 | API docs | springdoc-openapi with Swagger UI at `/swagger-ui.html`, consistent with `04-api-spec.yaml` |
| NFR-10 | Backend tests | JUnit 5. Unit tests for services, especially the status machine and liability calculation. MockMvc tests for every endpoint, covering success, validation, 401/403 and 409 paths. |
| NFR-11 | Frontend tests | Karma/Jasmine spec for every component, service, guard and interceptor |
| NFR-12 | Docker | A multi-stage Dockerfile each for `server/` and `client/` (client served by nginx). `docker-compose up` starts both, with an H2 data volume. |
| NFR-13 | End-to-end check | A documented end-to-end run of the full flow (claimant submits → manager assigns → staff starts and settles → claimant sees decision → dashboard updates) against docker-compose |
| NFR-14 | Validation | Bean Validation on request DTOs. The client mirrors the main rules. |
| NFR-15 | Time zone | Timestamps are stored and returned in UTC (ISO-8601). The client formats them in local time. |
| NFR-16 | Process | Meaningful git history (when asked to commit) and an AI working journal kept at the repo root |

## 10. Assumptions and open questions

### Assumptions and confirmed decisions

| # | Assumption |
|---|---|
| A1 | The six markets are SG, HK, AU, MY, TH and ID, each with its local currency. The brief doesn't name them. |
| A2 | **Confirmed by Kowsar.** MANAGER takes over the brief's "staff pick up incoming claims" step by assigning claims. Staff don't pick up claims themselves. |
| A3 | Only MANAGER sees the team workload and liability dashboard. Staff see their own queue. |
| A4 | A claimant who opens another claimant's claim gets 404, not 403, so its existence isn't revealed |
| A5 | A manager can reassign a claim only while it is ASSIGNED. Once staff start it, it is locked to them. |
| A6 | The settled amount can't be higher than the assessed amount. A settled amount lower than the claimant's estimate is allowed. |
| A7 | Liability uses the assessed amount when it is set and the estimate otherwise (§5.3) |
| A8 | **Confirmed by Kowsar.** Spring Security and a JWT library (e.g. jjwt) are added to the backend. The CLAUDE.md stack table doesn't list them yet. |
| A9 | **Confirmed by Kowsar.** Status codes 401 and 403 are used, in addition to the CLAUDE.md list (200/201/400/404/409/500). |
| A10 | The policy number is free text and isn't checked against a policy system |
| A11 | Resolved: claimant and staff talk through messages only while the claim is IN_PROGRESS. A decision note is required to settle or reject. There is no INFO_REQUESTED status. (Kowsar, 2026-11-25) |
| A12 | **Confirmed by Kowsar.** "Date" in the list filters means the **submitted date** (`createdAt`), not the incident date. |
| A13 | **Confirmed by Kowsar (closes the old Q2).** The dashboard has a week, month or all-time period selector using calendar periods in UTC (FR-18). |

### Open questions

| # | Question | Proposed default |
|---|---|---|
| Q1 | Can a manager unassign a claim, moving it from ASSIGNED back to SUBMITTED? | No. Reassign only. |
