import './analytics';
import React from 'react';
import { createRoot } from 'react-dom/client';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';

// Mount React Analytics Dashboard if root element exists
document.addEventListener('DOMContentLoaded', () => {
    const rootEl = document.getElementById('analytics-dashboard-root');
    if (rootEl) {
        const root = createRoot(rootEl);
        root.render(React.createElement(AnalyticsDashboard));
    }
});
