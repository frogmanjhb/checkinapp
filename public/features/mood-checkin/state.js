/**
 * Mood check-in feature: state shape and defaults.
 * Keeps state explicit and testable (React-ready).
 */

export const MOOD_EMOJIS = ['😊', '🤩', '😌', '😴', '😰', '😢', '😠', '😕'];
export const MOOD_LABELS = {
  great: 'Great',
  excited: 'Excited',
  calm: 'Calm',
  tired: 'Tired',
  anxious: 'Anxious',
  sad: 'Sad',
  angry: 'Angry',
  unsure: 'Unsure'
};

/**
 * @returns Initial state for the mood check-in flow
 */
export function getDefaultState() {
  return {
    step: 'mood', // 'mood' | 'emotions' | 'reasons' | 'location' | 'confirm'
    selectedMood: null,
    selectedEmoji: null,
    selectedEmotions: [],
    selectedReasons: [],
    location: null,
    notes: '',
    isGhostMode: false
  };
}

/**
 * @param {Object} state
 * @param {Object} partial
 * @returns New state (immutable update)
 */
export function mergeState(state, partial) {
  return { ...state, ...partial };
}
