<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full bg-slate-50">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'Restaurant Demo') }} — Analytics System</title>

    <!-- Browser Analytics SDK (Standalone auto-init script) -->
    <script src="/js/analytics.js"></script>

    <!-- Tailwind & Vite Bundles -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-full flex flex-col font-sans antialiased text-slate-800">
    <!-- Navigation Bar -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
                <div class="flex items-center gap-6">
                    <a href="{{ route('restaurant.home') }}" class="flex items-center gap-2 text-indigo-600 font-extrabold text-lg tracking-tight hover:opacity-90 transition">
                        <span class="text-2xl">🍕</span>
                        <span>Bella Vista Bistro</span>
                    </a>

                    <nav class="hidden md:flex items-center space-x-1 text-sm font-medium">
                        <a href="{{ route('restaurant.home') }}" class="px-3 py-2 rounded-lg transition {{ request()->routeIs('restaurant.home') ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' }}">
                            Home
                        </a>
                        <a href="{{ route('restaurant.menu') }}" data-tour="nav-menu" class="px-3 py-2 rounded-lg transition {{ request()->routeIs('restaurant.menu') ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' }}">
                            Menu
                        </a>
                        <a href="{{ route('restaurant.order') }}" data-tour="nav-order" class="px-3 py-2 rounded-lg transition {{ request()->routeIs('restaurant.order') ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' }}">
                            Order Online
                        </a>
                    </nav>
                </div>

                <div class="flex items-center gap-3">
                    <span data-tour="nav-sdk" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        ● SDK Active
                    </span>
                    <button
                        type="button"
                        onclick="window.startWalkthrough && window.startWalkthrough()"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition shadow-2xs border border-indigo-200"
                        title="Start interactive product tour"
                    >
                        <span>🎓</span>
                        <span class="hidden sm:inline">Tour</span>
                    </button>
                    <a href="{{ route('dashboard') }}" data-tour="nav-dashboard" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm transition">
                        <span>📊 Live Dashboard</span>
                    </a>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        @if(session('success'))
            <div class="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs">
                <div class="flex items-center gap-2">
                    <span class="text-lg">🎉</span>
                    <span>{{ session('success') }}</span>
                </div>
                <a href="{{ route('dashboard') }}" class="underline font-semibold hover:text-emerald-900">View in Dashboard &rarr;</a>
            </div>
        @endif

        @yield('content')
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 mt-auto py-6">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
                Senior Software Engineer Analytics System Demo &bull; Unified Browser &amp; Server Tracking
            </div>
            <div class="flex gap-4">
                <a href="{{ route('restaurant.home') }}" class="hover:underline">Demo App</a>
                <a href="{{ route('dashboard') }}" class="hover:underline">Dashboard</a>
                <a href="/api/analytics/stats" target="_blank" class="hover:underline">API Stats JSON</a>
            </div>
        </div>
    </footer>

    <!-- Overlay Root Containers -->
    <div id="walkthrough-root"></div>
    <div id="telemetry-hud-root"></div>

    @stack('scripts')
</body>
</html>
