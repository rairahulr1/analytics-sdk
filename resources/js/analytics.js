import Analytics from '../../public/js/analytics.js';

export { Analytics };
export const analytics = typeof window !== 'undefined' && window.analytics ? window.analytics : new Analytics();
export default analytics;
