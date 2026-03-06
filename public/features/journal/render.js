/**
 * Renders prompt buttons into the quick-journal modal's list container.
 * Used after mood check-in to show mood-specific sentence starters.
 * Buttons use class "journal-prompt" and data-target/data-text for existing delegated click handler.
 * @param {HTMLElement} listContainer - Element with class .journal-prompts-list (e.g. inside #journalingModal)
 * @param {string[]} prompts - Array of prompt strings
 * @param {string} [targetId='journalEntry'] - id of the textarea to insert into
 */
export function renderQuickJournalPrompts(listContainer, prompts, targetId = 'journalEntry') {
  if (!listContainer) return;
  listContainer.innerHTML = '';
  const fragment = document.createDocumentFragment();
  (prompts || []).forEach((text) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'journal-prompt';
    btn.dataset.target = targetId;
    btn.dataset.text = text;
    btn.textContent = text;
    btn.setAttribute('aria-label', `Use prompt: ${text}`);
    fragment.appendChild(btn);
  });
  listContainer.appendChild(fragment);
}

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
