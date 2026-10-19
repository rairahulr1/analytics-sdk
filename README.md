# Analytics SDK — Restaurant Demo

End-to-end event analytics for a Laravel 13 + React (Vite) restaurant demo app:

- **Browser SDK** (`public/js/analytics.js`) — auto-generated session ID, sends events with CSRF (`X-XSRF-TOKEN` from the `csrf-token` meta tag).
- **Server tracker** (`app/Helpers/EventTracker.php` + `App\Facades\EventTracker`) — records server-side events (e.g. order created).
- **Ingestion + API** — `POST /api/events`, `GET /api/events` (filters by source/type/date, paginate 50).
- **Dashboard** — React + Tailwind mounted at `/analytics` (Blade view, date filtering, pure React — no component-library deps).
- **Demo flow** — `/restaurant` menu → order → events recorded from both browser and server.

Details of the system, data model and assumptions/limitations: see **ANALYTICS_SYSTEM.md**; acceptance contract: **ACCEPTANCE_CRITERIA.md**.

## Quick start (one command)

```bash
docker compose up --build
```

Brings up the full stack on first run (app: <http://localhost>):

- `db` — PostgreSQL 15 (health-checked)
- `laravel` — PHP-FPM app; runs `php artisan migrate --force` on every boot, seeds sample data **only on first startup** (`/tmp/.app_initialized` marker in the container)
- `front` — nginx serving the app + built assets (FastCGI → laravel:9000)

Database/seed override via `.env` (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `SEED_DATABASE`).

## Local development (without Docker)

```bash
composer install && npm install
php artisan serve --port=8000    &
npm run build                    # or: npx vite --port=3003 (dev proxy /api + /restaurant → :8000)
```

Local dev DB is SQLite at `database/database.sqlite`.

## Tests

```bash
php artisan test        # 11 tests: event ingest, list+filter, filter by source, order flow
```

## CI/CD (GitHub Actions)

- `.github/workflows/ci.yml` — on **pull requests** to `main`/`develop`: Postgres service container, `php artisan migrate:fresh --seed`, full PHPUnit suite.
- `.github/workflows/deploy.yml` — on **push to `main`**: rsync to the VPS (`.env` on the server is preserved across deploys), `composer install`, `php artisan migrate --force`, config/route cache refresh, php-fpm + nginx restart, HTTPS health check.

.Required repository secrets:

| Secret | Purpose |
|---|---|
| `VPS_HOST` | Public hostname (SSH target and HTTPS health-check origin) |
| `VPS_SSH_PRIVATE_KEY` | Deploy key registered in the VPS user's `authorized_keys` |
| `VPS_SSH_USER` | SSH user on the VPS |
| `VPS_DEPLOY_PATH` | Absolute path to the app on the VPS |

VPS prerequisites: PHP 8.3 + required extensions (pdo_pgsql…), nginx + php-fpm, composer, rsync on the runner, deploy user's `authorized_keys` configured, `.env` present at `VPS_DEPLOY_PATH`, sudo rights for `systemctl restart php8.3-fpm nginx`.

## Known limitations / assumptions

- Nginx front container mounts `./` read-only; a bare `docker run` of either image (without the compose mounts) serves different content — use `docker compose up`.
- `APP_KEY` currently comes from the repo `.env` baked into the image; fine for local dev — keep the repo private or move the key into the VPS `.env` / CI secrets before pushing the image anywhere.
- Seeders re-run whenever the app container is recreated (new `/tmp`), so the demo DB may gain duplicate sample rows on repeat `up --build`; wipe with `docker compose down -v` for a clean slate.
- Artisan dev tooling (`artisan serve` in local non-Docker mode) is single-threaded — demo only.
