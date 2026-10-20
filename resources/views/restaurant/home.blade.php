@extends('layouts.app')

@section('content')
<div class="space-y-8">
    <!-- Hero Banner -->
    <div data-tour="home-hero" class="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-8 sm:p-12 text-white shadow-md relative overflow-hidden">
        <div class="relative z-10 max-w-2xl">
            <span class="inline-block px-3 py-1 bg-indigo-500/30 border border-indigo-400/40 rounded-full text-xs font-semibold uppercase tracking-wider text-indigo-200 mb-4">
                Interactive Restaurant Demo
            </span>
            <h1 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Authentic Artisanal Italian Dining
            </h1>
            <p class="mt-4 text-indigo-100 text-sm sm:text-base leading-relaxed">
                Experience wood-fired pizzas and homemade pastas. Every action on this demo triggers analytics events: browser page views, custom client button clicks, and server-side order transactions.
            </p>
            <div class="mt-8 flex flex-wrap gap-4">
                <a href="{{ route('restaurant.menu') }}" class="px-6 py-3 rounded-xl bg-white text-indigo-900 font-bold text-sm hover:bg-indigo-50 transition shadow">
                    Explore Menu &rarr;
                </a>
                <a href="{{ route('restaurant.order') }}" class="px-6 py-3 rounded-xl bg-indigo-600 border border-indigo-400 text-white font-bold text-sm hover:bg-indigo-500 transition shadow">
                    Place an Order
                </a>
            </div>
        </div>
    </div>

    <!-- Features / Interaction Tracking Showcase -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div data-tour="home-browser-card" class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
            <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg mb-4">
                🌐
            </div>
            <h2 class="text-base font-bold text-slate-900 mb-2">Browser SDK Tracking</h2>
            <p class="text-xs text-slate-600 leading-relaxed mb-4">
                Automatically instruments page views, anonymous session tracking with 30m window, and beacons unsent events on exit.
            </p>
            <button
                onclick="window.analytics && window.analytics.track('feature_card_click', { card: 'browser_sdk' });"
                class="text-xs text-indigo-600 font-semibold hover:underline"
            >
                Test Browser Event &rarr;
            </button>
        </div>

        <div data-tour="home-server-card" class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
            <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-4">
                ⚡
            </div>
            <h2 class="text-base font-bold text-slate-900 mb-2">Server Business Events</h2>
            <p class="text-xs text-slate-600 leading-relaxed mb-4">
                PHP helper instruments high-trust financial & order lifecycle events directly in transactional controllers.
            </p>
            <a href="{{ route('restaurant.order') }}" class="text-xs text-emerald-600 font-semibold hover:underline">
                Create Order Event &rarr;
            </a>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
            <div class="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg mb-4">
                📊
            </div>
            <h2 class="text-base font-bold text-slate-900 mb-2">Real-time Visualization</h2>
            <p class="text-xs text-slate-600 leading-relaxed mb-4">
                Instant dashboard with date-range filters, unique visitor deduplication, popular paths, and volume trends.
            </p>
            <a href="{{ route('dashboard') }}" class="text-xs text-purple-600 font-semibold hover:underline">
                Open Dashboard &rarr;
            </a>
        </div>
    </div>
</div>
@endsection
