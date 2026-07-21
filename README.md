# GitHub REST API — Automated Test Suite (Playwright + CI)

An automated API test suite built with **Playwright Test**, targeting the
public **GitHub REST API**, wired into a **GitHub Actions** CI pipeline.

This is a pure API-testing project, no browser automation, chosen deliberately
to demonstrate backend/API test design, HTTP assertions, and CI integration,
which is the core of most QA engineering roles.

## What it tests

| File | Coverage |
|---|---|
| `tests/users.spec.ts` | `GET /users/{username}` — schema validation, headers, 404 handling, case-insensitivity |
| `tests/repos.spec.ts` | `GET /repos/{owner}/{repo}` and `/issues` — metadata, 404s, list responses, pagination |
| `tests/search-and-limits.spec.ts` | `GET /search/repositories`, `GET /rate_limit` — sort-order verification, empty-result handling, quota reporting |

**12 tests total**, covering:
- Happy-path schema/field validation
- Error paths (404s, empty search results)
- Response header checks (content-type, rate-limit headers)
- Business-logic assertions (e.g. verifying search results are actually
  sorted by star count, not just that a 200 came back)

## A deliberate design decision: rate-limit-aware skipping

GitHub's REST API caps **unauthenticated** requests at 60/hour, **per source IP**.
On a shared runner or sandboxed network, that quota can already be partially
used by unrelated traffic before this suite even starts.

Rather than let tests fail with a misleading assertion error in that situation,
`tests/helpers/rateLimit.ts` checks the live quota via `/rate_limit` before each
quota-consuming test and skips with a clear, explicit reason if quota is
exhausted, instead of reporting a false failure. In CI, this is largely a
non-issue: `.github/workflows/tests.yml` passes GitHub Actions' auto-provided
`GITHUB_TOKEN`, which raises the quota to 1000/hour.

This mirrors how you'd actually handle testing against any third-party
rate-limited API in a real job. What almost every API test suite in production needs.

## Running locally

```bash
npm install
npx playwright test          # run the suite
npx playwright show-report   # view the HTML report
```

No browser binaries are downloaded, these are HTTP-only tests using
Playwright's `request` fixture.

## CI/CD

`.github/workflows/tests.yml` runs the full suite on every push and pull
request to `main`, and uploads the HTML + JSON test reports as build
artifacts. See the **Actions** tab of this repo for run history.

## Stack

- **Playwright Test** (TypeScript) — test runner + HTTP client
- **GitHub Actions** — CI pipeline, artifact upload
- **GitHub REST API** — system under test

## Possible extensions

- Add contract/schema validation with a JSON Schema library (e.g. `ajv`)
- Add a scheduled (cron) CI run to catch upstream API drift
- Extend to authenticated endpoints using a PAT stored as a repo secret
