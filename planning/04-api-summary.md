# 04 — API summary

**Project:** chubb-claims
**Status:** Approved by Kowsar (2026-11-25)
**Date:** 2026-11-25
**Contract:** `04-api-spec.yaml` (OpenAPI 3.0.3) is the source of truth. This page is a quick index of it.

Roles are **CLAIMANT**, **CLAIMS_STAFF** and **MANAGER** (approved in 01 and 03). Every endpoint except login needs a `Bearer` JWT, and every response uses the `ApiResponse` envelope.

## Endpoints

| # | Endpoint | Method | Role | Purpose | Requirement |
|---|---|---|---|---|---|
| 1 | `/api/auth/login` | POST | Public | Log in with username and password and get a JWT | FR-02, US-01 |
| 2 | `/api/auth/me` | GET | All | Current user, to restore the session | FR-05 |
| 3 | `/api/menu` | GET | All | The caller's role menu from the DB (`roles`, `menus`, `role_menu`) | FR-06, FR-25, US-02 |
| 4 | `/api/claims` | GET | All, scoped: CLAIMANT own, STAFF assigned, MANAGER all | List claims with filters, sorting and pagination | FR-08, FR-10, FR-13, FR-23, US-04, US-07, US-10 |
| 5 | `/api/claims` | POST | CLAIMANT | Submit a claim (SUBMITTED) | FR-07, FR-19, US-03 |
| 6 | `/api/claims/{id}` | GET | All, scoped | Claim detail | FR-08, US-04, US-06 |
| 7 | `/api/claims/{id}/assignment` | PUT | MANAGER | Assign or reassign to staff (SUBMITTED/ASSIGNED to ASSIGNED) | FR-12, FR-17, US-08 |
| 8 | `/api/claims/{id}/start` | POST | CLAIMS_STAFF (assigned) | Start work (ASSIGNED to IN_PROGRESS) | FR-14, FR-17, US-11 |
| 9 | `/api/claims/{id}/assessment` | PATCH | CLAIMS_STAFF (assigned) | Set or update the assessed amount (IN_PROGRESS) | FR-15, US-12 |
| 10 | `/api/claims/{id}/settle` | POST | CLAIMS_STAFF (assigned) | Settle with an amount and a decision note (IN_PROGRESS to SETTLED) | FR-16, FR-17, US-13 |
| 11 | `/api/claims/{id}/reject` | POST | CLAIMS_STAFF (assigned) | Reject with a decision note (IN_PROGRESS to REJECTED) | FR-16, FR-17, US-14 |
| 12 | `/api/claims/{id}/messages` | GET | All, scoped (MANAGER read only) | Read messages | FR-09, US-05, US-12 |
| 13 | `/api/claims/{id}/messages` | POST | CLAIMANT (own), CLAIMS_STAFF (assigned) | Send a message (IN_PROGRESS only) | FR-09, US-05, US-12 |
| 14 | `/api/claims/{id}/history` | GET | All, scoped | Status history for the timeline | FR-20, FR-21 |
| 15 | `/api/users?role=CLAIMS_STAFF` | GET | MANAGER | Staff list for the assign dialog | FR-11, US-08 |
| 16 | `/api/dashboard?period=WEEK\|MONTH\|ALL` | GET | MANAGER | Workload, counts by status, unassigned count, liability, settled totals. `period` defaults to ALL. | FR-18, US-09 |

## List parameters (`GET /api/claims`)

| Parameter | Type | Notes |
|---|---|---|
| `status` | enum, repeatable | e.g. `status=ASSIGNED&status=IN_PROGRESS` |
| `market` | `SG` `HK` `AU` `MY` `TH` `ID` | |
| `type` | `MOTOR` `PROPERTY` | |
| `submittedFrom`, `submittedTo` | date | Inclusive, compared with `createdAt` in UTC |
| `page` | int, from 0 | Default 0 |
| `size` | int, 1 to 100 | Default 20 |
| `sort` | `field,asc\|desc` | Fields: `createdAt`, `updatedAt`, `incidentDate`, `estimatedAmount`, `claimNumber`, `status`. Default `createdAt,desc`. |

The response `data` is `{ items, page, size, totalElements, totalPages }`.

## Dashboard period (`GET /api/dashboard?period=`)

| `period` | Window (UTC, ends now) |
|---|---|
| `WEEK` | This calendar week, from Monday 00:00 |
| `MONTH` | This calendar month, from the 1st 00:00 |
| `ALL` (default) | All time |

| Figure | Uses period? |
|---|---|
| `submittedCount`, `countsByStatus` | Yes. Claims **submitted** in the window. |
| `settledTotals`, `closedCounts` | Yes. Claims **closed** in the window (`closedAt`). |
| `unassignedCount`, `workload`, `outstandingLiability` | No. These are a current snapshot, because exposure is "now". |

## Error codes

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Bad body or query, or a business rule such as settled amount above assessed. `details` lists each field. |
| 400 | `INVALID_ASSIGNEE` | Assigning to a user who isn't CLAIMS_STAFF |
| 401 | `INVALID_CREDENTIALS` | Login failed |
| 401 | `UNAUTHORIZED` | Missing, invalid or expired token |
| 403 | `ACCESS_DENIED` | Wrong role, or staff acting on a claim not assigned to them |
| 404 | `CLAIM_NOT_FOUND` | No such claim, or a claimant opening another claimant's claim |
| 404 | `NOT_FOUND` | No such route (for example `/api/does-not-exist`) |
| 405 | `METHOD_NOT_ALLOWED` | The route exists but not for this HTTP method |
| 409 | `INVALID_STATUS_TRANSITION` | Move not allowed by the status workflow |
| 409 | `MESSAGING_NOT_ALLOWED` | Sending a message when the claim isn't IN_PROGRESS |
| 409 | `CONCURRENT_MODIFICATION` | Optimistic lock clash (02 W4) |
| 500 | `INTERNAL_ERROR` | Unexpected error, with a generic message only |

## Validation

- `openapi-spec-validator` 0.7.1: **OK**
- `@redocly/cli` 1.25.0 lint: **valid, 0 errors**. Its 2 warnings are about a missing licence field and the `localhost` server URL, and both are expected here.

## Notes for review

| # | Point | Proposed |
|---|---|---|
| A1 | Your step message listed CLAIMANT and CLAIMANT_STAFF. As before, I used the three approved roles. | CLAIMANT, CLAIMS_STAFF and MANAGER |
| A2 | New error code `CONCURRENT_MODIFICATION` for the optimistic-lock 409. 02 W4 said such clashes return 409 but didn't name a code. | Yes |
| A3 | `GET /api/claims/{id}/history` is a new endpoint that exposes FR-20 for the timeline. It isn't in the 02 endpoint list. | Yes |
| A4 | Login returns `{ token, tokenType, expiresIn, user: { id, username, displayName, role } }`. 01 §4 says `{ token, username, displayName, role }`, so this nests the user details and adds `tokenType` and `expiresIn`. | Yes. It's the same data plus expiry, and `user` matches `GET /api/auth/me`. |
| A5 | `GET /api/claims/{id}/messages` isn't paginated, because one claim has few messages | Yes |
| A7 | `NOT_FOUND` (404, unknown route) and `METHOD_NOT_ALLOWED` (405, wrong method) added to `ErrorCode`, found while building the login slice | Approved by Kowsar (2026-11-25) |
| A6 | Dashboard `period` (WEEK, MONTH or ALL) added at Kowsar's request. 01 was updated to match (FR-18, US-09, A13). | Confirmed. Calendar week and month in UTC. Liability and workload stay a snapshot. |
