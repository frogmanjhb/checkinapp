/**
 * House points feature: state shape.
 */
export function getDefaultState() {
  return {
    points: 0,
    house: null,
    schoolTotals: [],   // { house, total_points, student_count }
    gradeTotals: [],   // { grade, total_points, student_count }
    activeTab: 'school', // 'school' | 'grade'
    loading: false,
    error: null
  };
}

export function mergeState(state, partial) {
  return { ...state, ...partial };
}
