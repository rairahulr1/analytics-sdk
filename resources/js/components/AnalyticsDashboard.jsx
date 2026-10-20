import React, { useEffect, useState, useCallback } from 'react';

export default function AnalyticsDashboard() {
    const [rangePreset, setRangePreset] = useState('7d');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [stats, setStats] = useState(null);
    const [recentEvents, setRecentEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Calculate dates based on preset
    useEffect(() => {
        const today = new Date();
        const formatDate = (d) => d.toISOString().split('T')[0];

        if (rangePreset === 'today') {
            setDateFrom(formatDate(today));
            setDateTo(formatDate(today));
        } else if (rangePreset === '7d') {
            const prior = new Date();
            prior.setDate(today.getDate() - 7);
            setDateFrom(formatDate(prior));
            setDateTo(formatDate(today));
        } else if (rangePreset === '30d') {
            const prior = new Date();
            prior.setDate(today.getDate() - 30);
            setDateFrom(formatDate(prior));
            setDateTo(formatDate(today));
        } else if (rangePreset === 'all') {
            setDateFrom('');
            setDateTo('');
        }
    }, [rangePreset]);

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const [statsRes, eventsRes] = await Promise.all([
                fetch(`/api/analytics/stats?${params.toString()}`),
                fetch(`/api/events?${params.toString()}&per_page=15`)
            ]);

            if (!statsRes.ok || !eventsRes.ok) {
                throw new Error('Failed to load analytics data from server');
            }

            const statsJson = await statsRes.json();
            const eventsJson = await eventsRes.json();

            setStats(statsJson);
            setRecentEvents(eventsJson.events || []);
            setError(null);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Analytics load error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchData]);

    // Send a test event directly from dashboard
    const sendTestEvent = async (type) => {
        if (window.analytics) {
            window.analytics.track(type, {
                test: true,
                triggered_from: 'dashboard_ui',
                clicked_at: new Date().toISOString()
            });
            await window.analytics.flush();
            setTimeout(fetchData, 300);
        }
    };

    return (
        <div className="space-y-6 text-slate-800">
            {/* Header & Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Cross-platform event stream (Browser SDK + Server Tracking)
                        {lastUpdated && <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Updated: {lastUpdated}</span>}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1" data-tour="dashboard-date-filter">
                        {[
                            { id: 'today', label: 'Today' },
                            { id: '7d', label: '7 Days' },
                            { id: '30d', label: '30 Days' },
                            { id: 'all', label: 'All' },
                        ].map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setRangePreset(p.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    rangePreset === p.id
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                        <label className="text-slate-500">From:</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setRangePreset('custom'); setDateFrom(e.target.value); }}
                            className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs"
                        />
                        <label className="text-slate-500 ml-1">To:</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setRangePreset('custom'); setDateTo(e.target.value); }}
                            className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs"
                        />
                    </div>

                    <button
                        onClick={fetchData}
                        className="px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
                    >
                        Refresh
                    </button>

                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer ml-2">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Live auto-poll
                    </label>

                    <button
                        type="button"
                        onClick={() => window.startWalkthrough && window.startWalkthrough()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition shadow-2xs border border-indigo-200 ml-1"
                        title="Start interactive product tour"
                    >
                        <span>🎓</span>
                        <span>Guided Tour</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Quick Interactive Testing Bar */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-indigo-900">
                    <span className="font-semibold">Interactive Demo Controls:</span> Test event pipeline directly from this page:
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => sendTestEvent('menu_item_view')}
                        className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-medium transition shadow-sm"
                    >
                        + Track Browser Event
                    </button>
                    <a
                        href="/restaurant/order"
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition shadow-sm inline-flex items-center gap-1"
                    >
                        Go to Restaurant Order Flow →
                    </a>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="dashboard-summary-cards">
                {[
                    {
                        title: 'Total Ingested Events',
                        value: stats?.summary?.total_events ?? (loading ? '...' : 0),
                        badge: 'All Sources',
                        color: 'border-l-indigo-500 text-indigo-600',
                    },
                    {
                        title: 'Page Views',
                        value: stats?.summary?.page_views ?? (loading ? '...' : 0),
                        badge: 'Traffic',
                        color: 'border-l-sky-500 text-sky-600',
                    },
                    {
                        title: 'Unique Visitors',
                        value: stats?.summary?.unique_visitors ?? (loading ? '...' : 0),
                        badge: 'Sessions',
                        color: 'border-l-emerald-500 text-emerald-600',
                    },
                    {
                        title: 'Orders Created',
                        value: stats?.summary?.orders_created ?? (loading ? '...' : 0),
                        badge: 'Server Business',
                        color: 'border-l-amber-500 text-amber-600',
                    },
                ].map((card, idx) => (
                    <div key={idx} className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 p-5 ${card.color}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{card.title}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{card.badge}</span>
                        </div>
                        <div className="text-3xl font-extrabold text-slate-900 mt-3">{card.value}</div>
                    </div>
                ))}
            </div>

            {/* Middle Grid: Popular Pages & Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Popular Pages */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5" data-tour="dashboard-popular-pages">
                    <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
                        <span>Popular Pages</span>
                        <span className="text-xs font-normal text-slate-500">Top Paths</span>
                    </h2>
                    {stats?.popular_pages?.length ? (
                        <div className="space-y-3">
                            {stats.popular_pages.map((p, i) => {
                                const maxViews = stats.popular_pages[0]?.views || 1;
                                const pct = Math.max(10, Math.round((p.views / maxViews) * 100));
                                return (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-xs font-medium text-slate-700">
                                            <span className="truncate max-w-[180px] font-mono text-indigo-700">{p.path}</span>
                                            <span>{p.views} views</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 py-6 text-center">No pageview data in this date range.</p>
                    )}
                </div>

                {/* Event Type & Source Breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5" data-tour="dashboard-event-breakdown">
                    <h2 className="text-base font-bold text-slate-900 mb-3">Event Breakdown</h2>
                    <div className="space-y-3">
                        <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">By Source</span>
                            <div className="mt-2 flex gap-2">
                                {stats?.events_by_source?.map((s, i) => (
                                    <div key={i} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                                        <div className="text-xs font-medium capitalize text-slate-600">{s.source}</div>
                                        <div className="text-lg font-bold text-slate-900 mt-1">{s.count}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">By Type</span>
                            <div className="mt-2 space-y-2 max-h-44 overflow-y-auto pr-1">
                                {stats?.events_by_type?.map((t, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs py-1 px-2 rounded bg-slate-50 border border-slate-100">
                                        <span className="font-mono text-slate-700">{t.type}</span>
                                        <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{t.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Daily Activity Visualizer */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5" data-tour="dashboard-trends-chart">
                    <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
                        <span>Activity Trends</span>
                        <span className="text-xs font-normal text-slate-500">Daily Volume</span>
                    </h2>
                    {stats?.daily_trends?.length ? (
                        <div className="space-y-2">
                            <div className="h-44 flex items-end gap-1.5 pt-4">
                                {stats.daily_trends.map((day, i) => {
                                    const maxVal = Math.max(...stats.daily_trends.map(d => d.total), 1);
                                    const heightPct = Math.max(12, Math.round((day.total / maxVal) * 100));
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                            {/* Tooltip */}
                                            <div className="absolute -top-10 hidden group-hover:block bg-slate-900 text-white text-[10px] rounded px-2 py-1 shadow-lg whitespace-nowrap z-10 pointer-events-none">
                                                {day.date}: {day.total} events ({day.orders} orders)
                                            </div>
                                            <div
                                                className="w-full bg-gradient-to-t from-indigo-600 to-sky-400 rounded-t transition-all group-hover:from-indigo-700"
                                                style={{ height: `${heightPct}%` }}
                                            />
                                            <span className="text-[9px] text-slate-400 truncate w-full text-center">
                                                {day.date.split('-').slice(1).join('/')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                                <span>{stats.daily_trends[0]?.date}</span>
                                <span>{stats.daily_trends[stats.daily_trends.length - 1]?.date}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 py-16 text-center">No trend data available.</p>
                    )}
                </div>
            </div>

            {/* Live Ingested Events Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Recent Ingested Events</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Live audit log from database table</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">Showing {recentEvents.length} events</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                                <th className="py-3 px-4">Event Type</th>
                                <th className="py-3 px-4">Source</th>
                                <th className="py-3 px-4">Session / User</th>
                                <th className="py-3 px-4">Properties</th>
                                <th className="py-3 px-4">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {recentEvents.length ? (
                                recentEvents.map((evt) => (
                                    <tr key={evt.id} className="hover:bg-slate-50 transition">
                                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                                            {evt.type}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                                    evt.source === 'browser'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-emerald-100 text-emerald-700'
                                                }`}
                                            >
                                                {evt.source}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                                            {evt.user_id ? (
                                                <span className="text-indigo-600 font-medium">user:{evt.user_id}</span>
                                            ) : evt.session_id ? (
                                                <span title={evt.session_id}>sess:{evt.session_id.substring(0, 8)}...</span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] max-w-xs truncate text-slate-600" title={JSON.stringify(evt.properties)}>
                                            {JSON.stringify(evt.properties)}
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                            {new Date(evt.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-slate-400">
                                        No events found. Trigger user activity in the demo to populate!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
