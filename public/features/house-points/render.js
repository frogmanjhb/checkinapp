/**
 * House points feature: render points and tabs from state.
 */
export function renderHousePoints(container, state) {
  if (!container) return;
  const { points, house, schoolTotals, gradeTotals, activeTab, loading, error } = state;
  const pointsEl = container.querySelector('[data-house-points], .house-points-value');
  const houseEl = container.querySelector('[data-house-name], .house-name');
  const tabPanel = container.querySelector('[data-tab-panel="school"], .house-points-school');
  const gradePanel = container.querySelector('[data-tab-panel="grade"], .house-points-grade');

  if (pointsEl) pointsEl.textContent = loading ? '...' : String(points);
  if (houseEl) houseEl.textContent = house || '—';
  if (tabPanel) tabPanel.hidden = activeTab !== 'school';
  if (gradePanel) gradePanel.hidden = activeTab !== 'grade';
  if (error && container.querySelector('[data-error]')) {
    container.querySelector('[data-error]').textContent = error;
  }
}
