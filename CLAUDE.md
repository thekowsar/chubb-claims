# CLAUDE.md — chubb-claims

Claims management platform (take-home assessment for Chubb APAC). Claimants report incidents, track claims, supply extra info and receive decisions. Claims staff pick up, assess, settle or reject claims and see team workload, performance and outstanding liability. One Angular app serves both user types. Backend first; frontend if time permits.

## Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3, Spring Data JPA, H2 (file mode: `jdbc:h2:file:./data/db`), Maven |
| Security | Spring Security, stateless JWT (e.g. jjwt), BCrypt password hashing |
| API docs | springdoc-openapi, Swagger UI generated from code |
| Backend tests | JUnit 5 (plus Spring Boot Test / MockMvc) |
| Frontend | Angular 17, standalone components |
| Frontend tests | Karma / Jasmine |
| API contract | OpenAPI (`planning/04-api-spec.yaml`) |
| Runtime | Docker (server base image `eclipse-temurin:21`), docker-compose |
| Messaging | REST/HTTP; Kafka where event-driven fits (decision documented in planning) |

## Folder roles

| Folder | Purpose |
|---|---|
| `planning/` | Client brief, requirements, workflow, DB design, OpenAPI spec, frontend spec. Source of truth. |
| `server/` | Spring Boot API, its tests and Dockerfile |
| `client/` | Angular 17 app and its tests |
| root | `CLAUDE.md`, `context.md`, `docker-compose.yml`, AI working journal |

## Read first

1. `planning/00-candidate_assessment_brief.docx` — client brief [done]
2. `planning/01-requirements.md` — what to build [done]
3. `planning/02-workflow.md` — status lifecycle, user flows, API sequences, permissions [done]
4. `planning/03-db-design.md` — entities [done]
5. `planning/04-api-spec.yaml` — API contract (source of truth) [done]
6. `planning/05-frontend-spec.md` — screens [done]

## Delivery flow

1. Client brief and project setup (`CLAUDE.md`, `context.md`) [done]
2. Requirements (`01-requirements.md`) [done]
3. Workflow (`02-workflow.md`) [done]
4. DB design (`03-db-design.md`) [done]
5. API spec, OpenAPI (`04-api-spec.yaml`) [done]
6. Frontend spec (`05-frontend-spec.md`) [done]
7. First vertical slice: login end to end (DB → API → UI) [done]
8. Remaining server features with tests + Dockerfile [done]
9. Remaining client features with tests [done]
10. docker-compose and full end-to-end test [done]

## Rules

- **Plan first.** No code until the planning docs are approved.
- **Review gate:** Kowsar reads and approves each doc before the next step starts. Stop and wait for approval after each doc.
- **Vertical slice first:** build one feature end to end (e.g. "User": DB → API → UI) before starting the rest.
- **H2 file mode:** `spring.datasource.url=jdbc:h2:file:./data/db` so data survives restarts. Keep `data/` out of git.
- **API docs:** add `springdoc-openapi-starter-webmvc-ui` so Swagger UI (`/swagger-ui.html`) is generated from the code. It must stay consistent with `planning/04-api-spec.yaml`.
- **Layering:** controller → service → repository. Controllers take and return DTOs, never entities. Map in the service layer.
- **Contract first:** the OpenAPI spec in `planning/` is the source of truth. Change the spec before changing an endpoint.
- **Tests:** every endpoint and every component has tests.
- **Logging everywhere it helps:** log generously in code, following the rules below.
- **Answers:** concise and table-driven, with code.
- **Git:** do not commit or push unless asked. Keep a meaningful commit history when asked to commit.
- **README:** After each step, update README.md (status table, run instructions, new features).
- **AI journal:** keep a running log of what was asked of the AI, what was accepted, challenged and overridden, with brief reasoning.
- After each step, add a row to AI_JOURNAL.md. Don't invent entries.

## Logging

| Rule | Detail |
|---|---|
| Library | SLF4J via Lombok `@Slf4j`. No `System.out` / `printStackTrace`. |
| Where | Service layer for business logic |
| INFO | Business events (claim created, updated, status changed) |
| WARN | Rejected or invalid input |
| ERROR | Exceptions, with stack trace |
| Correlation id | Every log line carries a request/correlation id via MDC (filter sets it per request, e.g. from `X-Correlation-Id` or generated, and clears it after) |
| Never log | Personal data, tokens, credentials, full request/response bodies |

```java
@Slf4j
@Service
public class ClaimService {
    public ClaimDto create(CreateClaimRequest req) {
        Claim saved = repository.save(mapper.toEntity(req));
        log.info("Claim created id={} type={}", saved.getId(), saved.getType());
        return mapper.toDto(saved);
    }
}
```

## API response envelope

Every endpoint returns the same envelope, including errors.

Success:
```json
{ "success": true, "data": { }, "error": null, "timestamp": "2026-11-25T09:30:00Z" }
```

Failure:
```json
{ "success": false, "data": null,
  "error": { "code": "CLAIM_NOT_FOUND", "message": "Claim 42 not found", "details": [] },
  "timestamp": "2026-11-25T09:30:00Z" }
```

| Rule | Detail |
|---|---|
| Wrapper | One generic `ApiResponse<T>` class (`success`, `data`, `error{code,message,details}`, `timestamp`) |
| Errors | One `@RestControllerAdvice` handles all exceptions and builds the failure envelope |
| Status codes | Real HTTP codes with the envelope: 200 OK, 201 Created, 400 validation, 401 unauthenticated (missing/invalid JWT, bad credentials), 403 forbidden (wrong role), 404 not found, 409 conflict / invalid state transition, 500 unexpected |
| Error codes | Stable UPPER_SNAKE_CASE codes (e.g. `CLAIM_NOT_FOUND`, `VALIDATION_FAILED`, `INVALID_STATUS_TRANSITION`, `INVALID_CREDENTIALS`, `ACCESS_DENIED`) |
| 500s | Generic message to the client; full detail only in the ERROR log |
