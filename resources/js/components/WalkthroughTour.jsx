import React, { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_SEEN = 'analytics_demo_walkthrough_seen';
const STORAGE_KEY_STEP = 'analytics_demo_walkthrough_step';

const TOUR_STEPS = [
    {
        id: 'welcome',
        badge: 'Step 1 of 4 • Welcome & Overview',
        icon: '🚀',
        route: '/restaurant',
        title: 'Welcome to Bella Vista Bistro Analytics Demo',
        subtitle: 'A dual browser & server telemetry pipeline',
        description:
            'Explore an enterprise-ready analytics infrastructure that merges a zero-dependency client SDK with an authoritative server-side tracking facade on Laravel 12. Experience unified tracking from customer browsing to backend checkout transactions.',
        highlights: [
            { icon: '🌐', label: 'Client Telemetry', text: 'Auto PageViews, user interaction tracking, session management, and beacon exit flush.' },
            { icon: '⚙️', label: 'Server-Side Facade', text: 'Authoritative backend event capture for orders & business transactions with zero data loss.' },
            { icon: '📊', label: 'Live Dashboard', text: 'Real-time telemetry HUD and dashboard aggregating unique visitors, trends, and event streams.' }
        ]
    },
    {
        id: 'browser-tracking',
        badge: 'Step 2 of 4 • Client Tracking',
        icon: '🍕',
        route: '/restaurant/menu',
        title: 'Client-Side Browser Tracking',
        subtitle: 'Visit Menu to see client-side auto-tracking & user interaction capture in action',
        description:
            'Head to the Menu page to see our lightweight Browser SDK capture customer interactions in real time. Clicking item selections or browsing dishes triggers non-blocking telemetry events enriched with pricing, currency, and session IDs.',
        highlights: [
            { icon: '🎯', label: 'Zero-Latency Tracking', text: 'Events are queued in memory and batched to prevent UI jank or network congestion.' },
            { icon: '📡', label: 'Telemetry HUD', text: 'Watch the live HUD at the bottom-right update instantaneously whenever you interact with dishes.' },
            { icon: '🍪', label: 'Session Management', text: 'Tracks anonymous visitors across pages with a rolling 30-minute session window.' }
        ]
    },
    {
        id: 'server-telemetry',
        badge: 'Step 3 of 4 • Server Telemetry',
        icon: '📦',
        route: '/restaurant/order',
        title: 'Order Flow & Server Telemetry',
        subtitle: 'Placing an order triggers backend EventTracker facade on Laravel',
        description:
            'Critical revenue events should never depend exclusively on client-side beacons. When you place an order, the controller validates inputs, persists the order, and immediately invokes the server-side EventTracker facade.',
        highlights: [
            { icon: '🔒', label: 'Authoritative Accuracy', text: 'Server events cannot be bypassed or blocked by ad blockers or network dropouts.' },
            { icon: '🔗', label: 'Identity Stitching', text: 'Associates authenticated user IDs and browser session IDs for an end-to-end audit trail.' },
            { icon: '⚡', label: 'Facade API', text: 'Clean syntax: EventTracker::orderCreated($order, auth()->id()) triggers database ingestion.' }
        ]
    },
    {
        id: 'realtime-dashboard',
        badge: 'Step 4 of 4 • Observability',
        icon: '📊',
        route: '/dashboard',
        title: 'Real-time Live Dashboard',
        subtitle: 'Switch to Live Dashboard to view aggregations, unique visitors, popular pages & daily trends',
        description:
            'Switch to the Live Dashboard to inspect the unified aggregation engine. Visualize combined client and server events, visitor retention, top requested menu items, and daily throughput with auto-refreshing metrics.',
        highlights: [
            { icon: '📈', label: 'Key KPIs', text: 'Live counter of Total Events, Page Views, Unique Visitors, and Orders Created.' },
            { icon: '🔍', label: 'Deep Inspection', text: 'Filter by date range, inspect raw JSON payloads, and test live event simulation.' },
            { icon: '🔄', label: 'Dynamic Sync', text: 'Automatic polling keeps metrics synced with real-time restaurant activity.' }
        ]
    }
];

export default function WalkthroughTour() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const openTour = useCallback((stepIndex = 0) => {
        setCurrentStep(typeof stepIndex === 'number' ? stepIndex : 0);
        setIsOpen(true);
    }, []);

    // Expose global starter function for navbar button or dashboard button
    useEffect(() => {
        window.startWalkthrough = (idx = 0) => openTour(idx);
        return () => {
            delete window.startWalkthrough;
        };
    }, [openTour]);

    // Initialize state on mount
    useEffect(() => {
        try {
            const hasSeen = localStorage.getItem(STORAGE_KEY_SEEN) === 'true';
            const pendingStep = sessionStorage.getItem(STORAGE_KEY_STEP);

            if (pendingStep !== null) {
                const parsedStep = parseInt(pendingStep, 10);
                if (!isNaN(parsedStep) && parsedStep >= 0 && parsedStep < TOUR_STEPS.length) {
                    setCurrentStep(parsedStep);
                    setIsOpen(true);
                    sessionStorage.removeItem(STORAGE_KEY_STEP);
                    return;
                }
            }

            // If first time visitor, trigger tour with smooth delay
            if (!hasSeen) {
                const timer = setTimeout(() => {
                    setIsOpen(true);
                }, 500);
                return () => clearTimeout(timer);
            }
        } catch (e) {}
    }, []);

    const closeTour = useCallback((markSeen = true) => {
        setIsOpen(false);
        if (markSeen) {
            try {
                localStorage.setItem(STORAGE_KEY_SEEN, 'true');
                sessionStorage.removeItem(STORAGE_KEY_STEP);
            } catch (e) {}
        }
    }, []);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            closeTour(true);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Keyboard navigation (Escape to close, Left/Right arrows to step)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeTour(true);
            } else if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentStep]);

    const step = TOUR_STEPS[currentStep];

    const currentPath = typeof window !== 'undefined' && window.location ? window.location.pathname : '';
    const isCurrentPage = currentPath === step.route || (step.route !== '/' && currentPath.startsWith(step.route));

    const handleTakeMeThere = () => {
        if (isCurrentPage) return;

        try {
            // Save current step so the tour resumes upon arriving at the target route
            sessionStorage.setItem(STORAGE_KEY_STEP, String(currentStep));
        } catch (e) {}

        window.location.href = step.route;
    };

    return (
        <>
            {/* Floating Persistent Trigger Button */}
            <div className="fixed bottom-4 left-4 z-40 select-none">
                <button
                    type="button"
                    onClick={() => openTour(0)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 text-xs font-bold shadow-xl border border-slate-200 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group"
                    title="Launch Guided Walkthrough Tour"
                >
                    <span className="text-base group-hover:rotate-12 transition-transform">✨</span>
                    <span className="tracking-tight">Quick Tour</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-[10px] text-indigo-600 font-mono">
                        4 steps
                    </span>
                </button>
            </div>

            {/* Guided Tour Modal Dialog */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="walkthrough-title"
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col transform transition-all duration-300 animate-in fade-in zoom-in-95"
                        style={{ boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05)' }}
                    >
                        {/* Top Step Header Bar */}
                        <div className="px-6 pt-5 pb-3 bg-gradient-to-r from-indigo-50/80 via-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                                    {step.badge}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => closeTour(true)}
                                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                    aria-label="Close tour"
                                    title="Close Tour (Esc)"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-5 space-y-4">
                            <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                                    {step.icon}
                                </div>
                                <div className="space-y-1">
                                    <h2 id="walkthrough-title" className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                                        {step.title}
                                    </h2>
                                    <p className="text-xs font-semibold text-indigo-600">
                                        {step.subtitle}
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                                {step.description}
                            </p>

                            {/* Feature bullet list */}
                            <div className="space-y-2 pt-1">
                                {step.highlights.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                                    >
                                        <span className="text-sm shrink-0">{item.icon}</span>
                                        <div className="space-y-0.5">
                                            <strong className="font-bold text-slate-800">{item.label}:</strong>{' '}
                                            <span className="text-slate-600">{item.text}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            {/* Progress Dots Indicator */}
                            <div className="flex items-center gap-1.5 order-2 sm:order-1">
                                {TOUR_STEPS.map((s, idx) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setCurrentStep(idx)}
                                        aria-label={`Jump to step ${idx + 1}`}
                                        className={`transition-all duration-200 h-2 rounded-full cursor-pointer ${
                                            idx === currentStep
                                                ? 'w-6 bg-indigo-600'
                                                : 'w-2 bg-slate-300 hover:bg-slate-400'
                                        }`}
                                    />
                                ))}
                                <span className="ml-2 text-[11px] font-medium text-slate-400">
                                    {currentStep + 1} of {TOUR_STEPS.length}
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
                                <button
                                    type="button"
                                    onClick={() => closeTour(true)}
                                    className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl transition cursor-pointer"
                                >
                                    Skip Tour
                                </button>

                                {currentStep > 0 && (
                                    <button
                                        type="button"
                                        onClick={handlePrev}
                                        className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition cursor-pointer"
                                    >
                                        &larr; Prev
                                    </button>
                                )}

                                {!isCurrentPage && (
                                    <button
                                        type="button"
                                        onClick={handleTakeMeThere}
                                        className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer flex items-center gap-1"
                                        title={`Go to ${step.route}`}
                                    >
                                        <span>Take Me There</span>
                                        <span>&nearr;</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1"
                                >
                                    <span>{currentStep === TOUR_STEPS.length - 1 ? 'Finish & Explore' : 'Next'}</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
