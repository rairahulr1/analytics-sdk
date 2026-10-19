<?php

use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\RestaurantController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    return redirect()->route('restaurant.home');
})->name('home');

/**
 * Analytics API Routes
 */
Route::post('api/events', [EventController::class, 'store'])->name('api.events.store');
Route::get('api/events', [EventController::class, 'index'])->name('api.events.index');
Route::get('api/analytics/stats', [EventController::class, 'stats'])->name('api.analytics.stats');

/**
 * Analytics Dashboard Route
 */
Route::get('dashboard', function () {
    return view('analytics.dashboard');
})->name('dashboard');

/**
 * Restaurant Demo Routes
 */
Route::get('restaurant', [RestaurantController::class, 'index'])->name('restaurant.home');
Route::get('restaurant/menu', [RestaurantController::class, 'menu'])->name('restaurant.menu');
Route::get('restaurant/order', [RestaurantController::class, 'order'])->name('restaurant.order');
Route::post('restaurant/orders', [RestaurantController::class, 'createOrder'])->name('restaurant.orders.store');
