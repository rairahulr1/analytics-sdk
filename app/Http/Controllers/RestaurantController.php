<?php

namespace App\Http\Controllers;

use App\Facades\EventTracker;
use App\Models\Order;
use Illuminate\Http\Request;

class RestaurantController extends Controller
{
    /**
     * Show the restaurant home page.
     */
    public function index()
    {
        EventTracker::trackPageView('/restaurant', 'Restaurant Home');

        return view('restaurant.home');
    }

    /**
     * Show the menu page.
     */
    public function menu()
    {
        EventTracker::trackPageView('/restaurant/menu', 'Menu');

        return view('restaurant.menu');
    }

    /**
     * Show the ordering page.
     */
    public function order()
    {
        EventTracker::trackPageView('/restaurant/order', 'Place Order');

        return view('restaurant.order');
    }

    /**
     * Create an order.
     */
    public function createOrder(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:255'],
            'items' => ['required'],
            'total' => ['required', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'string', 'max:50'],
        ]);

        $items = is_array($validated['items']) ? $validated['items'] : json_decode($validated['items'], true);
        if (! is_array($items)) {
            $items = [$validated['items']];
        }

        $order = Order::create([
            'customer_name' => $validated['customer_name'],
            'items' => $items,
            'total' => $validated['total'],
            'payment_method' => $validated['payment_method'] ?? 'cash',
            'status' => 'confirmed',
        ]);

        // Track server-side business event via Facade
        EventTracker::orderCreated($order, auth()->id());

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'status' => 'success',
                'message' => 'Order created successfully!',
                'order_id' => $order->id,
                'order' => $order,
            ], 201);
        }

        return redirect()->back()->with('success', 'Order #'.$order->id.' created successfully!');
    }
}
