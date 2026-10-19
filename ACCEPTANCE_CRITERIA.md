# Acceptance Criteria

## Docker Setup

The Docker Compose configuration includes a dedicated PostgreSQL service named `db` that runs alongside the Laravel and React containers, enabling the full stack to be brought up with a single `docker compose up --build` command. The Laravel application connects to `db:5432` by default, and migrations/seeding target this internal database.

**Migrations and seeding behavior:** Laravel migrations run via `php artisan migrate --force` and seed data runs via `php artisan db:seed` when `SEED_DATABASE=true` on every `docker compose up --build`, **both idempotent**: migrations skip already-migrated tables, and seeding checks for existing records before inserting. This ensures the single-command setup works on fresh deploys and re-deploys alike.

## GitHub CI/CD Pipeline

GitHub Actions workflow runs two jobs:
- **`test`** — runs on pull requests: sets up PostgreSQL, installs deps, runs migrations + seeds, executes `npm test`, uploads failure artifacts
- **`deploy`** — runs on `main` push: SSH deploy to VPS, runs migrations + cache clear, restarts PHP-FPM

## Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP/hostname |
| `VPS_SSH_PRIVATE_KEY` | SSH private key for VPS access |
| `VPS_SSH_USER` | VPS SSH user (e.g., `deploy`) |
| `VPS_DEPLOY_PATH` | Remote deployment directory |

## VPS Prerequisites

- SSH access configured with the provided key
- PHP-FPM and Nginx installed
- `.env` file present at `deploy path` with database credentials
- Port 22 open for SSH connections

## Single-Command Setup

```bash
docker compose up --build
```

This builds all services, starts PostgreSQL, waits for it to be ready, runs Laravel migrations, and optionally seeds sample data — all in one command.

## Verifiable Failure Modes (each testable by a developer in one command)

1. **Build failure**: `docker compose build --no-cache` exits with code 1 if any Dockerfile has a syntax error — verified by introducing `RUN false` into any service's Dockerfile and confirming non-zero exit.

2. **Migration failure**: `docker compose run --rm laravel php artisan migrate` exits with code 255 if `DATABASE_URL` is absent or malformed — verified by `unset DATABASE_URL` in the Laravel service definition and confirming migration aborts with "could not find driver" or similar error.

3. **React compilation failure**: Container logs contain the substring `error` or `failed` when Vite encounters asset errors — verified by breaking a React component syntax and confirming `docker compose up` output includes "error" from the node process.

4. **SSH deploy failure**: GitHub Actions workflow run status is `failed` if VPS SSH connection refuses on port 22 — verified by blocking port 22 on the VPS and observing the `deploy.yml` workflow fail with "Connection refused".

5. **Test suite failure**: `npm test` inside the `laravel` service exits with code 1 if any Vitest test assertion fails — verified by modifying a test `expect(true).toBe(true)` to `expect(false).toBe(true)` and confirming the container's exit code is 1.

6. **Seeding failure**: `docker compose run --rm laravel php artisan db:seed` exits with code 1 if the `DB_DATABASE` does not exist — verified by setting `DB_DATABASE=nonexistent` and confirming seed aborts with "SQLSTATEHY000".