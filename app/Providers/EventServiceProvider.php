<?php

namespace App\Providers;

use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Support\ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    // public function register(): void
    // {
    //     //
    // }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Add event routes to CSRF exception list
        $middleware = $this->app->make(PreventRequestForgery::class);
        $middleware->except('/events');
        $middleware->except('/api/events');
    }
}
