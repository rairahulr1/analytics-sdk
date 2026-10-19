#!/usr/bin/env sh
set -e

# Wait for database to be ready
echo "Waiting for database connection..."
until pg_isready -h "${DB_HOST:-db}" -U "${DB_USERNAME:-analytics}" -d "${DB_DATABASE:-analytics}"; do
  sleep 2;
done
echo "Database is up - running migrations..."
php artisan migrate --force
echo "Running seeders..."
php artisan db:seed --force

# Start PHP-FPM
exec php-fpm