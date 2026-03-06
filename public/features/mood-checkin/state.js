/**
 * Mood check-in feature: state shape and defaults.
 * Keeps state explicit and testable (React-ready).
 * Mood keys match app and HTML: happy, excited, calm, tired, anxious, sad, angry, confused.
 */

export const MOOD_EMOJIS = ['😊', '🤩', '😌', '😴', '😰', '😢', '😠', '😕'];
export const MOOD_KEYS = ['happy', 'excited', 'calm', 'tired', 'anxious', 'sad', 'angry', 'confused'];
export const MOOD_LABELS = {
  happy: 'Happy',
  excited: 'Excited',
  calm: 'Calm',
  tired: 'Tired',
  anxious: 'Anxious',
  sad: 'Sad',
  angry: 'Angry',
  confused: 'Confused'
};

/**
 * @returns Initial state for the mood check-in flow (supports multi-select up to 2)
 */
export function getDefaultState() {
  return {
    step: 'mood',
    selectedMoods: [], // [{ mood, emoji }, ...] max 2
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
