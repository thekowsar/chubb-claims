# chubb-claims context

Goal: claims platform take-home assessment.

# Read first
- planning/00-candidate_assessment_brief.docx (client short brif)          [done]
- planning/01-requirements.md  (what to build)         [done]
- planning/02-workflow.md     (lifecycle, flows, permissions) [done]
- planning/03-db-design.md     (entities)               [done]
- planning/04-api-spec.yaml    (API contract, source of truth) [done]
- planning/05-frontend-spec.md (screens)                [done]

Stack: Java 21, Spring Boot 3, Spring Data JPA, H2 (file mode), Maven, JUnit 5,
springdoc-openapi (Swagger UI), Angular 17 (standalone components),
Karma/Jasmine, Docker (server base image eclipse-temurin:21).

Folders: planning/ = docs, server/ = Spring Boot, client/ = Angular.

Flow: requirements -> workflow -> DB design -> API spec (OpenAPI) ->
frontend spec -> first vertical slice (DB -> API -> UI) -> rest of server
with tests + Dockerfile -> rest of client with tests ->
docker-compose and full test.

Rules:
- Plan first, no code until docs are approved.
- Review: I read and approve each doc myself before the next step starts.
- Order: build one vertical slice end to end (e.g. "User": DB -> API -> UI) before the rest.
- H2 in file mode (jdbc:h2:file:./data/db) so data survives restarts.
- Add springdoc-openapi so Swagger UI is generated from the code.
- controller -> service -> repository, with DTOs.
- log shuld be in code as much as possible
- Every endpoint and component needs tests.
- planning/ API spec is the source of truth.
- Concise, table-driven answers with code.

Logging:
- Use SLF4J (@Slf4j). No System.out.
- Log at service layer: INFO for business events (claim created/updated), WARN for rejected input, ERROR with stack trace for exceptions.
- Add a request/correlation id to every log line (MDC).
- Never log personal data, tokens or full request bodies.

API response (every endpoint, including errors):
- Success: { "success": true, "data": {...}, "error": null, "timestamp": "..." }
- Failure: { "success": false, "data": null, "error": { "code": "CLAIM_NOT_FOUND", "message": "...", "details": [] }, "timestamp": "..." }
- Use one generic ApiResponse<T> class and one @RestControllerAdvice for all errors.
- Use correct HTTP status codes (200/201/400/404/409/500) along with the envelope.
