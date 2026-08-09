# Delta for Admin API Security

## ADDED Requirements

### Requirement: Batch Promotion Endpoint Security

`PUT /api/promotion-sections/:id/promotions` MUST be protected by the shared `requireAdmin` middleware (per the admin-api-security matrix) and MUST validate its body with a zod schema. Non-admin sessions MUST receive 403; invalid payloads MUST receive 400 with a descriptive error and MUST NOT write any rows. The route MUST join the admin rate-limit group at parity with other admin mutation endpoints.

#### Scenario: Non-admin denied

- GIVEN a session with role `client`
- WHEN `PUT /api/promotion-sections/:id/promotions` is called
- THEN 403 `{ error: "Forbidden" }` AND no D1 batch is written

#### Scenario: Invalid payload rejected atomically

- GIVEN an admin session and a payload with an invalid item (e.g. a promotion missing `title`)
- WHEN the batch PUT is called
- THEN 400 is returned AND no rows are created, updated, or deleted

#### Scenario: Admin batch succeeds

- GIVEN an admin session and a valid batch payload
- WHEN the batch PUT is called
- THEN 200 with the saved section and promotions

#### Scenario: Rate-limit parity

- GIVEN repeated batch PUT calls from the same admin
- WHEN the request rate exceeds the admin mutation limit
- THEN the endpoint responds with the rate-limit status, matching existing admin routes
