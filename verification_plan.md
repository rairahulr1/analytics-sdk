# Verification Plan

## Committed Decision — Consistent with Existing Implementation

**Migrations**: `docker compose up --build` always runs `php artisan migrate --force`. Laravel's migration system is idempotent — if migrations already exist, the command completes instantly (exit 0) without re-executing. On a fresh database, all migrations run to completion. This behavior is guaranteed by the `entrypoint.sh` script and `Dockerfile`.

**Seed data**: Runs automatically on every `docker compose up --build`. The `SEED_DATABASE` env var defaults to `true` in `docker-compose.yml` (`SEED_DATABASE: ${SEED_DATABASE:-true}`), and the `entrypoint.sh` script checks `if [ -n "$SEED_DATABASE" ]` — since the variable is always set to a non-empty value, seeding runs unconditionally on every startup, whether fresh or re-deploy.

**Fresh developer environments**: On first `docker compose up --build` with no existing data, both migrations and seed data run completely. On subsequent re-deploys, migrations are instant (idempotent) and seeding re-populates the database.

## Verification Commands (execute verbatim)

```bash
# 1. Full setup — builds all services, starts DB, runs migrations, seeds sample data
docker compose up --build

# 2. Re-deploy — migrations instant (idempotent), seeding re-runs automatically
docker compose up --build

# 3. Fresh start from scratch
docker compose down -v
docker compose up --build

# 4. Without seed data (override default)
SEED_DATABASE=0 docker compose up --build

# 5. Verify migrations table in PostgreSQL
docker exec analytics-sdk-db-1 psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt"

# 6. Verify seed data count (example: users table)
docker exec analytics-sdk-laravel-1 php artisan tinker --execute="App\Models\User::count()"

# 7. Verify entrypoint behavior on re-deploy (migrations should be instant)
# Run up twice and observe exit code 0 both times with no migration errors
docker compose up --build && docker compose up --build
```

## Expected Outcomes

| Scenario                              | Exit Code | Observed Behavior                                  |
|---------------------------------------|-----------|----------------------------------------------------|
| `docker compose up --build` (first run)   | 0         | Migrations + seed data complete                   |
| `docker compose up --build` (re-deploy)   | 0         | Migrations instant (idempotent); seed data re-runs |
| `SEED_DATABASE=0 docker compose up --build` | 0         | Seeding skipped; migrations still run             |
| `docker compose down -v && docker compose up --build` | 0         | Fresh DB, all migrations + full seeding           |

## Failure Mode Checks (per existing commitment)

1. **Build failure**: `docker compose build --no-cache` → exit 1 if any Dockerfile has a syntax error
2. **Migration failure**: `docker compose run --rm laravel php artisan migrate` → exit 255 if `DATABASE_URL` absent or malformed
3. **React compilation failure**: Container logs contain `error`/`failed` if Vite encounters asset errors
4. **SSH deploy failure**: GitHub Actions `deploy` workflow status is `failed` if VPS SSH connection refuses on port 22
5. **Test suite failure**: `npm test` inside Laravel service → exit 1 if any Vitest assertion fails
6. **Seeding failure**: `docker compose run --rm laravel php artisan db:seed` → exit 1 if `DB_DATABASE` does not exist (SQLSTATEHY000)