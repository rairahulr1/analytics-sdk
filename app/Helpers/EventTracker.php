<?php

namespace App\Helpers;

use App\Models\Event;
use App\Models\Order;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

/**
 * Server-side event tracking helper and service.
 *
 * Can be invoked as an instance method or statically:
 *   EventTracker::track('order_created', ['total' => 19.99]);
 *   EventTracker::trackPageView('/restaurant/menu', 'Menu');
 *   EventTracker::orderCreated($order);
 */
class EventTracker
{
    public function __construct(protected string $source = 'server') {}

    /**
     * Track an event.
     *
     * @param  string  $eventName  The name of the event
     * @param  array<string, mixed>  $properties  Event properties/data
     * @param  string|null  $userId  Optional user ID
     * @param  string|null  $sessionId  Optional session ID
     * @return Event The created event record
     */
    public function track(
        string $eventName,
        array $properties = [],
        ?string $userId = null,
        ?string $sessionId = null
    ): Event {
        $resolvedUserId = $userId ?? (Auth::check() ? (string) Auth::id() : null);
        $resolvedSessionId = $sessionId ?? (session()->isStarted() ? session()->getId() : null);

        return Event::create([
            'type' => $eventName,
            'source' => $this->source,
            'properties' => $properties,
            'user_id' => $resolvedUserId,
            'session_id' => $resolvedSessionId,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }

    /**
     * Track a page view from the server side.
     */
    public function trackPageView(?string $pagePath = null, ?string $pageTitle = null, ?string $userId = null): Event
    {
        $path = $pagePath ?? Request::path();
        $title = $pageTitle ?? ucfirst(trim($path, '/'));

        return $this->track('PageView', [
            'page_path' => '/'.ltrim($path, '/'),
            'page_title' => $title ?: 'Home',
        ], $userId);
    }

    /**
     * Alias for trackPageView to handle both method names safely.
     */
    public function trackPageVisit(?string $url = null, ?string $userId = null): Event
    {
        $path = $url ? (parse_url($url, PHP_URL_PATH) ?? '/') : Request::path();

        return $this->trackPageView($path, null, $userId);
    }

    /**
     * Track an order created event.
     */
    public function orderCreated(Order $order, ?string $userId = null): Event
    {
        $rawItems = $order->items;
        if (is_string($rawItems)) {
            $items = json_decode($rawItems, true) ?? [];
        } elseif (is_array($rawItems)) {
            $items = $rawItems;
        } else {
            $items = [];
        }

        $itemCount = count($items) > 0 ? count($items) : 1;

        return $this->track('order_created', [
            'order_id' => $order->id,
            'customer_name' => $order->customer_name,
            'order_total' => (float) $order->total,
            'item_count' => $itemCount,
            'items' => $items,
            'payment_method' => $order->payment_method,
            'status' => $order->status,
        ], $userId);
    }

    /**
     * Enable calling methods statically on the class directly.
     */
    public static function __callStatic(string $method, array $arguments)
    {
        return app(self::class)->$method(...$arguments);
    }
}
