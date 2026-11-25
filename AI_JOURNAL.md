# AI working journal

A running log of what I asked the AI, what the AI proposed, and whether I accepted, challenged or overrode it, with brief reasoning. Built only from the project conversation, in order. "AI self-check" rows are where the AI found a problem in its own work.

| # | Step | What I asked | What the AI proposed | Outcome | Brief reason |
|---|---|---|---|---|---|
| 1 | 1 Setup | Set up the project | A setup with 3 parallel planning threads | **Overrode:** I drove it step by step | Review each doc before the next |
| 2 | 1 Setup | Start from the client brief | Flagged that the brief docx was missing at first | Accepted (no objection) | Can't plan without the brief |
| 3 | 1 Setup | Fill `CLAUDE.md` | Asked before filling the empty file; stack taken from `context.md` (Java 17 at the time) | Accepted | `context.md` was the source |
| 4 | 1 Setup | Add 4 rules: H2 file mode, springdoc Swagger, one vertical slice first, review each doc before the next | Added them to `context.md` and `CLAUDE.md`, plus 2 unasked rules (keep `data/` out of git, Swagger must match the spec), and said so | Accepted (no objection) | Both follow from my rules |
| 5 | 1 Setup | Folder structure: `planning/`, `server/`, `client/`, `.gitkeep`, comment-only `docker-compose.yml`, `.gitignore` list, no code yet | Created it as given | **My structure** | Plan first, no code |
| 6 | 1 Setup | Move the brief into `planning/` | Asked to update the brief's path in `CLAUDE.md` | Accepted (I said yes) | Keep paths correct |
| 7 | 2 Requirements | Two roles, CLAIMANT and CLAIMANT_STAFF | Asked whether I meant CLAIMS_STAFF and pointed out there was no manager | **AI challenged me; I overrode** its default by adding a MANAGER role for the dashboard | Three roles: CLAIMANT, CLAIMS_STAFF, MANAGER |
| 8 | 2 Requirements | Claim status lifecycle | Submitted, Under review, Info requested, Approved, Settled, Rejected | **Overrode:** Submitted > Assigned (manager) > In progress (staff) > Settled or Rejected (staff, with note) | Simpler, matches who does what |
| 9 | 2 Requirements | Claim fields and priorities | Default fields and priorities | Accepted | |
| 10 | 2 Requirements | Kafka where event-driven fits | Spring events with a later Kafka path | **Overrode:** no Kafka, REST only | Small scope |
| 11 | 2 Requirements | How claimants provide more info | Notes while In progress | **Overrode (refined):** messages while In progress, decision note required to settle or reject | No extra status needed |
| 12 | 2 Requirements | Open assumptions | Spring Security + JWT, 401/403 codes, managers assign (brief said staff pick up) | Accepted; added to `CLAUDE.md` on my yes | Needed for three roles and auth |
| 13 | 2 Requirements | Filtering and pagination mandatory (my addition) | Assumed the date filter meant incident date | **Overrode:** submitted date | That's how lists are searched |
| 14 | 2 Requirements | Review | — | Approved | |
| 15 | 3 Workflow | Workflow doc (prompt again listed two roles) | Pointed out the approved docs have three roles | **AI challenged me;** I accepted three | Consistent with 01 |
| 16 | 3 Workflow | Sequence diagrams | 5 sequence diagrams | Accepted | |
| 17 | 3 Workflow | Clarifications | Staff get 403 on unassigned claims; settle uses the saved assessed amount; error code for a bad token; concurrent change refused | Accepted; marked done in `context.md` on my ask | Make 01 precise |
| 18 | 4 DB design | Seed data and schema | 2 claimants, 2 staff, 1 manager; Flyway + idempotent seeder instead of Hibernate auto-update; no deletes | Accepted | Repeatable schema |
| 19 | 4 DB design | Roles | Role as a column on `users` | **Overrode:** role menus must be in the DB, so roles table linked to users, plus `menus` and `role_menu`. AI asked to update approved 01 and 02; I said yes | Menus change without a frontend release |
| 20 | 4 DB design | Other choices | Currency limited to market currencies, status history as core, audit username, H2 console dev only | Accepted | |
| 21 | 5 API spec | API spec (prompt listed two roles) | Kept three roles | Accepted (no objection) | Approved docs |
| 22 | 5 API spec | Spec review | Concurrent-change error code, claim history endpoint, nested login response | Accepted | |
| 23 | 5 API spec | Questioned `/api/auth/me` params, `/api/menu` role source, `/api/dashboard` params | Recommended a DB lookup over the token role for the menu | **Challenged;** accepted after the answers | |
| 24 | 5 API spec | Dashboard period week / month / all (my addition) | Calendar periods in UTC; update requirements | Accepted | |
| 25 | 6 Frontend spec | Frontend spec | Angular Material, shared claim screens, Settle disabled until assessed, client-only network error code | Accepted 4 of 5 | |
| 26 | 6 Frontend spec | Dashboard | No chart library | **Overrode:** pie and bar chart with ng2-charts | Visual dashboard |
| 27 | 6 Frontend spec | "OK" | Took "OK" as approval and marked the spec done | **Challenged:** "I have to review." AI reverted; I approved later | Review gate |
| 28 | 6 Frontend spec | Java version | — | **Overrode:** Java 17 to 21 in `CLAUDE.md` and `context.md`, added `eclipse-temurin:21` | My call |
| 29 | 7 Login slice | Login end to end, DB to API to UI | Built it (59 server, 81 client tests); asked to add `NOT_FOUND` and `METHOD_NOT_ALLOWED` to the spec | Accepted (I said yes) | Spec first: the spec lacked these codes |
| 30 | 7 Login slice | — | Redocly spec lint blocked by a download; gave me the command | Accepted (no objection) | |
| 31 | 7 Login slice | Approved; asked for `README.md` and a rule to update it each step | Added both | Accepted | Keep status and run steps current |
| 32 | 8 Server | Remaining server features + Dockerfile | 255 tests, no spec changes; Dockerfile not built (Docker Desktop not running) | Approved | |
| 33 | 9 Client | Remaining client screens, incl. claim editing | Flagged that editing was in the ask but not in the spec (229 tests) | **Overrode:** "edit claim not needed, only status change" | Keep to the spec |
| 34 | 9 Client | Bundle budget | Bundle 711 kB, over the 500 kB budget | **My choice:** warn 800 kB / error 1 MB, check lazy loading and unused libraries, no bigger optimization | Enough for the assessment |
| 35 | 9 Client | Access denied shown repeatedly: root cause first | First claimed it showed "up to three times" | **Challenged.** AI self-check: that claim was wrong; real cause was components repeating the interceptor's error | Fix: one 403 message per 2-second burst |
| 36 | 9 Client | Test for the 403 fix | AI self-check: my requested test would also have passed before the fix; added a better one | Accepted (no objection) | Test must fail without the fix |
| 37 | 9 Client | Check 404, 500 and network handling | Found 5xx and network showed two messages, as the approved spec said; gave 3 options | **Challenged; I chose option 1:** interceptor popup with reference id, pages keep only Retry, 404 and validation stay on the page | One message per error |
| 38 | 9 Client | Spec changes for option 1 | Lines 366 and 432; then a search found 288, 433, 434, 436 to 439, plus optional 430 and 468 | Approved one at a time | Spec first |
| 39 | 9 Client | — | AI self-check: Settle and Reject dialogs showed a 400 as a snackbar, not inline | **My choice:** fix the code, not reword the spec; T21 line 483 approved after seeing the wording (270 tests) | Spec was right |
| 40 | 9 Client | Step 9 docs | `CLAUDE.md` edit blocked by auto mode | I edited it myself; README feature rows updated on my yes | |
| 41 | 10 Docker + e2e | docker-compose, `.env.example`, tests in `tests/`, rerun suites | First pass put tests in `e2e/`, no `.env.example`, no reruns, stack left running | **Challenged;** reworked to the brief: 46/46 smoke, 255 server, 270 client | Brief was explicit |
| 42 | 10 Docker + e2e | Step 10 docs | `CLAUDE.md` edit blocked twice | I made the edit | |
| 43 | 10 Docker + e2e | README: one-command Docker and test sections | Added them | Accepted | |
| 44 | GitHub | Commit and push | Five commits | **Overrode:** my single commit message (`fdefc4b`). AI added the missing `.angular/` to `.gitignore` | My call |
| 45 | GitHub | Push | Push failed on expired credentials; gave me the fix | Accepted (no objection) | |
| 46 | Journal | Create `AI_JOURNAL.md` and a `CLAUDE.md` rule | First extended the old `AI-JOURNAL.md` and changed a different `CLAUDE.md` line | AI self-check: reverted that, created the new file and added the exact rule | Follow the instructions as written |

## To fill in by me

- The manager-routes question
