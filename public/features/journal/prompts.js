/**
 * Journal prompts by mood for the post-check-in quick journal flow.
 * Prompts are supportive and age-appropriate; each mood has its own set.
 * Mood keys match features/mood-checkin/state.js (great, excited, calm, tired, anxious, sad, angry, unsure).
 */

/** @type {Record<string, string[]>} */
export const JOURNAL_PROMPTS_BY_MOOD = {
  great: [
    'Today I...',
    "I'm feeling...",
    "I'm grateful for...",
    'Something good that happened...',
    "I'm looking forward to...",
    'What made you smile today?',
    'One thing I learned...',
    "I'm proud of..."
  ],
  excited: [
    "I'm excited because...",
    "I can't wait to...",
    "Something I'm looking forward to...",
    "I'm feeling...",
    'Today was great when...',
    'I want to share...',
    "I'm looking forward to...",
    'What made today good...'
  ],
  calm: [
    'Right now I feel...',
    "I'm grateful for...",
    'Something peaceful today...',
    "I'm feeling...",
    'One thing that helped me feel calm...',
    'Today I noticed...',
    'I feel at ease when...'
  ],
  tired: [
    'Right now I...',
    "I'm feeling...",
    'What would help me rest...',
    'One small win today...',
    "I'm looking forward to...",
    'Today was...',
    'I need...'
  ],
  anxious: [
    'Right now I feel...',
    "What's on my mind...",
    'One thing that might help...',
    "I'm feeling...",
    'Something that usually helps me...',
    "I'm worried about...",
    'What I need right now...'
  ],
  sad: [
    "I'm feeling...",
    "What's on my mind...",
    'Something that might help...',
    "One small thing that's okay...",
    "I'm not alone because...",
    'Today was hard because...',
    'What I need...'
  ],
  angry: [
    "I'm feeling...",
    'What happened...',
    'What I need right now...',
    'Something that might help...',
    "I'm upset because...",
    'What would help...',
    'Right now I...'
  ],
  unsure: [
    "I'm feeling...",
    'Right now I...',
    "What's on my mind...",
    "Something I'm wondering about...",
    "I'm not sure but...",
    'Today I...',
    'One thing I noticed...'
  ]
};

const DEFAULT_MOOD = 'unsure';

/** Map UI mood keys (e.g. happy, confused) to prompt keys (great, unsure) */
const MOOD_KEY_TO_PROMPT_KEY = {
  happy: 'great',
  confused: 'unsure'
};

function normaliseMoodKeyForPrompts(mood) {
  return MOOD_KEY_TO_PROMPT_KEY[mood] || mood;
}

/**
 * Returns journal prompt strings for the given mood.
 * Falls back to DEFAULT_MOOD if mood is unknown or missing.
 * @param {string} [mood] - Mood key (e.g. 'great', 'happy', 'sad', 'anxious')
 * @returns {string[]} Array of prompt strings
 */
export function getPromptsForMood(mood) {
  const key = normaliseMoodKeyForPrompts(mood);
  const resolved = key && JOURNAL_PROMPTS_BY_MOOD[key] ? key : DEFAULT_MOOD;
  return [...(JOURNAL_PROMPTS_BY_MOOD[resolved] || JOURNAL_PROMPTS_BY_MOOD[DEFAULT_MOOD])];
}

/**
 * Returns combined journal prompts for one or more moods, deduplicated by text.
 * @param {string[]} moods - Array of mood keys (e.g. ['happy', 'tired'])
 * @returns {string[]} Array of unique prompt strings
 */
export function getPromptsForMoods(moods) {
  if (!moods || moods.length === 0) {
    return getPromptsForMood();
  }
  const seen = new Set();
  const out = [];
  for (const mood of moods) {
    const prompts = getPromptsForMood(mood);
    for (const text of prompts) {
      if (!seen.has(text)) {
        seen.add(text);
        out.push(text);
      }
    }
  }
  return out.length ? out : getPromptsForMood();
}
