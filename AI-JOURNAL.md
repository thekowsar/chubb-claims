# AI-JOURNAL: prompts and feedback from the project chat

A running log of what Kowsar asked in the project chat, what the AI replied, and Kowsar's feedback, in order. Prompts are quoted as sent, with long step prompts shortened. Replies are summarised. Not polished.

Outcome key: **accepted**, **challenged** (Kowsar questioned it), **overrode** (Kowsar changed the AI's proposal), **AI self-check** (the AI found a problem in its own work).

## Setup

| # | Prompt (Kowsar) | AI reply (summary) | Feedback / outcome |
|---|---|---|---|
| 1 | "Read context.md and the brief in the project files. Then create CLAUDE.md if not exits in the connected folder with the stack, folder roles, rules, logging and response envelope." | CLAUDE.md existed but was empty, so the AI asked before filling it, then wrote it. | accepted |
| 2 | "now I want to update my context with this and also claude.md": H2 file mode, springdoc Swagger UI, one vertical slice first, review each doc before the next step. | Added the four rules to both files, plus two rules not asked for (keep data/ out of git, keep Swagger matching the spec), and said so. | accepted (no objection) |
| 3 | "Create this structure in the connected folder, only the missing items ... .gitkeep ... .gitignore ... Then list the folder tree." | Created the missing items and listed the tree. | accepted |
| 4 | "Move 00-candidate_assessment_brief.docx into planning/ ... Don't rename or edit it." | Moved it and asked whether to update the CLAUDE.md path. | "Yes update claude.md": accepted |

## Step 2: requirements

| # | Prompt (Kowsar) | AI reply (summary) | Feedback / outcome |
|---|---|---|---|
| 5 | "Start step 2: requirements ... User two role: 1. CLAIMANT ... 2. CLAIMANT_STAFF ... Ask me up to 5 short questions." | Asked 5 questions. Challenged the role name ("did you mean CLAIMS_STAFF?") and noted there was no manager. Proposed statuses Submitted, Under review, Info requested, Approved, Settled, Rejected. Suggested Spring events with a path to Kafka. | see 6 to 8 |
| 6 | "1. Please add one new role MANAGER who can see the workload and liability dashboard. 2. Submitted > Assigned (Manager will do) > Work In Progress (CLAIMS_STAFF will do when start) > Settled or Reject (Staff with Notes)" | Added MANAGER and used Kowsar's flow. | **overrode**: two roles became three, and the AI's status flow was replaced |
| 7 | "3. Claim fields ... OK. 4. Kafka: No kafka as small and time limit. 5. Priorities ... Yes Needed" | Recorded no Kafka. | **overrode** the Kafka suggestion. Fields and priorities accepted |
| 8 | "While in progress claimnt and staff conversassion will go throgh the message. when going to settled or reject should be note." | Messages only while In progress, managers read only, note required to settle or reject. | **overrode** the AI's notes-only idea |
| 9 | "Login needs Spring Security and a JWT library. OK / 401 and 403 status codes. OK / Managers assign claims ... OK" | Recorded as decisions and asked to add them to CLAUDE.md. | accepted. "Yes", then "I am reviewing requirements doc. wait for approvement" |
| 10 | "Filtering and pagination on claim lists by status, market, type and date is mandatory" | Made it a must-have. Assumed incident date and asked. | "Yes submit date": **overrode** the assumption |
| 11 | "01-requirements.md is approved and update to done and show me the next steps" | Marked done and listed steps 3 to 10. | accepted |

## Step 3: workflow

| # | Prompt (Kowsar) | AI reply (summary) | Feedback / outcome |
|---|---|---|---|
| 12 | "Start step 3: workflow ... Main user flows per role (CLAIMANT, CLAIMANT_STAFF) ..." | Challenged: the prompt lists two roles but the approved doc has three. Proposed flows for all three and 5 sequence diagrams. | "1. yes 2. yes": accepted |
| 13 | (doc delivered) | 10 diagrams. Four points: staff get 403 on unassigned claims, settle uses the saved assessed amount, an error code for a bad token, a concurrent change is refused. | "four points is okay": accepted |
| 14 | "Set 02-workflow.md to [done] in CLAUDE.md." / "add in context.md alos" | Marked done in both. | accepted |

## Step 4: DB design

| # | Prompt (Kowsar) | AI reply (summary) | Feedback / outcome |
|---|---|---|---|
| 15 | "Start step 4: DB design ..." | Asked 3 questions: 2 claimants, 2 staff and 1 manager; role as a column on users; Flyway plus an idempotent seeder. | "3 questions is OK": accepted |
| 16 | (doc delivered) | 4 tables, 5 users, 8 sample claims. Four points: currency, status history, audit username, H2 console dev only. | "Let me review the doc" |
| 17 | "Which role will get which menu that has to be defile in db" | Added menu tables with seed data per role. | **challenged**: menus were missing from the DB |
| 18 | "Role remove from enum and create table and link with user, menu and role_menu" | Roles became a table linked to users and menus. Asked to update the approved requirements and workflow docs. | **overrode** role-as-column |
| 19 | "1. yes update requiremnts 2. OK" | Updated the requirements and workflow docs too. | accepted |
| 20 | "Set 03-db-design.md to [done] in CLAUDE.md." | Marked done. | accepted |

## Step 5: API spec

| # | Prompt (Kowsar) | AI reply (summary) | Feedback / outcome |
|---|---|---|---|
| 21 | "Start step 5: API document ... (CLAIMANT, CLAIMANT_STAFF) ..." | 16 endpoints with the three approved roles. Three changes: a concurrent-change error code, a history endpoint, a nested login response. | "Let me review the API spec" |
| 22 | "/api/auth/me what param will pass" | No parameters, only the bearer token. | **challenged** (question), answered |
| 23 | "/api/menu how serve get the role" | The role is read from the database using the user in the token, never sent by the client. Recommended keeping the DB lookup. | **challenged** (question), answered |
| 24 | "/api/dashboard what param is passed in request" | No parameters, manager only. Offered filters. | **challenged** (question) |
| 25 | "dash board data for monthly or weekly or entirely" | Added a week, month or all period, using calendar periods. | "calendar weeks and months ok / update requirement doc also": accepted |
| 26 | "Set 04-api-spec.yaml to [done] in CLAUDE.md." | Marked done and counted it as approval of the three changes. | accepted |

## Step 6: frontend spec

| # | Prompt (Kowsar) | AI reply (summary) | Feedback / outcome |
|---|---|---|---|
| 27 | "Start step 6: frontend document ..." | 12 screens. Five choices: Angular Material, shared claim screens, Settle disabled until assessed, a client network error code, no chart library. | see 28 |
| 28 | "first four Okay but dashboard need chart one pie and one bar" | Added ng2-charts: a pie by status and a bar for staff workload. | **overrode** "no chart library" |
| 29 | "OK", then "I have to review frontend spec" | The AI had taken "OK" as approval and marked the spec done. It apologised and reverted. | **challenged**: approval assumed too early |
| 30 | "Set 05-frontend-spec.md to [done] in CLAUDE.md" | All 5 planning docs approved. | accepted |
| 31 | "Change the Java version from 17 to 21 everywhere in CLAUDE.md and context.md (... eclipse-temurin:21)" | Changed both and asked whether to add the Docker image name. | **overrode** Java 17. "yes add eclipse-temurin:21" / "also add in context.md" |

## Step 7: login slice

| # | Prompt (Kowsar) | AI reply (summary) | Feedback / outcome |
|---|---|---|---|
| 32 | "Start step 7: first slice (login end to end) ..." | 59 server and 81 client tests passing. Asked to add NOT_FOUND and METHOD_NOT_ALLOWED to the spec. | "Yes add in API spec": accepted |
| 33 | "Step 7 approved ... Create README.md ... Add a rule to CLAUDE.md ..." | README written, steps 1 to 7 marked done, rule added. | accepted |

## Step 8: server

| # | Prompt (Kowsar) | AI reply (summary) | Feedback / outcome |
|---|---|---|---|
| 34 | "Start step 8: server ..." | 255 tests, no spec changes. Dockerfile not built because Docker Desktop wasn't running. | accepted |
| 35 | "Step 8 approved. Mark it done ..." | It was already marked done. | accepted |

## Step 9: client

| # | Prompt (Kowsar) | AI reply (summary) | Feedback / outcome |
|---|---|---|---|
| 36 | "Start step 9: client, remaining screens ... create/edit claim ..." | 229 tests. Raised the bundle size (711 kB against 500 kB), a repeated access-denied message, and that the spec has no claim edit. | see 37 |
| 37 | "Raise the initial bundle budget ... 800kB ... 1MB ... Don't do bigger optimization. edit claim not needed. only status change" | Budget raised, all routes lazy-loaded. | **overrode**: claim editing dropped. Budget raised instead of optimising |
| 38 | "Fix the repeated access-denied message ... Tell me the root cause before you fix it." | Its own "up to three times" was wrong. The real cause was components repeating the interceptor's error. | **AI self-check** |
| 39 | (fix delivered) | One 403 message per burst. Noted the forbidden-claim test asked for would have passed before the fix, so it added a better one. | **AI self-check** |
| 40 | "Check that 404, 500 and network errors also show exactly one message ..." | 500 and network showed two messages, as the approved spec said. Gave 3 options. | **challenged** |
| 41 | "Option 1. Interceptor shows one popup (with the reference id) ..." | Built, then proposed spec lines 366 and 432. | accepted |
| 42 | "Approved: both line 366 and line 432 ... search ..." / "Approved: all 7 lines ..." | Spec updated. The check found Settle and Reject showed a 400 as a snackbar. | **AI self-check** |
| 43 | "Option 1: fix the code." / "approved" (T21) | Dialogs now send their own request, 270 tests. | accepted: fix the code, not the spec |
| 44 | "Mark step 9 as done in CLAUDE.md and the README." | README done, CLAUDE.md blocked by auto mode. | Kowsar edited CLAUDE.md. "yes update" for the README feature rows |

## Step 10: Docker and end-to-end tests

| # | Prompt (Kowsar) | AI reply (summary) | Feedback / outcome |
|---|---|---|---|
| 45 | "Start step 10: full development and test ..." | First pass put tests in e2e/, had no .env.example and no reruns, and left the stack running. Reworked: 46/46 smoke, 255 server and 270 client tests. | **challenged** (gaps flagged), then accepted |
| 46 | "Yes. Mark step 10 as done in CLAUDE.md ..." | Blocked by auto mode. | Kowsar edited it: "I made [done] check is it ok", confirmed |
| 47 | "how to run in single command by docker compose add in readme.md ..." | README Docker and test sections added. | accepted |

## Extras

| # | Prompt (Kowsar) | AI reply (summary) | Feedback / outcome |
|---|---|---|---|
| 48 | "Upload this project to GitHub ..." | Clean review, .angular/ added to .gitignore. Proposed five commits, but Kowsar's single message was used. The push failed on expired credentials. | **overrode** five commits |
| 49 | "Create AI_JOURNAL.md ..." / "Go through every prompt ..." / "Again create it ..." | Rebuilt AI_JOURNAL.md. Had extended the old file by mistake at first. | **challenged**, rebuilt. README link moved to the new file |
| 50 | "I have give you also this attached prompt add in in AI_JOURNAL.md" | Prompts from the file added per step. | accepted |
| 51 | "create a JOURNAL from here what promt and feedback here" / "and new file AI-JOURNAL.md" | This file. | — |
