/**
 * Client entry point. Loaded as type="module".
 * Set window.REACT_API_BASE before this script if the API is on a different origin.
 */
import { MoodCheckInApp } from './app.js';
import * as MoodCheckinFeature from './features/mood-checkin/index.js';
import * as JournalFeature from './features/journal/index.js';
import * as HousePointsFeature from './features/house-points/index.js';

// Expose features for app (app-api.js uses window.* so it doesn't need ES imports)
window.MoodCheckinFeature = {
  getDefaultState: MoodCheckinFeature.getDefaultState,
  mergeState: MoodCheckinFeature.mergeState,
  renderMoodStep: MoodCheckinFeature.renderMoodStep
};
window.JournalFeature = {
  getPromptsForMood: JournalFeature.getPromptsForMood,
  getPromptsForMoods: JournalFeature.getPromptsForMoods,
  renderQuickJournalPrompts: JournalFeature.renderQuickJournalPrompts
};
window.HousePointsFeature = {
  getDefaultState: HousePointsFeature.getDefaultState,
  mergeState: HousePointsFeature.mergeState,
  renderYourPanel: HousePointsFeature.renderYourPanel,
  renderGradeList: HousePointsFeature.renderGradeList,
  renderSchoolList: HousePointsFeature.renderSchoolList,
  renderDirectorRow: HousePointsFeature.renderDirectorRow
};

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
