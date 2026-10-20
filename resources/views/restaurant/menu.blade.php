@extends('layouts.app')

@section('content')
<div class="space-y-6">
    <div data-tour="menu-header" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
            <h1 class="text-2xl font-black text-slate-900">Our Seasonal Menu</h1>
            <p class="text-xs text-slate-500 mt-1">Clicking "Select" tracks browser events with item properties in real time.</p>
        </div>
        <a href="{{ route('restaurant.order') }}" class="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-sm transition">
            Proceed to Checkout &rarr;
        </a>
    </div>

    <!-- Menu Sections -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Main Courses -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 class="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span>🍕</span>
                <span>Pizzas &amp; Pastas</span>
            </h2>

            <div class="space-y-4">
                @foreach([
                    ['Margherita Pizza', 'San Marzano tomatoes, fresh buffalo mozzarella, fresh basil', '14.50'],
                    ['Spaghetti Carbonara', 'Guanciale, Pecorino Romano, egg yolk, freshly cracked black pepper', '16.00'],
                    ['Truffle Mushroom Risotto', 'Arborio rice, wild forest mushrooms, black truffle butter, parmesan', '18.50'],
                    ['Wood-fired Lasagna', 'Slow-cooked Bolognese beef ragù, béchamel, golden mozzarella', '17.00']
                ] as $item)
                    <div class="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                        <div class="flex-1">
                            <div class="flex items-baseline justify-between">
                                <h3 class="text-sm font-bold text-slate-900">{{ $item[0] }}</h3>
                                <span class="text-sm font-semibold text-indigo-600">${{ $item[2] }}</span>
                            </div>
                            <p class="text-xs text-slate-500 mt-1">{{ $item[1] }}</p>
                        </div>
                        <button
                            type="button"
                            @if($loop->first) data-tour="menu-select-btn" @endif
                            onclick="trackMenuItem('{{ $item[0] }}', {{ $item[2] }})"
                            class="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-semibold rounded-lg text-slate-700 transition"
                        >
                            + Select
                        </button>
                    </div>
                @endforeach
            </div>
        </div>

        <!-- Beverages & Desserts -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 class="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span>🍷</span>
                <span>Beverages &amp; Desserts</span>
            </h2>

            <div class="space-y-4">
                @foreach([
                    ['Classic Tiramisu', 'Espresso-soaked ladyfingers, rich mascarpone mousse, cocoa powder', '8.50'],
                    ['Chianti Classico DOCG (Glass)', 'Dry red wine with notes of red cherries and violet from Tuscany', '9.00'],
                    ['San Pellegrino Sparkling Water', 'Natural sparkling mineral water (750ml)', '4.50'],
                    ['Artisanal Espresso', 'Double shot of single-origin Arabica roast', '3.50']
                ] as $item)
                    <div class="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                        <div class="flex-1">
                            <div class="flex items-baseline justify-between">
                                <h3 class="text-sm font-bold text-slate-900">{{ $item[0] }}</h3>
                                <span class="text-sm font-semibold text-indigo-600">${{ $item[2] }}</span>
                            </div>
                            <p class="text-xs text-slate-500 mt-1">{{ $item[1] }}</p>
                        </div>
                        <button
                            type="button"
                            onclick="trackMenuItem('{{ $item[0] }}', {{ $item[2] }})"
                            class="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-semibold rounded-lg text-slate-700 transition"
                        >
                            + Select
                        </button>
                    </div>
                @endforeach
            </div>
        </div>
    </div>
</div>

<script>
function trackMenuItem(name, price) {
    if (window.analytics) {
        window.analytics.track('menu_item_selected', {
            item_name: name,
            item_price: price,
            currency: 'USD'
        });
    }
}
</script>
@endsection
