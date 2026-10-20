import React, { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY_EXPANDED = 'analytics_telemetry_hud_expanded';
const STORAGE_KEY_EVENTS = 'analytics_telemetry_hud_events';
const MAX_FEED_ITEMS = 8;
const MAX_STORED_EVENTS = 20;

export default function LiveTelemetryHud() {
    const [isExpanded, setIsExpanded] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_EXPANDED) === 'true';
        } catch (e) {
            return false;
        }
    });

    const [events, setEvents] = useState(() => {
        try {
            const cached = sessionStorage.getItem(STORAGE_KEY_EVENTS);
            return cached ? JSON.parse(cached) : [];
        } catch (e) {
            return [];
        }
    });

    const [expandedEventId, setExpandedEventId] = useState(null);
    const [hasNewPulse, setHasNewPulse] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [simulating, setSimulating] = useState(false);

    // Save expanded state to localStorage
    const toggleExpanded = (val) => {
        const next = typeof val === 'boolean' ? val : !isExpanded;
        setIsExpanded(next);
        try {
            localStorage.setItem(STORAGE_KEY_EXPANDED, String(next));
        } catch (e) {}
    };

    // Save recent events to sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events.slice(0, MAX_STORED_EVENTS)));
        } catch (e) {}
    }, [events]);

    // Initial fetch of recent events from backend if state is empty
    useEffect(() => {
        if (events.length > 0) return;

        let isMounted = true;
        fetch('/api/events?per_page=5')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (isMounted && data && Array.isArray(data.events) && data.events.length > 0) {
                    const formatted = data.events.map((evt) => ({
                        id: evt.id || `evt_${Math.random().toString(36).substring(2, 9)}`,
                        type: evt.type,
                        source: evt.source || 'server',
                        properties: typeof evt.properties === 'object' && evt.properties !== null
                            ? evt.properties
                            : {},
                        user_id: evt.user_id || null,
                        session_id: evt.session_id || null,
                        timestamp: evt.created_at || new Date().toISOString()
                    }));
                    setEvents(formatted);
                }
            })
            .catch(() => {});

        return () => {
            isMounted = false;
        };
    }, []);

    // Listen to analytics:event CustomEvent emitted on window
    useEffect(() => {
        const handleCustomEvent = (e) => {
            if (!e || !e.detail) return;
            const detail = e.detail;

            const newEvent = {
                id: detail.id || (typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `hud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
                type: detail.type || 'unknown_event',
                source: detail.source || 'browser',
                properties: detail.properties || {},
                user_id: detail.user_id || null,
                session_id: detail.session_id || null,
                timestamp: detail.timestamp || new Date().toISOString()
            };

            setEvents((prev) => [newEvent, ...prev].slice(0, MAX_STORED_EVENTS));
            setHasNewPulse(true);
            setTimeout(() => setHasNewPulse(false), 1200);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('analytics:event', handleCustomEvent);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('analytics:event', handleCustomEvent);
            }
        };
    }, []);

    // Simulate realistic browser or server events
    const simulateEvent = async () => {
        if (simulating) return;
        setSimulating(true);

        const simulations = [
            {
                source: 'browser',
                type: 'menu_item_selected',
                properties: {
                    item_name: 'Truffle Mushroom Risotto',
                    category: 'Pasta & Risotto',
                    price: 18.5,
                    currency: 'USD',
                    trigger: 'telemetry_hud_simulate'
                }
            },
            {
                source: 'browser',
                type: 'add_to_cart',
                properties: {
                    item_id: 'pizza_truffle_01',
                    item_name: 'Wood-fired Truffle Pizza',
                    quantity: 1,
                    price: 21.0,
                    source_ui: 'quick_add'
                }
            },
            {
                source: 'server',
                type: 'order_created',
                properties: {
                    order_id: Math.floor(1000 + Math.random() * 9000),
                    total: 39.5,
                    items_count: 2,
                    payment_status: 'authorized',
                    service: 'OrderService@dispatch'
                }
            },
            {
                source: 'browser',
                type: 'promo_applied',
                properties: {
                    code: 'BELLA2026',
                    discount_rate: '15%',
                    campaign: 'SummerFest'
                }
            },
            {
                source: 'server',
                type: 'receipt_emailed',
                properties: {
                    recipient_masked: 'c***r@bistrodining.com',
                    template: 'order_confirmation_v2',
                    delivered_ms: 184
                }
            }
        ];

        const pick = simulations[Math.floor(Math.random() * simulations.length)];

        try {
            if (pick.source === 'browser' && window.analytics && typeof window.analytics.track === 'function') {
                // This automatically triggers the window CustomEvent via our updated Analytics SDK
                window.analytics.track(pick.type, pick.properties);
            } else {
                // Server or fallback simulation: post to /api/events and emit CustomEvent
                const payload = {
                    type: pick.type,
                    source: pick.source,
                    properties: pick.properties,
                    session_id: window.analytics?.sessionId || 'sess_sim_' + Math.random().toString(36).substring(2, 7),
                    timestamp: new Date().toISOString()
                };

                // Emit CustomEvent for immediate HUD feedback
                if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('analytics:event', { detail: payload }));
                }

                // Also persist to API
                await fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(payload)
                }).catch(() => {});
            }
        } finally {
            setTimeout(() => setSimulating(false), 300);
        }
    };

    const clearEvents = () => {
        setEvents([]);
        setExpandedEventId(null);
        try {
            sessionStorage.removeItem(STORAGE_KEY_EVENTS);
        } catch (e) {}
    };

    const copyJson = (e, evt) => {
        e.stopPropagation();
        const json = JSON.stringify(evt, null, 2);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(json).then(() => {
                setCopiedId(evt.id);
                setTimeout(() => setCopiedId(null), 1500);
            });
        }
    };

    const formatTime = (ts) => {
        try {
            const date = new Date(ts);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch (e) {
            return '';
        }
    };

    const displayedEvents = useMemo(() => events.slice(0, MAX_FEED_ITEMS), [events]);

    const browserCount = useMemo(() => events.filter((e) => e.source === 'browser').length, [events]);
    const serverCount = useMemo(() => events.filter((e) => e.source === 'server').length, [events]);

    // Collapsed Badge
    if (!isExpanded) {
        return (
            <div className="fixed bottom-4 right-4 z-50 select-none">
                <button
                    type="button"
                    onClick={() => toggleExpanded(true)}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-950/90 hover:bg-slate-900 text-white shadow-2xl border border-slate-700/80 backdrop-blur-md transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] group cursor-pointer"
                    title="Open Real-time Telemetry HUD"
                >
                    <span className="relative flex h-2.5 w-2.5">
                        <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                hasNewPulse ? 'bg-cyan-400' : 'bg-emerald-400'
                            }`}
                        />
                        <span
                            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                hasNewPulse ? 'bg-cyan-400' : 'bg-emerald-500'
                            }`}
                        />
                    </span>
                    <span className="font-bold text-xs tracking-tight text-slate-100">
                        Telemetry HUD{' '}
                        <span className="text-slate-400 font-normal">
                            ({events.length} {events.length === 1 ? 'event' : 'events'} captured)
                        </span>
                    </span>
                    <span className="text-slate-400 group-hover:text-slate-200 transition-transform group-hover:-translate-y-0.5 text-xs font-mono ml-0.5">
                        ▲
                    </span>
                </button>
            </div>
        );
    }

    // Expanded HUD Window
    return (
        <div
            className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-slate-950/95 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-300 max-h-[85vh] text-xs font-sans"
            style={{ boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.7), 0 0 20px 0 rgba(79, 70, 229, 0.15)' }}
        >
            {/* Header */}
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <h3 className="font-extrabold text-slate-100 tracking-tight text-xs flex items-center gap-1.5">
                        <span>📡</span>
                        <span>Telemetry HUD</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
                        {events.length} captured
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={simulateEvent}
                        disabled={simulating}
                        className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Simulate client or server analytics event"
                    >
                        <span>⚡</span>
                        <span>{simulating ? 'Sending...' : 'Simulate'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={clearEvents}
                        disabled={events.length === 0}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white font-medium text-[11px] transition cursor-pointer"
                        title="Clear captured events"
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleExpanded(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
                        title="Minimize HUD"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Sub-bar: source stats & dashboard shortcut */}
            <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span>Browser: <strong className="text-cyan-300 font-mono">{browserCount}</strong></span>
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Server: <strong className="text-emerald-300 font-mono">{serverCount}</strong></span>
                    </span>
                </div>
                <a
                    href="/dashboard"
                    className="text-indigo-400 hover:text-indigo-300 font-medium underline flex items-center gap-0.5"
                >
                    <span>Dashboard &rarr;</span>
                </a>
            </div>

            {/* Event Feed Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 max-h-[50vh] p-2 space-y-1.5">
                {displayedEvents.length === 0 ? (
                    <div className="py-8 px-4 text-center text-slate-400 space-y-2">
                        <div className="text-2xl">⏳</div>
                        <p className="font-medium text-xs text-slate-300">No events captured yet</p>
                        <p className="text-[11px] text-slate-400">
                            Navigate the menu, order food, or click <span className="text-indigo-400 font-semibold">Simulate</span> above.
                        </p>
                    </div>
                ) : (
                    displayedEvents.map((evt, idx) => {
                        const isSelected = expandedEventId === evt.id;
                        const isBrowser = evt.source === 'browser';

                        return (
                            <div
                                key={evt.id || idx}
                                className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                                    isSelected
                                        ? 'bg-slate-900 border-indigo-500/50 shadow-md'
                                        : 'bg-slate-900/60 border-slate-800/60 hover:bg-slate-900 hover:border-slate-700'
                                }`}
                            >
                                {/* Event Summary Row */}
                                <div
                                    onClick={() => setExpandedEventId(isSelected ? null : evt.id)}
                                    className="px-3 py-2 flex items-center justify-between gap-2 cursor-pointer select-none"
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span
                                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase ${
                                                isBrowser
                                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            }`}
                                        >
                                            {evt.source}
                                        </span>
                                        <span className="font-mono font-bold text-slate-200 truncate text-[11px]">
                                            {evt.type}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                                        <time className="text-[10px] font-mono text-slate-400">
                                            {formatTime(evt.timestamp)}
                                        </time>
                                        <span
                                            className={`transform transition-transform text-[10px] ${
                                                isSelected ? 'rotate-180 text-indigo-400' : 'text-slate-400'
                                            }`}
                                        >
                                            ▼
                                        </span>
                                    </div>
                                </div>

                                {/* Expandable JSON Payload */}
                                {isSelected && (
                                    <div className="px-3 pb-3 pt-1 border-t border-slate-800 bg-slate-950/80">
                                        <div className="flex items-center justify-between pb-1.5 text-[10px] text-slate-400">
                                            <span className="font-mono">Payload Details</span>
                                            <button
                                                type="button"
                                                onClick={(e) => copyJson(e, evt)}
                                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[10px] transition cursor-pointer"
                                            >
                                                {copiedId === evt.id ? '✓ Copied' : 'Copy JSON'}
                                            </button>
                                        </div>
                                        <pre className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-40">
                                            {JSON.stringify(
                                                {
                                                    type: evt.type,
                                                    source: evt.source,
                                                    properties: evt.properties,
                                                    session_id: evt.session_id,
                                                    user_id: evt.user_id,
                                                    timestamp: evt.timestamp
                                                },
                                                null,
                                                2
                                            )}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer status notice */}
            <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Listening on <code className="text-indigo-400">analytics:event</code></span>
                <span className="text-slate-400">Showing last {Math.min(displayedEvents.length, MAX_FEED_ITEMS)}</span>
            </div>
        </div>
    );
}
