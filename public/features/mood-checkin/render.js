/**
 * Mood check-in feature: render mood step (mood buttons) from state.
 * Pure render: given a container and state, updates the DOM. Testable and React-ready.
 */
import { MOOD_EMOJIS, MOOD_LABELS } from './state.js';

const MOOD_KEYS = ['great', 'excited', 'calm', 'tired', 'anxious', 'sad', 'angry', 'unsure'];

/**
 * Render mood selection buttons into container.
 * @param {HTMLElement} container - Element to render into (e.g. #moodSelection or .mood-buttons)
 * @param {Object} state - { selectedMood, selectedEmoji }
 * @param {function(mood: string, emoji: string)} onSelect - Called when a mood is chosen
 */
export function renderMoodStep(container, state, onSelect) {
  if (!container) return;
  const { selectedMood } = state;
  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  MOOD_KEYS.forEach((mood, i) => {
    const emoji = MOOD_EMOJIS[i] || '😊';
    const label = MOOD_LABELS[mood] || mood;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mood-btn' + (selectedMood === mood ? ' selected' : '');
    btn.dataset.mood = mood;
    btn.dataset.emoji = emoji;
    btn.setAttribute('aria-pressed', selectedMood === mood ? 'true' : 'false');
    btn.setAttribute('aria-label', `Select mood: ${label}`);
    btn.innerHTML = `<span class="mood-emoji">${emoji}</span><span class="mood-label">${label}</span>`;
    btn.addEventListener('click', () => onSelect(mood, emoji));
    fragment.appendChild(btn);
  });
  container.appendChild(fragment);
}
