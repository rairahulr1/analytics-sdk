<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database idempotently.
     */
    public function run(): void
    {
        // 1. Idempotent User Seeding
        $user = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => bcrypt('password'),
                'email_verified_at' => now(),
            ]
        );

        // 2. Check if events already seeded
        if (Event::count() > 0) {
            $this->command?->info('Database already contains analytics events. Skipping seed.');

            return;
        }

        $this->command?->info('Seeding realistic 7-day analytics event stream...');

        $now = now();
        $samplePages = [
            ['path' => '/restaurant', 'title' => 'Restaurant Home'],
            ['path' => '/restaurant/menu', 'title' => 'Menu'],
            ['path' => '/restaurant/order', 'title' => 'Place Order'],
            ['path' => '/dashboard', 'title' => 'Analytics Dashboard'],
        ];

        $sessions = [];
        for ($s = 0; $s < 12; $s++) {
            $sessions[] = 'sess_'.Str::random(16);
        }

        $events = [];

        // Generate events spanning the last 7 days
        for ($daysAgo = 6; $daysAgo >= 0; $daysAgo--) {
            $dayDate = (clone $now)->subDays($daysAgo);
            $dailyVolume = rand(15, 30);

            for ($i = 0; $i < $dailyVolume; $i++) {
                $eventTime = (clone $dayDate)
                    ->setHour(rand(9, 22))
                    ->setMinute(rand(0, 59))
                    ->setSecond(rand(0, 59));

                $page = $samplePages[array_rand($samplePages)];
                $session = $sessions[array_rand($sessions)];

                // Browser PageView
                $events[] = [
                    'type' => 'PageView',
                    'source' => 'browser',
                    'properties' => json_encode([
                        'page_path' => $page['path'],
                        'page_title' => $page['title'],
                        'referrer' => $page['path'] === '/restaurant' ? 'https://google.com' : 'http://localhost/restaurant',
                    ]),
                    'user_id' => rand(0, 1) ? (string) $user->id : null,
                    'session_id' => $session,
                    'ip_address' => '192.168.1.'.rand(2, 50),
                    'user_agent' => 'Mozilla/5.0 (X11; Linux x86_64)',
                    'created_at' => $eventTime,
                    'updated_at' => $eventTime,
                ];

                // Random custom browser events
                if (rand(1, 10) > 6) {
                    $events[] = [
                        'type' => 'menu_item_selected',
                        'source' => 'browser',
                        'properties' => json_encode([
                            'item_name' => 'Margherita Pizza',
                            'item_price' => 14.50,
                            'currency' => 'USD',
                        ]),
                        'user_id' => null,
                        'session_id' => $session,
                        'ip_address' => '192.168.1.'.rand(2, 50),
                        'user_agent' => 'Mozilla/5.0 (X11; Linux x86_64)',
                        'created_at' => (clone $eventTime)->addSeconds(20),
                        'updated_at' => (clone $eventTime)->addSeconds(20),
                    ];
                }
            }

            // Seed 1-3 orders per day with matching server events
            $ordersToCreate = rand(1, 3);
            for ($o = 0; $o < $ordersToCreate; $o++) {
                $orderTime = (clone $dayDate)->setHour(rand(12, 21))->setMinute(rand(0, 59));
                $orderTotal = rand(22, 65) + 0.99;

                $order = Order::create([
                    'customer_name' => 'Customer '.Str::random(5),
                    'items' => ['Margherita Pizza', 'Classic Tiramisu'],
                    'total' => $orderTotal,
                    'payment_method' => rand(0, 1) ? 'credit_card' : 'cash',
                    'status' => 'confirmed',
                    'created_at' => $orderTime,
                    'updated_at' => $orderTime,
                ]);

                $events[] = [
                    'type' => 'order_created',
                    'source' => 'server',
                    'properties' => json_encode([
                        'order_id' => $order->id,
                        'customer_name' => $order->customer_name,
                        'order_total' => (float) $order->total,
                        'item_count' => 2,
                        'items' => $order->items,
                        'payment_method' => $order->payment_method,
                    ]),
                    'user_id' => (string) $user->id,
                    'session_id' => $sessions[array_rand($sessions)],
                    'ip_address' => '127.0.0.1',
                    'user_agent' => 'Laravel Server/PHP 8.4',
                    'created_at' => $orderTime,
                    'updated_at' => $orderTime,
                ];
            }
        }

        Event::insert($events);
        $this->command?->info('Seeded '.count($events).' analytics events.');
    }
}
