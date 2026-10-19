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

# Run seeders if SEED_DATABASE is true or 1
if [ "$SEED_DATABASE" = "true" ] || [ "$SEED_DATABASE" = "1" ] || [ -n "$SEED_DATABASE" -a "$SEED_DATABASE" != "0" -a "$SEED_DATABASE" != "false" ]; then
    echo "Running database seeders..."
    php artisan db:seed --force
fi

# Start PHP-FPM
echo "Starting PHP-FPM..."
exec php-fpm
