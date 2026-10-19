<?php

namespace Tests\Feature;

use App\Facades\EventTracker;
use App\Models\Event;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_browser_can_ingest_single_event(): void
    {
        $response = $this->postJson('/api/events', [
            'type' => 'PageView',
            'source' => 'browser',
            'properties' => ['page_path' => '/restaurant'],
            'session_id' => 'sess_test_123',
        ]);

        $response->assertStatus(201)
            ->assertJson(['status' => 'ok', 'ingested' => 1]);

        $this->assertDatabaseHas('events', [
            'type' => 'PageView',
            'source' => 'browser',
            'session_id' => 'sess_test_123',
        ]);
    }

    public function test_browser_can_ingest_batched_events(): void
    {
        $response = $this->postJson('/api/events', [
            'events' => [
                [
                    'type' => 'PageView',
                    'source' => 'browser',
                    'properties' => ['page_path' => '/restaurant/menu'],
                    'session_id' => 'sess_batch_1',
                ],
                [
                    'type' => 'menu_item_selected',
                    'source' => 'browser',
                    'properties' => ['item_name' => 'Margherita Pizza', 'item_price' => 14.50],
                    'session_id' => 'sess_batch_1',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson(['status' => 'ok', 'ingested' => 2]);

        $this->assertEquals(2, Event::count());
    }

    public function test_ingestion_validates_required_fields(): void
    {
        $response = $this->postJson('/api/events', [
            'properties' => ['foo' => 'bar'],
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure(['errors' => ['type', 'source']]);
    }

    public function test_api_returns_events_with_filtering(): void
    {
        Event::create([
            'type' => 'PageView',
            'source' => 'browser',
            'properties' => ['page_path' => '/home'],
            'session_id' => 'sess_filter',
        ]);

        Event::create([
            'type' => 'order_created',
            'source' => 'server',
            'properties' => ['order_id' => 1],
            'session_id' => 'sess_server',
        ]);

        $response = $this->getJson('/api/events?type=PageView');

        $response->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('events.0.type', 'PageView');
    }

    public function test_analytics_stats_endpoint_aggregates_metrics(): void
    {
        Event::create([
            'type' => 'PageView',
            'source' => 'browser',
            'properties' => ['page_path' => '/restaurant'],
            'session_id' => 'sess_user_a',
        ]);

        Event::create([
            'type' => 'PageView',
            'source' => 'browser',
            'properties' => ['page_path' => '/restaurant'],
            'session_id' => 'sess_user_b',
        ]);

        Event::create([
            'type' => 'order_created',
            'source' => 'server',
            'properties' => ['order_id' => 99, 'order_total' => 45.00],
            'session_id' => 'sess_user_a',
        ]);

        $response = $this->getJson('/api/analytics/stats');

        $response->assertStatus(200)
            ->assertJsonPath('summary.total_events', 3)
            ->assertJsonPath('summary.page_views', 2)
            ->assertJsonPath('summary.unique_visitors', 2)
            ->assertJsonPath('summary.orders_created', 1)
            ->assertJsonPath('popular_pages.0.path', '/restaurant')
            ->assertJsonPath('popular_pages.0.views', 2);
    }

    public function test_server_event_tracker_records_events(): void
    {
        $event = EventTracker::track('custom_server_event', ['key' => 'val'], 'user_42');

        $this->assertInstanceOf(Event::class, $event);
        $this->assertEquals('custom_server_event', $event->type);
        $this->assertEquals('server', $event->source);
        $this->assertEquals('user_42', $event->user_id);
    }

    public function test_restaurant_pages_render_and_record_pageviews(): void
    {
        $resHome = $this->get('/restaurant');
        $resHome->assertStatus(200)->assertSee('Bella Vista Bistro');

        $resMenu = $this->get('/restaurant/menu');
        $resMenu->assertStatus(200)->assertSee('Margherita Pizza');

        $resOrder = $this->get('/restaurant/order');
        $resOrder->assertStatus(200)->assertSee('Complete Your Order');

        // Check that server-side tracking recorded the pageviews
        $this->assertEquals(3, Event::where('source', 'server')->where('type', 'PageView')->count());
    }

    public function test_order_creation_creates_order_and_triggers_server_tracking(): void
    {
        $response = $this->post('/restaurant/orders', [
            'customer_name' => 'Marco Polo',
            'items' => ['Margherita Pizza', 'Classic Tiramisu'],
            'total' => 23.00,
            'payment_method' => 'credit_card',
        ]);

        $response->assertStatus(302)
            ->assertSessionHas('success');

        $this->assertDatabaseHas('orders', [
            'customer_name' => 'Marco Polo',
            'status' => 'confirmed',
        ]);

        $this->assertDatabaseHas('events', [
            'type' => 'order_created',
            'source' => 'server',
        ]);
    }

    public function test_database_seeder_is_idempotent(): void
    {
        $seeder = new DatabaseSeeder;

        // First run
        $seeder->run();
        $firstCount = Event::count();
        $this->assertGreaterThan(0, $firstCount);

        // Second run should be no-op without error
        $seeder->run();
        $secondCount = Event::count();
        $this->assertEquals($firstCount, $secondCount);
    }
}
