/**
 * Lightweight Zero-Dependency Analytics Browser SDK (ES Module)
 * Features:
 *  - Persistent Anonymous Visitor ID (localStorage)
 *  - Inactivity-aware Session Management (sessionStorage with 30m rolling window)
 *  - Event Queueing & Batched Dispatch
 *  - Window CustomEvent dispatch ('analytics:event') for real-time reactive UI
 *  - Beacon API & fetch keepalive on page exit (zero data loss)
 *  - Safe fallback for all browser & Node test environments
 */

const STORAGE_VISITOR_KEY = 'analytics_visitor_id';
const STORAGE_SESSION_KEY = 'analytics_session_id';
const STORAGE_LAST_ACTIVE = 'analytics_last_active';
const STORAGE_USER_ID = 'analytics_user_id';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

function safeStorage(type) {
    try {
        if (typeof window === 'undefined' || !window[type]) {
            return null;
        }
        const storage = window[type];
        const testKey = '__analytics_test__';
        storage.setItem(testKey, testKey);
        storage.removeItem(testKey);
        return storage;
    } catch (e) {
        return null;
    }
}

export class Analytics {
    constructor(config) {
        this.config = Object.assign({
            endpoint: '/api/events',
            flushInterval: 3000,
            batchSize: 10,
            debug: false,
            autoPageView: true
        }, config || {});

        this.queue = [];
        this.timer = null;
        this.local = safeStorage('localStorage');
        this.session = safeStorage('sessionStorage');

        this.visitorId = this._getOrCreateVisitorId();
        this.sessionId = this._getOrCreateSessionId();
        this.userId = this.local ? this.local.getItem(STORAGE_USER_ID) : null;

        if (typeof window !== 'undefined') {
            this._setupLifecycleHooks();
            if (this.config.autoPageView && typeof document !== 'undefined') {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.trackPageView({}));
                } else {
                    this.trackPageView();
                }
            }
        }
    }

    _getOrCreateVisitorId() {
        if (!this.local) return generateId();
        let id = this.local.getItem(STORAGE_VISITOR_KEY);
        if (!id) {
            id = generateId();
            this.local.setItem(STORAGE_VISITOR_KEY, id);
        }
        return id;
    }

    _getOrCreateSessionId() {
        if (!this.session || !this.local) return generateId();
        const now = Date.now();
        const lastActive = parseInt(this.local.getItem(STORAGE_LAST_ACTIVE) || '0', 10);
        let id = this.session.getItem(STORAGE_SESSION_KEY);

        if (!id || (now - lastActive > SESSION_TIMEOUT_MS)) {
            id = generateId();
            this.session.setItem(STORAGE_SESSION_KEY, id);
        }

        this.local.setItem(STORAGE_LAST_ACTIVE, now.toString());
        return id;
    }

    _touchSession() {
        if (this.local) {
            this.local.setItem(STORAGE_LAST_ACTIVE, Date.now().toString());
        }
    }

    _setupLifecycleHooks() {
        const flushOnExit = () => {
            this.flush({ sync: true });
        };

        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    flushOnExit();
                }
            });
        }

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('pagehide', flushOnExit);
            window.addEventListener('beforeunload', flushOnExit);
        }
    }

    identify(userId, traits) {
        this.userId = userId ? String(userId) : null;
        if (this.local) {
            if (this.userId) {
                this.local.setItem(STORAGE_USER_ID, this.userId);
            } else {
                this.local.removeItem(STORAGE_USER_ID);
            }
        }
        if (traits && typeof traits === 'object') {
            this.track('identify', Object.assign({ user_id: this.userId }, traits));
        }
        return this;
    }

    reset() {
        this.userId = null;
        if (this.local) {
            this.local.removeItem(STORAGE_USER_ID);
            this.local.removeItem(STORAGE_VISITOR_KEY);
        }
        if (this.session) {
            this.session.removeItem(STORAGE_SESSION_KEY);
        }
        this.visitorId = this._getOrCreateVisitorId();
        this.sessionId = this._getOrCreateSessionId();
        return this;
    }

    track(type, properties) {
        if (!type || typeof type !== 'string') {
            if (this.config.debug) console.warn('[Analytics] Invalid event type');
            return;
        }

        this._touchSession();

        const event = {
            type: type,
            source: 'browser',
            properties: Object.assign({}, properties || {}),
            user_id: this.userId,
            session_id: this.sessionId,
            timestamp: new Date().toISOString()
        };

        this.queue.push(event);

        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            try {
                window.dispatchEvent(new CustomEvent('analytics:event', { detail: event }));
            } catch (e) {}
        }

        if (this.config.debug) {
            console.log('[Analytics] Enqueued:', event);
        }

        if (this.queue.length >= this.config.batchSize) {
            this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => {
                this.timer = null;
                this.flush();
            }, this.config.flushInterval);
        }

        return event;
    }

    trackPageView(properties) {
        const pageProps = {
            page_path: typeof window !== 'undefined' && window.location ? window.location.pathname : '/',
            page_title: typeof document !== 'undefined' ? document.title : '',
            page_url: typeof window !== 'undefined' && window.location ? window.location.href : '',
            referrer: typeof document !== 'undefined' ? (document.referrer || null) : null
        };
        return this.track('PageView', Object.assign(pageProps, properties || {}));
    }

    flush(options) {
        if (this.queue.length === 0) return Promise.resolve();

        const batch = this.queue.slice();
        this.queue = [];

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const payload = JSON.stringify({ events: batch });
        const endpoint = this.config.endpoint;
        const isSync = options && options.sync;

        // Use sendBeacon on page unload if available
        if (isSync && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            try {
                const blob = new Blob([payload], { type: 'application/json' });
                const success = navigator.sendBeacon(endpoint, blob);
                if (success) return Promise.resolve();
            } catch (e) {
                // fallback to fetch keepalive
            }
        }

        if (typeof fetch === 'function') {
            return fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: payload,
                keepalive: !!isSync
            }).catch((err) => {
                if (options && options.requeue) {
                    this.queue = batch.concat(this.queue);
                }
            });
        }

        return Promise.resolve();
    }
}

export const analytics = typeof window !== 'undefined' && window.analytics
    ? window.analytics
    : new Analytics();

if (typeof window !== 'undefined') {
    if (!window.Analytics) {
        window.Analytics = Analytics;
    }
    if (!window.analytics) {
        window.analytics = analytics;
    }
}

export default analytics;
