/**
 * API client for backend communication.
 * Set window.REACT_API_BASE before loading if the app is served from a different origin.
 */
const API_BASE = (typeof window !== 'undefined' && window.REACT_API_BASE) ? window.REACT_API_BASE : '';

const APP_DEBUG = typeof localStorage !== 'undefined' && localStorage.getItem('debugApp') === 'true';
const _appLog = typeof console !== 'undefined' && console.log ? console.log.bind(console) : () => {};
function appDebugLog(...args) { if (APP_DEBUG) _appLog(...args); }

class APIUtils {
    static async makeRequest(endpoint, options = {}) {
        try {
            const url = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api${endpoint}` : `/api${endpoint}`;
            const response = await fetch(url, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...options.headers },
                ...options
            });
            const contentType = response.headers.get('Content-Type') || '';
            let data;
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                if (response.status === 404) {
                    throw new Error('API not found (404). Use the Node backend: run "npm start", then open http://localhost:3000. If the backend runs on another port, set window.REACT_API_BASE to that URL before loading the app.');
                }
                throw new Error(response.status ? `Server error ${response.status}` : 'Request failed');
            }
            if (!response.ok) throw new Error(data.error || 'Request failed');
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    static async register(userData) {
        return this.makeRequest('/register', { method: 'POST', body: JSON.stringify(userData) });
    }
    static async login(email, password) {
        return this.makeRequest('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    }
    static async getMe() { return this.makeRequest('/me'); }
    static async logout() { return this.makeRequest('/logout', { method: 'POST' }); }
    static async saveMoodCheckin(checkinData) {
        return this.makeRequest('/mood-checkin', { method: 'POST', body: JSON.stringify(checkinData) });
    }
    static async getMoodHistory(userId, period = 'daily') {
        return this.makeRequest(`/mood-history/${userId}?period=${period}`);
    }
    static async getAllStudents(classFilter = '', houseFilter = '') {
        const params = new URLSearchParams();
        if (classFilter) params.append('class', classFilter);
        if (houseFilter) params.append('house', houseFilter);
        return this.makeRequest(`/students?${params.toString()}`);
    }
    static async getAllMoodCheckins(period = 'daily') {
        return this.makeRequest(`/all-mood-checkins?period=${period}`);
    }
    static async saveJournalEntry(entryData) {
        return this.makeRequest('/journal-entry', { method: 'POST', body: JSON.stringify(entryData) });
    }
    static async getJournalEntries(userId, period = 'daily') {
        return this.makeRequest(`/journal-entries/${userId}?period=${period}`);
    }
    static async getSettings() { return this.makeRequest('/settings'); }
    static async updateDirectorSettings(directorUserId, messageCenterEnabled, ghostModeEnabled, tileFlipEnabled, housePointsEnabled) {
        return this.makeRequest('/director/settings', {
            method: 'PUT',
            body: JSON.stringify({ directorUserId, messageCenterEnabled, ghostModeEnabled, tileFlipEnabled, housePointsEnabled })
        });
    }
    static async deleteAllStudentData(directorUserId) {
        return this.makeRequest('/director/delete-all-student-data', { method: 'POST', body: JSON.stringify({ directorUserId }) });
    }
    static async deleteAllTeacherData(directorUserId) {
        return this.makeRequest('/director/delete-all-teacher-data', { method: 'POST', body: JSON.stringify({ directorUserId }) });
    }
    static async getCheckinJournalSettings(directorUserId) {
        return this.makeRequest(`/director/checkin-journal-settings?directorUserId=${encodeURIComponent(directorUserId)}`);
    }
    static async updateCheckinJournalSettings(directorUserId, maxCheckinsPerDay, maxJournalEntriesPerDay) {
        return this.makeRequest('/director/checkin-journal-settings', {
            method: 'PUT',
            body: JSON.stringify({ directorUserId, maxCheckinsPerDay, maxJournalEntriesPerDay })
        });
    }
    static async getTileFlipStatus(userId) { return this.makeRequest(`/tile-flip/status/${userId}`); }
    static async getTileQuotes() { return this.makeRequest('/tile-flip/quotes'); }
    static async flipTile(userId, tileIndex) {
        return this.makeRequest('/tile-flip/flip', { method: 'POST', body: JSON.stringify({ userId, tileIndex }) });
    }
    static async resetTiles(userId) { return this.makeRequest(`/tile-flip/reset/${userId}`, { method: 'POST' }); }
    static async getTileQuotesForDirector(directorUserId) { return this.makeRequest(`/director/tile-quotes?directorUserId=${directorUserId}`); }
    static async updateTileQuotes(directorUserId, quotes) {
        return this.makeRequest('/director/tile-quotes', { method: 'PUT', body: JSON.stringify({ directorUserId, quotes }) });
    }
    static async getAllUsers() { return this.makeRequest('/director/all-users'); }
    static async getAllMoodData(period = 'daily') { return this.makeRequest(`/director/all-mood-data?period=${period}`); }
    static async getAllJournalEntries(period = 'daily') { return this.makeRequest(`/director/all-journal-entries?period=${period}`); }
    static async getClassNames() { return this.makeRequest('/class-names'); }
    static async addClassName(directorUserId, className) {
        return this.makeRequest('/director/class-names', { method: 'POST', body: JSON.stringify({ directorUserId, className }) });
    }
    static async deleteClassName(directorUserId, className) {
        return this.makeRequest(`/director/class-names/${encodeURIComponent(className)}`, { method: 'DELETE', body: JSON.stringify({ directorUserId }) });
    }
    static async updateStudentClass(directorUserId, studentId, className) {
        return this.makeRequest(`/director/student-class/${studentId}`, { method: 'PUT', body: JSON.stringify({ directorUserId, className }) });
    }
    static async updateStudentClasses(directorUserId, updates) {
        return this.makeRequest('/director/student-classes', { method: 'PUT', body: JSON.stringify({ directorUserId, updates }) });
    }
    static async updateTeacherClass(teacherId, className) {
        return this.makeRequest(`/teacher/class/${teacherId}`, { method: 'PUT', body: JSON.stringify({ className }) });
    }
    static async getTeacherClassCheckins(teacherId, period = 'daily') {
        return this.makeRequest(`/teacher/class-checkins/${teacherId}?period=${period}`);
    }
    static async deleteStudent(directorUserId, studentId) {
        return this.makeRequest(`/director/student/${studentId}`, { method: 'DELETE', body: JSON.stringify({ directorUserId }) });
    }
    static async resetStudentPassword(directorUserId, studentId, newPassword) {
        return this.makeRequest(`/director/student/${studentId}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ directorUserId, newPassword: newPassword || undefined })
        });
    }
    static async getGradeAnalytics(grade, period = 'daily') {
        return this.makeRequest(`/teacher/grade-analytics?grade=${grade}&period=${period}`);
    }
    static async getTeacherStudents(teacherId) { return this.makeRequest(`/teacher/students/${teacherId}`); }
    static async getTeachers() { return this.makeRequest('/teachers'); }
    static async sendMessage(fromUserId, toUserId, message) {
        return this.makeRequest('/messages', { method: 'POST', body: JSON.stringify({ fromUserId, toUserId, message }) });
    }
    static async getMessages(userId) { return this.makeRequest(`/messages/${userId}`); }
    static async markMessageAsRead(messageId) { return this.makeRequest(`/messages/${messageId}/read`, { method: 'PUT' }); }
    static async getUnreadCount(userId) { return this.makeRequest(`/messages/${userId}/unread-count`); }
    static async getHousePoints(userId) { return this.makeRequest(`/house-points/${userId}`); }
    static async getHousePointsTotals(directorUserId) { return this.makeRequest(`/director/house-points?directorUserId=${directorUserId}`); }
    static async getSchoolHousePoints() { return this.makeRequest('/school-house-points'); }
    static async getGradeHousePoints() { return this.makeRequest('/grade-house-points'); }
}

export { APIUtils, API_BASE, appDebugLog };
