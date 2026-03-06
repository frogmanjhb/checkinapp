/**
 * Mood check-in feature: render mood step (mood buttons) from state.
 * Supports multi-select: state.selectedMoods = [{ mood, emoji }, ...] (up to 2).
 */
import { MOOD_EMOJIS, MOOD_LABELS, MOOD_KEYS } from './state.js';

/**
 * Render mood selection buttons into container.
 * @param {HTMLElement} container - Element to render into (e.g. #moodModal .mood-options)
 * @param {Object} state - { selectedMoods: [{ mood, emoji }, ...] }
 * @param {function(mood: string, emoji: string)} onSelect - Called when a mood is clicked (toggle)
 */
export function renderMoodStep(container, state, onSelect) {
  if (!container) return;
  const selectedMoodKeys = (state.selectedMoods || []).map(m => m.mood);
  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  MOOD_KEYS.forEach((mood, i) => {
    const emoji = MOOD_EMOJIS[i] || '😊';
    const label = MOOD_LABELS[mood] || mood;
    const isSelected = selectedMoodKeys.indexOf(mood) > -1;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mood-btn' + (isSelected ? ' selected' : '');
    btn.dataset.mood = mood;
    btn.dataset.emoji = emoji;
    btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    btn.setAttribute('aria-label', `Select mood: ${label}`);
    btn.innerHTML = `<span class="mood-emoji">${emoji}</span><span class="mood-label">${label}</span>`;
    btn.addEventListener('click', () => onSelect(mood, emoji));
    fragment.appendChild(btn);
  });
  container.appendChild(fragment);
}
