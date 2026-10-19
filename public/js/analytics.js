/**
 * Lightweight Zero-Dependency Analytics Browser SDK
 * Features:
 *  - Persistent Anonymous Visitor ID (localStorage)
 *  - Inactivity-aware Session Management (sessionStorage with 30m rolling window)
 *  - Event Queueing & Batched Dispatch
 *  - Beacon API & fetch keepalive on page exit (zero data loss)
 *  - Safe fallback for all browser & Node test environments
 */
(function (root, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        var AnalyticsClass = factory();
        root.Analytics = AnalyticsClass;
        if (typeof window !== 'undefined') {
            root.analytics = new AnalyticsClass();
        }
    }
}(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var STORAGE_VISITOR_KEY = 'analytics_visitor_id';
    var STORAGE_SESSION_KEY = 'analytics_session_id';
    var STORAGE_LAST_ACTIVE = 'analytics_last_active';
    var STORAGE_USER_ID = 'analytics_user_id';
    var SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

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
            var storage = window[type];
            var testKey = '__analytics_test__';
            storage.setItem(testKey, testKey);
            storage.removeItem(testKey);
            return storage;
        } catch (e) {
            return null;
        }
    }

    function Analytics(config) {
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
                    document.addEventListener('DOMContentLoaded', this.trackPageView.bind(this, {}));
                } else {
                    this.trackPageView();
                }
            }
        }
    }

    Analytics.prototype._getOrCreateVisitorId = function () {
        if (!this.local) return generateId();
        var id = this.local.getItem(STORAGE_VISITOR_KEY);
        if (!id) {
            id = generateId();
            this.local.setItem(STORAGE_VISITOR_KEY, id);
        }
        return id;
    };

    Analytics.prototype._getOrCreateSessionId = function () {
        if (!this.session || !this.local) return generateId();
        var now = Date.now();
        var lastActive = parseInt(this.local.getItem(STORAGE_LAST_ACTIVE) || '0', 10);
        var id = this.session.getItem(STORAGE_SESSION_KEY);

        if (!id || (now - lastActive > SESSION_TIMEOUT_MS)) {
            id = generateId();
            this.session.setItem(STORAGE_SESSION_KEY, id);
        }

        this.local.setItem(STORAGE_LAST_ACTIVE, now.toString());
        return id;
    };

    Analytics.prototype._touchSession = function () {
        if (this.local) {
            this.local.setItem(STORAGE_LAST_ACTIVE, Date.now().toString());
        }
    };

    Analytics.prototype._setupLifecycleHooks = function () {
        var self = this;
        var flushOnExit = function () {
            self.flush({ sync: true });
        };

        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'hidden') {
                    flushOnExit();
                }
            });
        }

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('pagehide', flushOnExit);
            window.addEventListener('beforeunload', flushOnExit);
        }
    };

    Analytics.prototype.identify = function (userId, traits) {
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
    };

    Analytics.prototype.reset = function () {
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
    };

    Analytics.prototype.track = function (type, properties) {
        if (!type || typeof type !== 'string') {
            if (this.config.debug) console.warn('[Analytics] Invalid event type');
            return;
        }

        this._touchSession();

        var event = {
            type: type,
            source: 'browser',
            properties: Object.assign({}, properties || {}),
            user_id: this.userId,
            session_id: this.sessionId,
            timestamp: new Date().toISOString()
        };

        this.queue.push(event);

        if (this.config.debug) {
            console.log('[Analytics] Enqueued:', event);
        }

        if (this.queue.length >= this.config.batchSize) {
            this.flush();
        } else if (!this.timer) {
            var self = this;
            this.timer = setTimeout(function () {
                self.timer = null;
                self.flush();
            }, this.config.flushInterval);
        }

        return event;
    };

    Analytics.prototype.trackPageView = function (properties) {
        var pageProps = {
            page_path: typeof window !== 'undefined' && window.location ? window.location.pathname : '/',
            page_title: typeof document !== 'undefined' ? document.title : '',
            page_url: typeof window !== 'undefined' && window.location ? window.location.href : '',
            referrer: typeof document !== 'undefined' ? (document.referrer || null) : null
        };
        return this.track('PageView', Object.assign(pageProps, properties || {}));
    };

    Analytics.prototype.flush = function (options) {
        if (this.queue.length === 0) return Promise.resolve();

        var batch = this.queue.slice();
        this.queue = [];

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        var payload = JSON.stringify({ events: batch });
        var endpoint = this.config.endpoint;
        var isSync = options && options.sync;

        // Use sendBeacon on page unload if available
        if (isSync && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            try {
                var blob = new Blob([payload], { type: 'application/json' });
                var success = navigator.sendBeacon(endpoint, blob);
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
            }).catch(function (err) {
                if (options && options.requeue) {
                    this.queue = batch.concat(this.queue);
                }
            });
        }

        return Promise.resolve();
    };

    return Analytics;
}));
