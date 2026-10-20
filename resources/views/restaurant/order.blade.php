@extends('layouts.app')

@section('content')
<div class="max-w-2xl mx-auto space-y-6">
    <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div class="border-b border-slate-100 pb-4 mb-6">
            <h1 class="text-2xl font-black text-slate-900">Complete Your Order</h1>
            <p class="text-xs text-slate-500 mt-1">
                Submitting this form initiates an end-to-end tracking flow: a browser submission event followed by an authoritative server-side order transaction event.
            </p>
        </div>

        <form action="{{ route('restaurant.orders.store') }}" method="POST" id="checkout-form" data-tour="order-form" class="space-y-5">
            @csrf

            <div>
                <label for="customer_name" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Customer Name *
                </label>
                <input
                    type="text"
                    id="customer_name"
                    name="customer_name"
                    required
                    placeholder="e.g. Sofia Rossi"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Select Items *
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    @foreach([
                        ['Margherita Pizza', 14.50],
                        ['Spaghetti Carbonara', 16.00],
                        ['Truffle Mushroom Risotto', 18.50],
                        ['Classic Tiramisu', 8.50],
                        ['Chianti Classico (Glass)', 9.00],
                        ['San Pellegrino (750ml)', 4.50]
                    ] as $item)
                        <label class="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                name="items[]"
                                value="{{ $item[0] }}"
                                data-price="{{ $item[1] }}"
                                class="item-checkbox rounded text-indigo-600 focus:ring-indigo-500"
                                {{ in_array($item[0], ['Margherita Pizza', 'Classic Tiramisu']) ? 'checked' : '' }}
                            />
                            <span class="flex-1 font-medium text-slate-800">{{ $item[0] }}</span>
                            <span class="text-slate-500 font-semibold">${{ number_format($item[1], 2) }}</span>
                        </label>
                    @endforeach
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="payment_method" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Payment Method
                    </label>
                    <select
                        id="payment_method"
                        name="payment_method"
                        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                        <option value="credit_card">Credit Card (Stripe)</option>
                        <option value="apple_pay">Apple Pay</option>
                        <option value="cash">Cash on Delivery</option>
                    </select>
                </div>

                <div>
                    <label for="total_display" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Total Amount (USD)
                    </label>
                    <input
                        type="text"
                        id="total_display"
                        readonly
                        value="$23.00"
                        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold text-sm"
                    />
                    <input type="hidden" id="total" name="total" value="23.00" />
                </div>
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <a href="{{ route('restaurant.menu') }}" class="text-xs text-slate-500 hover:text-slate-800 font-medium">
                    &larr; Back to Menu
                </a>
                <button
                    type="submit"
                    id="submit-order-btn"
                    data-tour="order-submit-btn"
                    class="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md transition"
                >
                    Confirm &amp; Place Order &rarr;
                </button>
            </div>
        </form>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    const totalDisplay = document.getElementById('total_display');
    const totalInput = document.getElementById('total');
    const form = document.getElementById('checkout-form');

    function calculateTotal() {
        let sum = 0;
        checkboxes.forEach(cb => {
            if (cb.checked) {
                sum += parseFloat(cb.dataset.price || 0);
            }
        });
        totalDisplay.value = '$' + sum.toFixed(2);
        totalInput.value = sum.toFixed(2);
    }

    checkboxes.forEach(cb => cb.addEventListener('change', calculateTotal));
    calculateTotal();

    form.addEventListener('submit', function (e) {
        if (window.analytics) {
            window.analytics.track('checkout_submitted', {
                total: parseFloat(totalInput.value),
                item_count: document.querySelectorAll('.item-checkbox:checked').length,
                payment_method: document.getElementById('payment_method').value
            });
            window.analytics.flush({ sync: true });
        }
    });
});
</script>
@endsection
