/**
 * Journal feature: state shape and defaults.
 */
export function getDefaultState() {
  return {
    entry: '',
    charCount: 0,
    maxLength: 5000,
    isSaving: false,
    error: null
  };
}

export function mergeState(state, partial) {
  return { ...state, ...partial };
}
