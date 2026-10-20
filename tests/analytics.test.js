import { describe, it, expect, beforeEach, vi } from 'vitest';
import Analytics from '../public/js/analytics.js';

describe('Analytics Browser SDK', () => {
    let mockStorage = {};
    let fetchCalls = [];

    beforeEach(() => {
        mockStorage = {};
        fetchCalls = [];

        global.window = {
            localStorage: {
                getItem: (k) => mockStorage[k] || null,
                setItem: (k, v) => { mockStorage[k] = String(v); },
                removeItem: (k) => { delete mockStorage[k]; }
            },
            sessionStorage: {
                getItem: (k) => mockStorage['sess_' + k] || null,
                setItem: (k, v) => { mockStorage['sess_' + k] = String(v); },
                removeItem: (k) => { delete mockStorage['sess_' + k]; }
            },
            location: {
                pathname: '/restaurant/menu',
                href: 'http://localhost/restaurant/menu'
            }
        };

        global.document = {
            title: 'Bella Vista Bistro - Menu',
            referrer: 'http://localhost/restaurant',
            addEventListener: vi.fn(),
            readyState: 'complete'
        };

        global.fetch = vi.fn().mockImplementation((url, opts) => {
            fetchCalls.push({ url, opts });
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
        });
    });

    it('initializes with persistent visitor ID and session ID', () => {
        const client = new Analytics({ autoPageView: false });

        expect(client.visitorId).toBeTruthy();
        expect(client.sessionId).toBeTruthy();
        expect(client.userId).toBeNull();
    });

    it('enqueues custom events with expected schema', () => {
        const client = new Analytics({ autoPageView: false });
        const event = client.track('item_clicked', { item_id: 'pizza_123', price: 14.50 });

        expect(event).toBeDefined();
        expect(event.type).toBe('item_clicked');
        expect(event.source).toBe('browser');
        expect(event.properties.item_id).toBe('pizza_123');
        expect(event.properties.price).toBe(14.50);
        expect(event.session_id).toBe(client.sessionId);
        expect(event.timestamp).toBeDefined();
        expect(client.queue.length).toBe(1);
    });

    it('emits analytics:event window CustomEvent when track is called', () => {
        const dispatchedEvents = [];
        global.window.dispatchEvent = vi.fn((evt) => {
            dispatchedEvents.push(evt);
            return true;
        });

        const client = new Analytics({ autoPageView: false });
        client.track('button_click', { button_name: 'hero_cta' });

        expect(global.window.dispatchEvent).toHaveBeenCalled();
        expect(dispatchedEvents.length).toBe(1);
        expect(dispatchedEvents[0].type).toBe('analytics:event');
        expect(dispatchedEvents[0].detail.type).toBe('button_click');
        expect(dispatchedEvents[0].detail.properties.button_name).toBe('hero_cta');
    });

    it('tracks PageView with document and location metadata', () => {
        const client = new Analytics({ autoPageView: false });
        const pageView = client.trackPageView({ custom_section: 'desserts' });

        expect(pageView.type).toBe('PageView');
        expect(pageView.properties.page_path).toBe('/restaurant/menu');
        expect(pageView.properties.page_title).toBe('Bella Vista Bistro - Menu');
        expect(pageView.properties.custom_section).toBe('desserts');
    });

    it('identifies users and attaches identity to subsequent events', () => {
        const client = new Analytics({ autoPageView: false });
        client.identify('customer_99');

        expect(client.userId).toBe('customer_99');

        const event = client.track('button_clicked');
        expect(event.user_id).toBe('customer_99');
    });

    it('resets user identity and generates fresh visitor and session tokens', () => {
        const client = new Analytics({ autoPageView: false });
        client.identify('customer_99');
        const oldVisitor = client.visitorId;

        client.reset();
        expect(client.userId).toBeNull();
        expect(client.visitorId).toBeTruthy();
    });

    it('flushes batched events via fetch', async () => {
        const client = new Analytics({
            endpoint: '/api/events',
            batchSize: 2,
            autoPageView: false
        });

        client.track('event_one');
        expect(fetchCalls.length).toBe(0);

        // Second event hits batchSize of 2 and triggers immediate flush
        client.track('event_two');

        // Allow microtasks to execute
        await Promise.resolve();

        expect(fetchCalls.length).toBe(1);
        expect(fetchCalls[0].url).toBe('/api/events');

        const body = JSON.parse(fetchCalls[0].opts.body);
        expect(body.events.length).toBe(2);
        expect(body.events[0].type).toBe('event_one');
        expect(body.events[1].type).toBe('event_two');
        expect(client.queue.length).toBe(0);
    });
});
