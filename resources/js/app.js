import './analytics';
import React from 'react';
import { createRoot } from 'react-dom/client';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import LiveTelemetryHud from './components/LiveTelemetryHud.jsx';
import WalkthroughTour from './components/WalkthroughTour.jsx';

const initMountPoints = () => {
    // 1. Mount React Analytics Dashboard if root element exists
    const dashboardRootEl = document.getElementById('analytics-dashboard-root');
    if (dashboardRootEl && !dashboardRootEl.dataset.reactMounted) {
        dashboardRootEl.dataset.reactMounted = 'true';
        const dashboardRoot = createRoot(dashboardRootEl);
        dashboardRoot.render(React.createElement(AnalyticsDashboard));
    }

    // 2. Mount WalkthroughTour into #walkthrough-root or auto-create in body
    let walkthroughEl = document.getElementById('walkthrough-root');
    if (!walkthroughEl) {
        walkthroughEl = document.createElement('div');
        walkthroughEl.id = 'walkthrough-root';
        document.body.appendChild(walkthroughEl);
    }
    if (!walkthroughEl.dataset.reactMounted) {
        walkthroughEl.dataset.reactMounted = 'true';
        const walkthroughRoot = createRoot(walkthroughEl);
        walkthroughRoot.render(React.createElement(WalkthroughTour));
    }

    // 3. Mount LiveTelemetryHud into #telemetry-hud-root or auto-create in body
    let hudEl = document.getElementById('telemetry-hud-root');
    if (!hudEl) {
        hudEl = document.createElement('div');
        hudEl.id = 'telemetry-hud-root';
        document.body.appendChild(hudEl);
    }
    if (!hudEl.dataset.reactMounted) {
        hudEl.dataset.reactMounted = 'true';
        const hudRoot = createRoot(hudEl);
        hudRoot.render(React.createElement(LiveTelemetryHud));
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMountPoints);
} else {
    initMountPoints();
}
