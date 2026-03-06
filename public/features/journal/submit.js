/**
 * Journal submission helper: validate text and build payload.
 * Pure function so it can be unit-tested and reused by both journal flows.
 */
/**
 * @param {string} rawText
 * @param {string|number} userId
 * @returns {{ valid: boolean, error?: string, payload?: { userId: string|number, entry: string } }}
 */
export function validateAndBuildJournalPayload(rawText, userId) {
  const trimmed = (rawText || '').trim();

  if (!userId) {
    return {
      valid: false,
      error: 'Missing user for journal entry.'
    };
  }

  if (!trimmed) {
    return {
      valid: false,
      error: 'Please enter some text for your journal entry.'
    };
  }

  return {
    valid: true,
    payload: {
      userId,
      entry: trimmed
    }
  };
}

