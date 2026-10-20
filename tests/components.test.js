import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import LiveTelemetryHud from '../resources/js/components/LiveTelemetryHud.jsx';
import WalkthroughTour from '../resources/js/components/WalkthroughTour.jsx';

describe('UI/UX Components Render', () => {
    let mockStorage = {};

    beforeEach(() => {
        mockStorage = {};
        global.localStorage = {
            getItem: (k) => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = String(v); },
            removeItem: (k) => { delete mockStorage[k]; }
        };
        global.sessionStorage = {
            getItem: (k) => mockStorage['sess_' + k] || null,
            setItem: (k, v) => { mockStorage['sess_' + k] = String(v); },
            removeItem: (k) => { delete mockStorage['sess_' + k]; }
        };
        global.window = {
            localStorage: global.localStorage,
            sessionStorage: global.sessionStorage,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            location: { pathname: '/restaurant' }
        };
        global.fetch = vi.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ events: [] })
            })
        );
    });

    it('renders LiveTelemetryHud collapsed badge by default without crashing', () => {
        const html = renderToString(React.createElement(LiveTelemetryHud));
        expect(html).toContain('Telemetry HUD');
        expect(html).toContain('captured');
    });

    it('renders LiveTelemetryHud expanded view when storage indicates expanded', () => {
        mockStorage['analytics_telemetry_hud_expanded'] = 'true';
        const html = renderToString(React.createElement(LiveTelemetryHud));
        expect(html).toContain('Telemetry HUD');
        expect(html).toContain('Simulate');
        expect(html).toContain('Clear');
    });

    it('renders WalkthroughTour trigger button without crashing', () => {
        const html = renderToString(React.createElement(WalkthroughTour));
        expect(html).toContain('Quick Tour');
        expect(html).toContain('4 steps');
    });
});
