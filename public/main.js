/**
 * Client entry point. Loaded as type="module".
 * Set window.REACT_API_BASE before this script if the API is on a different origin.
 */
import { MoodCheckInApp } from './app.js';

function init() {
  try {
    if (typeof window.appDebugLog !== 'undefined') {
      window.appDebugLog('DOM loaded, initializing app...');
    }
    window.moodApp = new MoodCheckInApp();
  } catch (err) {
    console.error('Error initializing app:', err);
    alert('Error initializing app: ' + err.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
