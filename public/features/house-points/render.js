/**
 * House points feature: render points and lists to match app DOM.
 */

/**
 * Render student "your" panel: points, house badge, student name.
 * @param {HTMLElement} container - Card container (e.g. #housePointsCard) containing #housePoints, #houseBadge, #studentNameCard
 * @param {{ points: number, house: string|null }} state
 * @param {{ houseBadgeMap: Record<string, string>, studentName: string }} options
 */
export function renderYourPanel(container, state, options = {}) {
  if (!container) return;
  const { points = 0, house } = state;
  const { houseBadgeMap = {}, studentName = '' } = options;
  const pointsEl = container.querySelector('#housePoints, [data-house-points]');
  const badgeEl = container.querySelector('#houseBadge, [data-house-badge]');
  const nameEl = container.querySelector('#studentNameCard, [data-student-name]');
  if (pointsEl) pointsEl.textContent = String(points);
  if (badgeEl && house && houseBadgeMap[house]) {
    badgeEl.src = houseBadgeMap[house];
    badgeEl.alt = `${house} House Badge`;
  }
  if (nameEl) nameEl.textContent = studentName;
}

/**
 * Render grade totals list into container.
 * @param {HTMLElement} container - e.g. #gradeHousePointsList
 * @param {{ grade: string, total_points: number }[]} gradeTotals
 */
export function renderGradeList(container, gradeTotals) {
  if (!container) return;
  if (!gradeTotals || gradeTotals.length === 0) {
    container.innerHTML = '<p class="loading-text">No grade points data yet.</p>';
    return;
  }
  container.innerHTML = gradeTotals.map(row => `
    <div class="house-points-list-item">
      <span class="house-points-list-label">${escapeHtml(row.grade || 'Unknown')}</span>
      <span class="house-points-list-value">${parseInt(row.total_points, 10)} points</span>
    </div>
  `).join('');
}

/**
 * Render school house totals list into container.
 * @param {HTMLElement} container - e.g. #schoolHousePointsList
 * @param {{ house: string, total_points: number }[]} schoolTotals
 * @param {Record<string, string>} houseBadgeMap
 */
export function renderSchoolList(container, schoolTotals, houseBadgeMap = {}) {
  if (!container) return;
  if (!schoolTotals || schoolTotals.length === 0) {
    container.innerHTML = '<p class="loading-text">No school house points data yet.</p>';
    return;
  }
  container.innerHTML = schoolTotals.map(row => {
    const img = houseBadgeMap[row.house]
      ? `<img src="${escapeAttr(houseBadgeMap[row.house])}" alt="${escapeAttr(row.house)}" class="house-points-list-badge">`
      : '';
    return `
    <div class="house-points-list-item">
      ${img}
      <span class="house-points-list-label">${escapeHtml(row.house || 'Unknown')}</span>
      <span class="house-points-list-value">${parseInt(row.total_points, 10)} points</span>
    </div>
  `;
  }).join('');
}

/**
 * Render director house points row.
 * @param {HTMLElement} container - e.g. #directorHousePointsRow
 * @param {Record<string, { house: string, total_points: number, student_count: number }>} byHouse
 * @param {string[]} houseOrder
 * @param {Record<string, string>} houseBadgeMap
 */
export function renderDirectorRow(container, byHouse, houseOrder, houseBadgeMap = {}) {
  if (!container) return;
  if (!houseOrder || houseOrder.length === 0) {
    container.innerHTML = '<p class="loading-text">No house points data available.</p>';
    return;
  }
  container.innerHTML = houseOrder.map(houseName => {
    const house = byHouse[houseName] || { house: houseName, total_points: 0, student_count: 0 };
    const badgeSrc = houseBadgeMap[house.house] || '';
    const pts = parseInt(house.total_points, 10) || 0;
    const count = parseInt(house.student_count, 10) || 0;
    return `
      <div class="house-points-item">
        <img src="${escapeAttr(badgeSrc)}" alt="${escapeAttr(house.house)} House Badge" class="house-badge-director">
        <div class="house-points-details">
          <div class="house-name-director">${escapeHtml(house.house)} House</div>
          <div class="house-points-total">${pts} Points</div>
          <div class="house-students-count">${count} Student${count !== 1 ? 's' : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** @deprecated Use renderYourPanel / renderGradeList / renderSchoolList for app DOM */
export function renderHousePoints(container, state) {
  if (!container) return;
  const { points, house, activeTab, loading, error } = state;
  const pointsEl = container.querySelector('[data-house-points], .house-points-value');
  const houseEl = container.querySelector('[data-house-name], .house-name');
  if (pointsEl) pointsEl.textContent = loading ? '...' : String(points);
  if (houseEl) houseEl.textContent = house || '—';
  if (error && container.querySelector('[data-error]')) {
    container.querySelector('[data-error]').textContent = error;
  }
}
