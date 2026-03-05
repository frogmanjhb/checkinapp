/**
 * Journal feature: render entry UI from state (char count, error).
 */
export function renderJournalEntry(container, state, onInput) {
  if (!container) return;
  const { entry, charCount, maxLength, error, isSaving } = state;
  const textarea = container.querySelector('textarea[id="journalEntryText"], textarea.journal-entry-text');
  const countEl = container.querySelector('.journal-char-count, [data-char-count]');
  const errEl = container.querySelector('.journal-error, [data-error]');
  const submitBtn = container.querySelector('button[type="button"]#saveJournalEntryBtn, button.save-journal');

  if (textarea && textarea.value !== entry) {
    textarea.value = entry;
  }
  if (countEl) {
    countEl.textContent = `${charCount} / ${maxLength}`;
  }
  if (errEl) {
    errEl.textContent = error || '';
    errEl.hidden = !error;
  }
  if (submitBtn) {
    submitBtn.disabled = isSaving || !entry.trim();
    submitBtn.textContent = isSaving ? 'Saving...' : 'Save';
  }
  if (textarea && onInput && !textarea.dataset.bound) {
    textarea.dataset.bound = 'true';
    textarea.addEventListener('input', (e) => onInput(e.target.value));
  }
}
