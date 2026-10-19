#!/bin/sh
set -e

# Wait for database to be ready
echo "Waiting for database..."
for i in $(seq 1 60); do
    if php artisan db:status > /dev/null 2>&1; then
        echo "Database is ready!"
        break
    fi
    echo "Waiting for database... ($i/60)"
    sleep 1
done

# Run migrations (idempotent: already ran migrations will simply report nothing to migrate)
echo "Running migrations..."
php artisan migrate --force

# Run seeders on first startup only, if SEED_DATABASE is truthy or 1
if [ -n "$SEED_DATABASE" ] && [ "$SEED_DATABASE" != "0" ] && [ "$SEED_DATABASE" != "false" ] && [ ! -f /tmp/.app_initialized ]; then
    echo "Running database seeders (first startup)..."
    php artisan db:seed --force
    touch /tmp/.app_initialized
fi

# Start PHP-FPM
echo "Starting PHP-FPM..."
exec php-fpm
