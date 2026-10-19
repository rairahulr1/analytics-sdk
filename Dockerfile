FROM php:8.2-fpm-alpine

# Install dependencies
RUN apk add --no-cache \
    icu-dev \
    git \
    curl \
    zip \
    unzip \
    bash

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql intl bcmath

# Set working directory
WORKDIR /var/www

# Copy project files
COPY . .

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Add user
RUN addgroup -g 1000 laravel && adduser -u 1000 -g 1000 -G laravel -s /bin/sh -D laravel

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 9000

CMD ["docker-entrypoint.sh"]