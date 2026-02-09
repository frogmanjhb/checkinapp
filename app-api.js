// API utility for backend communication
// Set window.REACT_API_BASE if the app is served from a different origin than the API (e.g. '' or 'http://localhost:3000')
const API_BASE = (typeof window !== 'undefined' && window.REACT_API_BASE) ? window.REACT_API_BASE : '';

// Helper function to extract grade from class name
// Examples: "5EF" -> "Grade 5", "6A" -> "Grade 6", "7B" -> "Grade 7"
// Also handles legacy format: "Grade 5" -> "Grade 5"
function getGradeFromClass(className) {
    if (!className) return null;
    
    // Handle legacy format "Grade X"
    if (className.startsWith('Grade ')) {
        return className;
    }
    
    // Extract first digit from class name (e.g., "5EF" -> "5", "6A" -> "6")
    const match = className.match(/^(\d)/);
    if (match) {
        return `Grade ${match[1]}`;
    }
    
    return null;
}

// Helper function to check if a class belongs to a specific grade
function isClassInGrade(className, grade) {
    return getGradeFromClass(className) === grade;
}

class APIUtils {
    static async makeRequest(endpoint, options = {}) {
        try {
            const url = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api${endpoint}` : `/api${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const contentType = response.headers.get('Content-Type') || '';
            let data;
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                if (response.status === 404) {
                    throw new Error('API not found (404). Use the Node backend: stop any other server on port 3000, run "npm start" or "node backend.js", then open http://localhost:3000 in the browser. If the backend runs on another port, set window.REACT_API_BASE to that URL (e.g. "http://localhost:3001") in index.html before the app-api.js script.');
                }
                throw new Error(response.status ? `Server error ${response.status}` : 'Request failed');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    static async register(userData) {
        return this.makeRequest('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    static async login(email, password) {
        return this.makeRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    static async saveMoodCheckin(checkinData) {
        return this.makeRequest('/mood-checkin', {
            method: 'POST',
            body: JSON.stringify(checkinData)
        });
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

    // Journal entry methods
    static async saveJournalEntry(entryData) {
        return this.makeRequest('/journal-entry', {
            method: 'POST',
            body: JSON.stringify(entryData)
        });
    }

    static async getJournalEntries(userId, period = 'daily') {
        return this.makeRequest(`/journal-entries/${userId}?period=${period}`);
    }

    // App settings
    static async getSettings() {
        return this.makeRequest('/settings');
    }

    static async updateDirectorSettings(directorUserId, messageCenterEnabled, ghostModeEnabled, tileFlipEnabled, housePointsEnabled) {
        return this.makeRequest('/director/settings', {
            method: 'PUT',
            body: JSON.stringify({ directorUserId, messageCenterEnabled, ghostModeEnabled, tileFlipEnabled, housePointsEnabled })
        });
    }

    static async deleteAllStudentData(directorUserId) {
        return this.makeRequest('/director/delete-all-student-data', {
            method: 'POST',
            body: JSON.stringify({ directorUserId })
        });
    }

    static async deleteAllTeacherData(directorUserId) {
        return this.makeRequest('/director/delete-all-teacher-data', {
            method: 'POST',
            body: JSON.stringify({ directorUserId })
        });
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

    // Tile Flip methods
    static async getTileFlipStatus(userId) {
        return this.makeRequest(`/tile-flip/status/${userId}`);
    }

    static async getTileQuotes() {
        return this.makeRequest('/tile-flip/quotes');
    }

    static async flipTile(userId, tileIndex) {
        return this.makeRequest('/tile-flip/flip', {
            method: 'POST',
            body: JSON.stringify({ userId, tileIndex })
        });
    }

    static async resetTiles(userId) {
        return this.makeRequest(`/tile-flip/reset/${userId}`, {
            method: 'POST'
        });
    }

    static async getTileQuotesForDirector(directorUserId) {
        return this.makeRequest(`/director/tile-quotes?directorUserId=${directorUserId}`);
    }

    static async updateTileQuotes(directorUserId, quotes) {
        return this.makeRequest('/director/tile-quotes', {
            method: 'PUT',
            body: JSON.stringify({ directorUserId, quotes })
        });
    }

    // Director methods
    static async getAllUsers() {
        return this.makeRequest('/director/all-users');
    }

    static async getAllMoodData(period = 'daily') {
        return this.makeRequest(`/director/all-mood-data?period=${period}`);
    }

    static async getAllJournalEntries(period = 'daily') {
        return this.makeRequest(`/director/all-journal-entries?period=${period}`);
    }

    // Class names management
    static async getClassNames() {
        return this.makeRequest('/class-names');
    }

    static async addClassName(directorUserId, className) {
        return this.makeRequest('/director/class-names', {
            method: 'POST',
            body: JSON.stringify({ directorUserId, className })
        });
    }

    static async deleteClassName(directorUserId, className) {
        return this.makeRequest(`/director/class-names/${encodeURIComponent(className)}`, {
            method: 'DELETE',
            body: JSON.stringify({ directorUserId })
        });
    }

    // Update a single student's class
    static async updateStudentClass(directorUserId, studentId, className) {
        return this.makeRequest(`/director/student-class/${studentId}`, {
            method: 'PUT',
            body: JSON.stringify({ directorUserId, className })
        });
    }

    // Bulk update student classes
    static async updateStudentClasses(directorUserId, updates) {
        return this.makeRequest('/director/student-classes', {
            method: 'PUT',
            body: JSON.stringify({ directorUserId, updates })
        });
    }

    // Teacher class management
    static async updateTeacherClass(teacherId, className) {
        return this.makeRequest(`/teacher/class/${teacherId}`, {
            method: 'PUT',
            body: JSON.stringify({ className })
        });
    }

    static async getTeacherClassCheckins(teacherId, period = 'daily') {
        return this.makeRequest(`/teacher/class-checkins/${teacherId}?period=${period}`);
    }

    // Delete individual student
    static async deleteStudent(directorUserId, studentId) {
        return this.makeRequest(`/director/student/${studentId}`, {
            method: 'DELETE',
            body: JSON.stringify({ directorUserId })
        });
    }

    // Reset student password (director only) - optional newPassword for custom value
    static async resetStudentPassword(directorUserId, studentId, newPassword) {
        return this.makeRequest(`/director/student/${studentId}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ directorUserId, newPassword: newPassword || undefined })
        });
    }

    // Teacher grade analytics (no names)
    static async getGradeAnalytics(grade, period = 'daily') {
        return this.makeRequest(`/teacher/grade-analytics?grade=${grade}&period=${period}`);
    }

    // Get students for specific teacher
    static async getTeacherStudents(teacherId) {
        return this.makeRequest(`/teacher/students/${teacherId}`);
    }

    // Messaging methods
    static async getTeachers() {
        return this.makeRequest('/teachers');
    }

    static async sendMessage(fromUserId, toUserId, message) {
        return this.makeRequest('/messages', {
            method: 'POST',
            body: JSON.stringify({ fromUserId, toUserId, message })
        });
    }

    static async getMessages(userId) {
        return this.makeRequest(`/messages/${userId}`);
    }

    static async markMessageAsRead(messageId) {
        return this.makeRequest(`/messages/${messageId}/read`, {
            method: 'PUT'
        });
    }

    static async getUnreadCount(userId) {
        return this.makeRequest(`/messages/${userId}/unread-count`);
    }

    // House Points methods
    static async getHousePoints(userId) {
        return this.makeRequest(`/house-points/${userId}`);
    }

    static async getHousePointsTotals(directorUserId) {
        return this.makeRequest(`/director/house-points?directorUserId=${directorUserId}`);
    }

    static async getSchoolHousePoints() {
        return this.makeRequest('/school-house-points');
    }

    static async getGradeHousePoints() {
        return this.makeRequest('/grade-house-points');
    }
}

// Security utility for password validation
class SecurityUtils {
    static validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);

        const errors = [];
        if (password.length < minLength) {
            errors.push(`Password must be at least ${minLength} characters long`);
        }
        if (!hasUpperCase) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!hasLowerCase) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!hasNumbers) {
            errors.push('Password must contain at least one number');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            strength: this.calculateStrength(password, hasUpperCase, hasLowerCase, hasNumbers)
        };
    }

    static calculateStrength(password, hasUpper, hasLower, hasNumber) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (hasUpper) score++;
        if (hasLower) score++;
        if (hasNumber) score++;
        
        if (score <= 2) return 'Weak';
        if (score <= 4) return 'Medium';
        return 'Strong';
    }

    static sanitizeInput(input) {
        return input.trim().replace(/[<>]/g, '');
    }
}

// REACT - Mood Check-In App with Database Integration
class MoodCheckInApp {
    constructor() {
        this.currentUser = null;
        this.moodHistory = [];
        this.journalEntries = [];
        this.selectedMood = null;
        this.allUsers = [];
        this.allMoodHistory = [];
        this.moodEmojis = ['😊', '🤩', '😌', '😴', '😰', '😢', '😠', '😕'];
        this.currentEmojiIndex = 0;
        this.isGhostMode = false;
        this.selectedEmotions = [];
        this.selectedReasons = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.physicsInterval = null;
        this.pluginSettings = { messageCenterEnabled: true, ghostModeEnabled: true, tileFlipEnabled: true, housePointsEnabled: true };
        this.tileFlipStatus = null;
        this.tileQuotes = [];
        this.availableFlips = 0;
        this.nextQuoteIndex = 0;
        this.studentJournalEntriesToday = [];
        
        this.initializeApp();
        this.setupEventListeners();
        this.startMoodEmojiAnimation();
    }

    async initializeApp(retryCount = 0) {
        
        // Check if all required DOM elements exist
        const requiredElements = [
            'loginScreen', 'registerScreen', 'studentDashboardScreen', 
            'teacherDashboardScreen'
        ];
        
        // Optional elements (not critical for basic functionality)
        const optionalElements = ['directorDashboardScreen'];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.error('Missing required DOM elements:', missingElements);
            
            if (retryCount < 50) { // Max 50 retries (5 seconds)
                setTimeout(() => this.initializeApp(retryCount + 1), 100);
                return;
            } else {
                console.error('Max retries reached. Some elements may be missing from HTML.');
            }
        }
        
        // Load class names for registration dropdown
        await this.loadClassNames();
        
        // Check if user is already logged in
        const savedUser = localStorage.getItem('checkinUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            await this.loadUserData();
            await this.showDashboard();
        } else {
            this.showLoginScreen();
        }
        
        // Update time display
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
        // Force update student name after a delay to ensure DOM is ready
        setTimeout(() => {
            if (this.currentUser && this.currentUser.user_type === 'student') {
                this.updateStudentName();
            }
        }, 1000);
        
        
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Registration forms
        const studentRegisterForm = document.getElementById('studentRegisterForm');
        if (studentRegisterForm) {
            studentRegisterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleStudentRegistration();
            });
        }

        const teacherRegisterForm = document.getElementById('teacherRegisterForm');
        if (teacherRegisterForm) {
            teacherRegisterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTeacherRegistration();
            });
        }

        const directorRegisterForm = document.getElementById('directorRegisterForm');
        if (directorRegisterForm) {
            directorRegisterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleDirectorRegistration();
            });
        }

        // Auth screen switching
        const showRegister = document.getElementById('showRegister');
        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterScreen();
            });
        }

        const showLogin = document.getElementById('showLogin');
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginScreen();
            });
        }

        // User type selection
        const userTypeBtns = document.querySelectorAll('.user-type-btn');
        userTypeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchUserType(e.target.dataset.type);
            });
        });

        // Password strength checking
        const studentPassword = document.getElementById('studentPassword');
        const teacherPassword = document.getElementById('teacherPassword');
        const directorPassword = document.getElementById('directorPassword');
        
        if (studentPassword) {
            studentPassword.addEventListener('input', (e) => {
                this.updatePasswordStrength('studentPasswordStrength', e.target.value);
            });
        }
        
        if (teacherPassword) {
            teacherPassword.addEventListener('input', (e) => {
                this.updatePasswordStrength('teacherPasswordStrength', e.target.value);
            });
        }

        if (directorPassword) {
            directorPassword.addEventListener('input', (e) => {
                this.updatePasswordStrength('directorPasswordStrength', e.target.value);
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Message Center button
        const messageCenterBtn = document.getElementById('messageCenterBtn');
        if (messageCenterBtn) {
            messageCenterBtn.addEventListener('click', () => {
                this.showMessageCenter();
            });
        }

        // Message Center modal controls
        const closeMessageCenterModal = document.getElementById('closeMessageCenterModal');
        if (closeMessageCenterModal) {
            closeMessageCenterModal.addEventListener('click', () => {
                this.hideMessageCenter();
            });
        }

        const backToConversationsBtn = document.getElementById('backToConversationsBtn');
        if (backToConversationsBtn) {
            backToConversationsBtn.addEventListener('click', () => {
                this.showConversationsList();
            });
        }

        const sendConversationReplyBtn = document.getElementById('sendConversationReplyBtn');
        if (sendConversationReplyBtn) {
            sendConversationReplyBtn.addEventListener('click', () => {
                this.handleConversationReply();
            });
        }

        const conversationReplyText = document.getElementById('conversationReplyText');
        if (conversationReplyText) {
            conversationReplyText.addEventListener('input', (e) => {
                const sendBtn = document.getElementById('sendConversationReplyBtn');
                if (sendBtn) {
                    sendBtn.disabled = !e.target.value.trim();
                }
            });
        }

        // Mood check-in button
        const moodCheckInBtn = document.getElementById('moodCheckInBtn');
        if (moodCheckInBtn) {
            moodCheckInBtn.addEventListener('click', () => {
                this.showMoodModal();
            });
        }

        // Journal entry button
        const journalEntryBtn = document.getElementById('journalEntryBtn');
        if (journalEntryBtn) {
            journalEntryBtn.addEventListener('click', () => {
                this.showJournalEntryModal();
            });
        }

        // Talk to teacher button
        const talkToTeacherBtn = document.getElementById('talkToTeacherBtn');
        if (talkToTeacherBtn) {
            talkToTeacherBtn.addEventListener('click', () => {
                this.showTalkToTeacherModal();
            });
        }

        // Teacher mood check-in button
        const teacherMoodCheckInBtn = document.getElementById('teacherMoodCheckInBtn');
        if (teacherMoodCheckInBtn) {
            teacherMoodCheckInBtn.addEventListener('click', () => {
                this.showMoodModal();
            });
        }

        // Teacher journal entry button
        const teacherJournalEntryBtn = document.getElementById('teacherJournalEntryBtn');
        if (teacherJournalEntryBtn) {
            teacherJournalEntryBtn.addEventListener('click', () => {
                this.showJournalEntryModal();
            });
        }

        // House points tabs (student dashboard)
        document.querySelectorAll('.house-points-tab').forEach(tabBtn => {
            tabBtn.addEventListener('click', () => {
                const tab = tabBtn.getAttribute('data-tab');
                this.switchHousePointsTab(tab);
            });
        });

        // New Teacher UI elements
        initializeTeacherUI();
        
        // Initialize teacher filters immediately
        setTimeout(() => {
            updateTeacherFilters();
        }, 500);

        // Mouse tracking for physics
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Cleanup physics on page unload
        window.addEventListener('beforeunload', () => {
            if (this.physicsInterval) {
                clearInterval(this.physicsInterval);
            }
        });

        // Modal controls
        const closeMoodModal = document.getElementById('closeMoodModal');
        if (closeMoodModal) {
            closeMoodModal.addEventListener('click', () => {
                this.hideMoodModal();
            });
        }

        // Ghost mode toggle
        const ghostModeToggle = document.getElementById('ghostModeToggle');
        if (ghostModeToggle) {
            ghostModeToggle.addEventListener('change', (e) => {
                this.toggleGhostMode(e.target.checked);
            });
        }

        // Mood selection
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectMood(e.target.closest('.mood-btn').dataset.mood, e.target.closest('.mood-btn').dataset.emoji);
            });
        });

        // Proceed to emotions button
        const proceedToEmotions = document.getElementById('proceedToEmotions');
        if (proceedToEmotions) {
            proceedToEmotions.addEventListener('click', () => {
                this.showEmotionModal();
            });
        }

        // Confirm mood check-in - moved to location modal section

        // Close modal when clicking outside
        const moodModal = document.getElementById('moodModal');
        if (moodModal) {
            moodModal.addEventListener('click', (e) => {
                if (e.target.id === 'moodModal') {
                    this.hideMoodModal();
                }
            });
        }

        // Journal entry modal controls
        const closeJournalEntryModal = document.getElementById('closeJournalEntryModal');
        if (closeJournalEntryModal) {
            closeJournalEntryModal.addEventListener('click', () => {
                this.hideJournalEntryModal();
            });
        }

        const cancelJournalEntry = document.getElementById('cancelJournalEntry');
        if (cancelJournalEntry) {
            cancelJournalEntry.addEventListener('click', () => {
                this.hideJournalEntryModal();
            });
        }

        const saveJournalEntryBtn = document.getElementById('saveJournalEntryBtn');
        if (saveJournalEntryBtn) {
            saveJournalEntryBtn.addEventListener('click', () => {
                this.handleJournalEntry();
            });
        }

        // Journal entry character count
        const journalEntryText = document.getElementById('journalEntryText');
        if (journalEntryText) {
            journalEntryText.addEventListener('input', (e) => {
                this.updateJournalCharacterCount(e.target.value);
            });
        }

        // Talk to teacher modal controls
        const closeTalkToTeacherModal = document.getElementById('closeTalkToTeacherModal');
        if (closeTalkToTeacherModal) {
            closeTalkToTeacherModal.addEventListener('click', () => {
                this.hideTalkToTeacherModal();
            });
        }

        const cancelMessage = document.getElementById('cancelMessage');
        if (cancelMessage) {
            cancelMessage.addEventListener('click', () => {
                this.hideTalkToTeacherModal();
            });
        }

        const sendMessageBtn = document.getElementById('sendMessageBtn');
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => {
                this.handleSendMessage();
            });
        }

        const messageText = document.getElementById('messageText');
        if (messageText) {
            messageText.addEventListener('input', (e) => {
                const sendBtn = document.getElementById('sendMessageBtn');
                if (sendBtn) {
                    sendBtn.disabled = !e.target.value.trim() || !this.selectedTeacherId;
                }
            });
        }

        // Messages modal controls (for teachers/directors)
        const closeMessagesModal = document.getElementById('closeMessagesModal');
        if (closeMessagesModal) {
            closeMessagesModal.addEventListener('click', () => {
                this.hideMessagesModal();
            });
        }

        const teacherViewMessagesBtn = document.getElementById('teacherViewMessagesBtn');
        if (teacherViewMessagesBtn) {
            teacherViewMessagesBtn.addEventListener('click', () => {
                this.showMessagesModal();
            });
        }

        const directorViewMessagesBtn = document.getElementById('directorViewMessagesBtn');
        if (directorViewMessagesBtn) {
            directorViewMessagesBtn.addEventListener('click', () => {
                this.showMessagesModal();
            });
        }

        const sendReplyBtn = document.getElementById('sendReplyBtn');
        if (sendReplyBtn) {
            sendReplyBtn.addEventListener('click', () => {
                this.handleSendReply();
            });
        }

        const cancelReply = document.getElementById('cancelReply');
        if (cancelReply) {
            cancelReply.addEventListener('click', () => {
                document.getElementById('messageReplySection').style.display = 'none';
                this.replyToUserId = null;
            });
        }

        const replyText = document.getElementById('replyText');
        if (replyText) {
            replyText.addEventListener('input', (e) => {
                const replyBtn = document.getElementById('sendReplyBtn');
                if (replyBtn) {
                    replyBtn.disabled = !e.target.value.trim();
                }
            });
        }

        // Emotion selection is handled dynamically in populateEmotionOptions()

        // Emotion modal controls
        const closeEmotionModal = document.getElementById('closeEmotionModal');
        if (closeEmotionModal) {
            closeEmotionModal.addEventListener('click', () => {
                this.hideEmotionModal();
            });
        }

        const backToMood = document.getElementById('backToMood');
        if (backToMood) {
            backToMood.addEventListener('click', () => {
                this.hideEmotionModal();
                this.showMoodModal();
            });
        }

        const proceedToLocation = document.getElementById('proceedToLocation');
        if (proceedToLocation) {
            proceedToLocation.addEventListener('click', () => {
                this.showLocationModal();
            });
        }

        // Location selection
        document.querySelectorAll('.location-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectLocation(e.target.closest('.location-btn').dataset.location);
            });
        });

        // Reason toggles will be set up when location modal is shown

        // Location modal controls
        const closeLocationModal = document.getElementById('closeLocationModal');
        if (closeLocationModal) {
            closeLocationModal.addEventListener('click', () => {
                this.hideLocationModal();
            });
        }

        const backToEmotions = document.getElementById('backToEmotions');
        if (backToEmotions) {
            backToEmotions.addEventListener('click', () => {
                this.hideLocationModal();
                this.showEmotionModal();
            });
        }

        // Complete mood check-in button
        const confirmMoodCheckin = document.getElementById('confirmMoodCheckin');
        if (confirmMoodCheckin) {
            confirmMoodCheckin.addEventListener('click', () => {
                this.handleMoodCheckIn();
            });
        } else {
            console.error('confirmMoodCheckin button not found');
        }

        // Close journal entry modal when clicking outside
        const journalEntryModal = document.getElementById('journalEntryModal');
        if (journalEntryModal) {
            journalEntryModal.addEventListener('click', (e) => {
                if (e.target.id === 'journalEntryModal') {
                    this.hideJournalEntryModal();
                }
            });
        }

        // Journal prompt suggestions - insert sentence starters/questions into textarea
        document.addEventListener('click', (e) => {
            const promptBtn = e.target.closest('.journal-prompt');
            if (!promptBtn) return;
            const targetId = promptBtn.dataset.target;
            const text = promptBtn.dataset.text;
            if (!targetId || !text) return;
            const textarea = document.getElementById(targetId);
            if (!textarea) return;
            e.preventDefault();
            const currentVal = textarea.value;
            const prefix = currentVal ? currentVal + ' ' : '';
            textarea.value = prefix + text;
            textarea.focus();
            const countElement = targetId === 'journalEntry' ? document.getElementById('characterCount') : document.getElementById('journalCharacterCount');
            if (countElement) countElement.textContent = textarea.value.length;
        });

        // Analytics tabs
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAnalyticsTab(e.target.dataset.period);
            });
        });

        // Teacher filters (removed - teachers can only see their assigned grade and house)
    }

    async handleLogin() {
        const emailElement = document.getElementById('email');
        const passwordElement = document.getElementById('password');
        
        if (!emailElement || !passwordElement) {
            console.error('Login form elements not found in DOM');
            this.showMessage('Login form not ready. Please refresh the page and try again.', 'error');
            return;
        }
        
        const email = SecurityUtils.sanitizeInput(emailElement.value);
        const password = passwordElement.value;

        try {
            const response = await APIUtils.login(email, password);
            
            if (response.success) {
                this.currentUser = response.user;
                localStorage.setItem('checkinUser', JSON.stringify(this.currentUser));
                await this.loadUserData();
                await this.showDashboard();
                this.showMessage('Login successful! Welcome back!', 'success');
            } else {
                this.showMessage('Invalid credentials. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Login failed. Please try again.', 'error');
        }
    }

    async handleStudentRegistration() {
        const firstNameElement = document.getElementById('studentFirstName');
        const surnameElement = document.getElementById('studentSurname');
        const studentClassElement = document.getElementById('studentClass');
        const houseElement = document.getElementById('studentHouse');
        const emailElement = document.getElementById('studentEmail');
        const passwordElement = document.getElementById('studentPassword');
        const confirmPasswordElement = document.getElementById('studentConfirmPassword');
        
        if (!firstNameElement || !surnameElement || !studentClassElement || !houseElement ||
            !emailElement || !passwordElement || !confirmPasswordElement) {
            console.error('Student registration form elements not found in DOM');
            this.showMessage('Registration form not ready. Please refresh the page and try again.', 'error');
            return;
        }
        
        const firstName = SecurityUtils.sanitizeInput(firstNameElement.value);
        const surname = SecurityUtils.sanitizeInput(surnameElement.value);
        const studentClass = studentClassElement.value;
        const house = houseElement.value;
        const email = SecurityUtils.sanitizeInput(emailElement.value);
        const password = passwordElement.value;
        const confirmPassword = confirmPasswordElement.value;

        // Validation
        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid @stpeters.co.za email address.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match.', 'error');
            return;
        }

        const passwordValidation = SecurityUtils.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            this.showMessage(`Password requirements not met: ${passwordValidation.errors.join(', ')}`, 'error');
            return;
        }

        try {
            const response = await APIUtils.register({
                firstName,
                surname,
                email,
                password,
                userType: 'student',
                class: studentClass,
                house
            });

            if (response.success) {
                this.showMessage(`Student account created successfully! Password strength: ${passwordValidation.strength}. Please login.`, 'success');
                this.showLoginScreen();
            } else {
                this.showMessage(response.error || 'Registration failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage('Registration failed. Please try again.', 'error');
        }
    }

    async handleTeacherRegistration() {
        // Check if teacher registration form is visible
        const teacherRegisterForm = document.getElementById('teacherRegisterForm');
        if (!teacherRegisterForm) {
            console.error('Teacher registration form not found in DOM');
            this.showMessage('Registration form not found. Please refresh the page and try again.', 'error');
            return;
        }
        
        if (!teacherRegisterForm.classList.contains('active')) {
            console.error('Teacher registration form is not visible');
            this.showMessage('Please select Teacher registration first.', 'error');
            return;
        }
        
        // Ensure the form is actually visible in the DOM
        const formStyle = window.getComputedStyle(teacherRegisterForm);
        if (formStyle.display === 'none') {
            console.error('Teacher registration form is hidden');
            this.showMessage('Registration form is not visible. Please select Teacher registration first.', 'error');
            return;
        }

        // Wait a bit for DOM to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Try to get elements with retry mechanism
        let firstNameElement, surnameElement, gradeCheckboxes, houseElement, registrationPasswordElement, emailElement, passwordElement, confirmPasswordElement;
        
        for (let i = 0; i < 3; i++) {
            firstNameElement = document.getElementById('teacherFirstName');
            surnameElement = document.getElementById('teacherSurname');
            gradeCheckboxes = document.querySelectorAll('input[name="teacherGrade"]:checked');
            houseElement = document.getElementById('teacherHouse');
            registrationPasswordElement = document.getElementById('teacherRegistrationPassword');
            emailElement = document.getElementById('teacherEmail');
            passwordElement = document.getElementById('teacherPassword');
            confirmPasswordElement = document.getElementById('teacherConfirmPassword');
            
            if (firstNameElement && surnameElement && gradeCheckboxes.length > 0 && houseElement && 
                registrationPasswordElement && emailElement && passwordElement && confirmPasswordElement) {
                break;
            }
            
            if (i < 2) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        if (!firstNameElement || !surnameElement || gradeCheckboxes.length === 0 || !houseElement || 
            !registrationPasswordElement || !emailElement || !passwordElement || !confirmPasswordElement) {
            console.error('Teacher registration form elements not found in DOM');
            
            this.showMessage('Registration form not ready. Please refresh the page and try again.', 'error');
            return;
        }
        
        const firstName = SecurityUtils.sanitizeInput(firstNameElement.value);
        const surname = SecurityUtils.sanitizeInput(surnameElement.value);
        const grades = Array.from(gradeCheckboxes).map(checkbox => checkbox.value);
        const house = houseElement.value;
        const registrationPassword = registrationPasswordElement.value;
        const email = SecurityUtils.sanitizeInput(emailElement.value);
        const password = passwordElement.value;
        const confirmPassword = confirmPasswordElement.value;

        // Validation
        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid @stpeters.co.za email address.', 'error');
            return;
        }

        if (grades.length === 0 || !house) {
            this.showMessage('Please select at least one grade and house assignment.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match.', 'error');
            return;
        }

        const passwordValidation = SecurityUtils.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            this.showMessage(`Password requirements not met: ${passwordValidation.errors.join(', ')}`, 'error');
            return;
        }

        try {
            const response = await APIUtils.register({
                firstName,
                surname,
                email,
                password,
                userType: 'teacher',
                grades,
                house,
                registrationPassword
            });

            if (response.success) {
                const gradesText = grades.join(', ');
                this.showMessage(`Teacher account created successfully! You are assigned to grades: ${gradesText} - ${house}. Password strength: ${passwordValidation.strength}. Please login.`, 'success');
                this.showLoginScreen();
            } else {
                this.showMessage(response.error || 'Registration failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage('Registration failed. Please try again.', 'error');
        }
    }

    async handleDirectorRegistration() {
        const firstNameElement = document.getElementById('directorFirstName');
        const surnameElement = document.getElementById('directorSurname');
        const registrationPasswordElement = document.getElementById('directorRegistrationPassword');
        const emailElement = document.getElementById('directorEmail');
        const passwordElement = document.getElementById('directorPassword');
        const confirmPasswordElement = document.getElementById('directorConfirmPassword');
        
        if (!firstNameElement || !surnameElement || !registrationPasswordElement || !emailElement || 
            !passwordElement || !confirmPasswordElement) {
            console.error('Director registration form elements not found in DOM');
            this.showMessage('Registration form not ready. Please refresh the page and try again.', 'error');
            return;
        }
        
        const firstName = SecurityUtils.sanitizeInput(firstNameElement.value);
        const surname = SecurityUtils.sanitizeInput(surnameElement.value);
        const registrationPassword = registrationPasswordElement.value;
        const email = SecurityUtils.sanitizeInput(emailElement.value);
        const password = passwordElement.value;
        const confirmPassword = confirmPasswordElement.value;

        // Validation
        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid @stpeters.co.za email address.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match.', 'error');
            return;
        }

        const passwordValidation = SecurityUtils.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            this.showMessage(`Password requirements not met: ${passwordValidation.errors.join(', ')}`, 'error');
            return;
        }

        try {
            const response = await APIUtils.register({
                firstName,
                surname,
                email,
                password,
                userType: 'director',
                registrationPassword
            });

            if (response.success) {
                this.showMessage(`Director account created successfully! Password strength: ${passwordValidation.strength}. Please login.`, 'success');
                this.showLoginScreen();
            } else {
                this.showMessage(response.error || 'Registration failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage('Registration failed. Please try again.', 'error');
        }
    }

    validateEmail(email) {
        return email.endsWith('@stpeters.co.za') && email.includes('@');
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('checkinUser');
        this.moodHistory = [];
        const navbar = document.getElementById('navbar');
        if (navbar) navbar.style.display = 'none';
        this.showLoginScreen();
        this.showMessage('Logged out successfully!', 'success');
    }

    // Refresh current user data from server
    async refreshCurrentUser() {
        try {
            if (!this.currentUser || !this.currentUser.id) {
                console.log('No current user to refresh');
                return;
            }

            console.log('Refreshing user data for:', this.currentUser.email);
            
            // Get fresh user data from server
            const usersResponse = await APIUtils.getAllUsers();
            if (usersResponse.success && usersResponse.users) {
                const freshUser = usersResponse.users.find(u => u.id === this.currentUser.id);
                if (freshUser) {
                    console.log('Updated user data:', freshUser);
                    this.currentUser = freshUser;
                    localStorage.setItem('checkinUser', JSON.stringify(this.currentUser));
                    
                    // Refresh the current dashboard
                    if (this.currentUser.user_type === 'director') {
                        this.showDirectorDashboard();
                    } else if (this.currentUser.user_type === 'teacher') {
                        this.showTeacherDashboard();
                    } else if (this.currentUser.user_type === 'student') {
                        this.showStudentDashboard();
                    }
                }
            }
        } catch (error) {
            console.error('Failed to refresh user data:', error);
        }
    }

    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const registerScreen = document.getElementById('registerScreen');
        const studentScreen = document.getElementById('studentDashboardScreen');
        const teacherScreen = document.getElementById('teacherDashboardScreen');
        const directorScreen = document.getElementById('directorDashboardScreen');
        const navUser = document.getElementById('navUser');
        const navbar = document.getElementById('navbar');
        const loginForm = document.getElementById('loginForm');
        
        if (!loginScreen || !registerScreen || !studentScreen || !teacherScreen) {
            console.error('Required screens not found in DOM');
            return;
        }
        
        loginScreen.classList.add('active');
        registerScreen.classList.remove('active');
        studentScreen.classList.remove('active');
        teacherScreen.classList.remove('active');
        if (directorScreen) {
            directorScreen.classList.remove('active');
        }
        
        if (navUser) {
            navUser.style.display = 'none';
        }
        if (navbar) {
            navbar.style.display = 'none';
        }
        
        // Clear form
        if (loginForm) {
            loginForm.reset();
        }
    }

    showRegisterScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const registerScreen = document.getElementById('registerScreen');
        const studentScreen = document.getElementById('studentDashboardScreen');
        const teacherScreen = document.getElementById('teacherDashboardScreen');
        const directorScreen = document.getElementById('directorDashboardScreen');
        const navUser = document.getElementById('navUser');
        const navbar = document.getElementById('navbar');
        
        if (!loginScreen || !registerScreen || !studentScreen || !teacherScreen) {
            console.error('Required screens not found in DOM');
            return;
        }
        
        loginScreen.classList.remove('active');
        registerScreen.classList.add('active');
        studentScreen.classList.remove('active');
        teacherScreen.classList.remove('active');
        if (directorScreen) {
            directorScreen.classList.remove('active');
        }
        
        if (navUser) {
            navUser.style.display = 'none';
        }
        if (navbar) {
            navbar.style.display = 'none';
        }
    }

    switchUserType(type) {
        
        // Update button states
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');

        // Show/hide forms
        document.querySelectorAll('.register-form').forEach(form => {
            form.classList.remove('active');
        });
        
        if (type === 'student') {
            const studentForm = document.getElementById('studentRegisterForm');
            if (studentForm) {
                studentForm.classList.add('active');
            }
        } else if (type === 'teacher') {
            const teacherForm = document.getElementById('teacherRegisterForm');
            if (teacherForm) {
                teacherForm.classList.add('active');
            }
        } else if (type === 'director') {
            const directorForm = document.getElementById('directorRegisterForm');
            if (directorForm) {
                directorForm.classList.add('active');
            }
        }
    }

    async showDashboard() {
        await this.fetchPluginSettings();
        this.applyMessageCenterVisibility();
        this.applyGhostModeVisibility();
        this.applyTileFlipVisibility();
        this.applyHousePointsVisibility();
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('registerScreen').classList.remove('active');
        const navUser = document.getElementById('navUser');
        const navbar = document.getElementById('navbar');
        if (navUser) navUser.style.display = 'flex';
        if (navbar) navbar.style.display = 'block';
        
        if (this.currentUser.user_type === 'student') {
            this.showStudentDashboard();
        } else if (this.currentUser.user_type === 'teacher') {
            this.showTeacherDashboard();
        } else if (this.currentUser.user_type === 'director') {
            this.showDirectorDashboard();
        }
    }

    async fetchPluginSettings() {
        try {
            const res = await APIUtils.getSettings();
            if (res.success) {
                if (typeof res.messageCenterEnabled === 'boolean') this.pluginSettings.messageCenterEnabled = res.messageCenterEnabled;
                if (typeof res.ghostModeEnabled === 'boolean') this.pluginSettings.ghostModeEnabled = res.ghostModeEnabled;
                if (typeof res.tileFlipEnabled === 'boolean') this.pluginSettings.tileFlipEnabled = res.tileFlipEnabled;
                if (typeof res.housePointsEnabled === 'boolean') this.pluginSettings.housePointsEnabled = res.housePointsEnabled;
            }
        } catch (e) {
            console.warn('Failed to fetch plugin settings, using defaults:', e);
        }
    }

    applyMessageCenterVisibility() {
        const enabled = !!this.pluginSettings.messageCenterEnabled;
        const msgBtn = document.getElementById('messageCenterBtn');
        const talkBtn = document.getElementById('talkToTeacherBtn');
        const teacherBanner = document.getElementById('teacherMessagesBanner');
        const directorBanner = document.getElementById('directorMessagesBanner');
        const msgModal = document.getElementById('messageCenterModal');
        const checkinCard = document.querySelector('.bento-checkin');
        if (msgBtn) msgBtn.style.display = enabled ? 'flex' : 'none';
        if (talkBtn) talkBtn.style.display = enabled ? '' : 'none';
        if (checkinCard) {
            if (enabled) checkinCard.classList.remove('message-center-disabled');
            else checkinCard.classList.add('message-center-disabled');
        }
        if (!enabled) {
            if (teacherBanner) teacherBanner.style.display = 'none';
            if (directorBanner) directorBanner.style.display = 'none';
            if (msgModal && msgModal.classList.contains('active')) this.hideMessageCenter();
            const talkModal = document.getElementById('talkToTeacherModal');
            if (talkModal && talkModal.classList.contains('active')) this.hideTalkToTeacherModal();
        }
    }

    applyGhostModeVisibility() {
        const enabled = !!this.pluginSettings.ghostModeEnabled;
        const toggleSection = document.querySelector('.ghost-mode-toggle');
        const statusEl = document.getElementById('ghostModeStatus');
        const toggleEl = document.getElementById('ghostModeToggle');
        const indicators = document.querySelectorAll('.ghost-mode-modal-indicator');
        if (toggleSection) toggleSection.style.display = enabled ? '' : 'none';
        if (statusEl) statusEl.style.display = enabled && this.isGhostMode ? 'block' : 'none';
        if (!enabled) {
            this.isGhostMode = false;
            if (toggleEl) toggleEl.checked = false;
            indicators.forEach(el => { el.style.display = 'none'; });
        }
    }

    applyTileFlipVisibility() {
        const enabled = !!this.pluginSettings.tileFlipEnabled;
        const tileFlipCard = document.getElementById('tileFlipCard');
        if (tileFlipCard) {
            tileFlipCard.style.display = enabled ? '' : 'none';
        }
    }

    applyHousePointsVisibility() {
        const enabled = !!this.pluginSettings.housePointsEnabled;
        const housePointsCard = document.getElementById('housePointsCard');
        if (housePointsCard) {
            housePointsCard.style.display = enabled ? '' : 'none';
        }
    }

    showStudentDashboard() {
        const studentScreen = document.getElementById('studentDashboardScreen');
        const teacherScreen = document.getElementById('teacherDashboardScreen');
        const directorScreen = document.getElementById('directorDashboardScreen');
        
        if (!studentScreen || !teacherScreen) {
            console.error('Required dashboard screens not found in DOM');
            return;
        }
        
        studentScreen.classList.add('active');
        teacherScreen.classList.remove('active');
        if (directorScreen) {
            directorScreen.classList.remove('active');
        }
        
        // Update user info with multiple attempts to ensure it gets set
        this.updateStudentName();
        setTimeout(() => {
            this.updateStudentName();
        }, 100);
        setTimeout(() => {
            this.updateStudentName();
        }, 500);
        
        this.updateStatusDisplay();
        this.updateHistoryDisplay();
        this.updateStudentAnalytics();
        this.updateStudentJournalList();
        this.updateJournalButtonState();
        this.initializeTileFlip();
        this.applyHousePointsVisibility();
        if (this.pluginSettings.housePointsEnabled) {
            this.updateHousePoints();
        }
        this.showScrollPrompt();
    }

    showScrollPrompt() {
        const prompt = document.getElementById('scrollPrompt');
        if (!prompt) return;
        this._removeScrollPromptListener();
        prompt.classList.remove('hidden');
        const onScroll = () => {
            if (window.scrollY > 120) {
                prompt.classList.add('hidden');
                this._removeScrollPromptListener();
            }
        };
        this._scrollPromptListener = onScroll;
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    _removeScrollPromptListener() {
        if (this._scrollPromptListener) {
            window.removeEventListener('scroll', this._scrollPromptListener, { passive: true });
            this._scrollPromptListener = null;
        }
    }

    hideScrollPrompt() {
        const prompt = document.getElementById('scrollPrompt');
        if (prompt) prompt.classList.add('hidden');
        this._removeScrollPromptListener();
    }

    async updateHousePoints() {
        if (!this.currentUser || this.currentUser.user_type !== 'student') {
            return;
        }

        try {
            const response = await APIUtils.getHousePoints(this.currentUser.id);
            if (response.success) {
                const housePointsCard = document.getElementById('housePointsCard');
                const houseBadge = document.getElementById('houseBadge');
                const studentNameCard = document.getElementById('studentNameCard');
                const housePoints = document.getElementById('housePoints');

                if (housePointsCard && houseBadge && studentNameCard && housePoints) {
                    // Set house badge image
                    const houseBadgeMap = {
                        'Bavin': 'images/SP House_Bavin.png',
                        'Bishops': 'images/SP House_Bishops.png',
                        'Dodson': 'images/SP House_Dodson.png',
                        'Mirfield': 'images/SP House_Mirfield.png',
                        'Sage': 'images/SP House_Sage.png'
                    };

                    const house = response.house || this.currentUser.house;
                    if (house && houseBadgeMap[house]) {
                        houseBadge.src = houseBadgeMap[house];
                        houseBadge.alt = `${house} House Badge`;
                    }

                    // Set student name
                    const firstName = this.currentUser.first_name || this.currentUser.firstName || '';
                    const surname = this.currentUser.surname || this.currentUser.lastName || '';
                    studentNameCard.textContent = `${firstName} ${surname}`.trim();

                    // Set house points
                    housePoints.textContent = response.points || 0;

                    // Visibility is controlled by applyHousePointsVisibility()
                }
            }
        } catch (error) {
            console.error('Error updating house points:', error);
        }
    }

    switchHousePointsTab(tab) {
        document.querySelectorAll('.house-points-tab').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
        });
        document.querySelectorAll('.house-points-panel').forEach(panel => {
            const isYour = tab === 'your' && panel.id === 'housePointsPanelYour';
            const isGrade = tab === 'grade' && panel.id === 'housePointsPanelGrade';
            const isSchool = tab === 'school' && panel.id === 'housePointsPanelSchool';
            panel.classList.toggle('active', isYour || isGrade || isSchool);
        });
        if (tab === 'grade') this.loadGradeHousePoints();
        if (tab === 'school') this.loadSchoolHousePoints();
    }

    async loadGradeHousePoints() {
        const el = document.getElementById('gradeHousePointsList');
        if (!el) return;
        el.innerHTML = '<p class="loading-text">Loading...</p>';
        try {
            const response = await APIUtils.getGradeHousePoints();
            if (response.success && response.gradePoints && response.gradePoints.length > 0) {
                el.innerHTML = response.gradePoints.map(row => `
                    <div class="house-points-list-item">
                        <span class="house-points-list-label">${row.grade || 'Unknown'}</span>
                        <span class="house-points-list-value">${parseInt(row.total_points)} points</span>
                    </div>
                `).join('');
            } else {
                el.innerHTML = '<p class="loading-text">No grade points data yet.</p>';
            }
        } catch (e) {
            console.error('Grade house points error:', e);
            el.innerHTML = '<p class="loading-text">Could not load grade points.</p>';
        }
    }

    async loadSchoolHousePoints() {
        const el = document.getElementById('schoolHousePointsList');
        if (!el) return;
        el.innerHTML = '<p class="loading-text">Loading...</p>';
        try {
            const response = await APIUtils.getSchoolHousePoints();
            if (response.success && response.housePoints && response.housePoints.length > 0) {
                const houseBadgeMap = {
                    'Bavin': 'images/SP House_Bavin.png',
                    'Bishops': 'images/SP House_Bishops.png',
                    'Dodson': 'images/SP House_Dodson.png',
                    'Mirfield': 'images/SP House_Mirfield.png',
                    'Sage': 'images/SP House_Sage.png'
                };
                el.innerHTML = response.housePoints.map(row => {
                    const img = houseBadgeMap[row.house] ? `<img src="${houseBadgeMap[row.house]}" alt="${row.house}" class="house-points-list-badge">` : '';
                    return `
                    <div class="house-points-list-item">
                        ${img}
                        <span class="house-points-list-label">${row.house || 'Unknown'}</span>
                        <span class="house-points-list-value">${parseInt(row.total_points)} points</span>
                    </div>
                `;
                }).join('');
            } else {
                el.innerHTML = '<p class="loading-text">No school house points data yet.</p>';
            }
        } catch (e) {
            console.error('School house points error:', e);
            el.innerHTML = '<p class="loading-text">Could not load school points.</p>';
        }
    }

    updateStudentName() {
        const studentNameElement = document.getElementById('studentName');
        const userNameElement = document.getElementById('userName');
        
        
        if (this.currentUser) {
            
            const firstName = this.currentUser.first_name || this.currentUser.firstName || '';
            const surname = this.currentUser.surname || this.currentUser.lastName || '';
            const fullName = `${firstName} ${surname}`.trim();
            
            
            if (studentNameElement) {
                studentNameElement.textContent = fullName;
                // Fallback to innerHTML if textContent doesn't work
                if (studentNameElement.textContent !== fullName) {
                    studentNameElement.innerHTML = fullName;
                }
            } else {
                console.error('Student name element not found!');
            }
            
            if (userNameElement) {
                userNameElement.textContent = fullName;
                // Fallback to innerHTML if textContent doesn't work
                if (userNameElement.textContent !== fullName) {
                    userNameElement.innerHTML = fullName;
                }
            } else {
                console.error('User name element not found!');
            }
        } else {
            console.error('No current user found!');
        }
    }

    showTeacherDashboard() {
        this.hideScrollPrompt();
        const studentScreen = document.getElementById('studentDashboardScreen');
        const teacherScreen = document.getElementById('teacherDashboardScreen');
        const directorScreen = document.getElementById('directorDashboardScreen');
        
        if (!studentScreen || !teacherScreen) {
            console.error('Required dashboard screens not found in DOM');
            return;
        }
        
        studentScreen.classList.remove('active');
        teacherScreen.classList.add('active');
        if (directorScreen) {
            directorScreen.classList.remove('active');
        }
        
        // Update user info
        const teacherNameElement = document.getElementById('teacherName');
        const userNameElement = document.getElementById('userName');
        const teacherCurrentTimeElement = document.getElementById('teacherCurrentTime');
        const teacherCurrentDateElement = document.getElementById('teacherCurrentDate');
        
        if (teacherNameElement) {
            teacherNameElement.textContent = this.currentUser.first_name;
        }
        if (userNameElement) {
            userNameElement.textContent = this.currentUser.first_name;
        }
        if (teacherCurrentTimeElement) {
            teacherCurrentTimeElement.textContent = new Date().toLocaleTimeString();
        }
        if (teacherCurrentDateElement) {
            teacherCurrentDateElement.textContent = new Date().toLocaleDateString();
        }
        
        this.updateTeacherView();
        this.updateTeacherAnalytics();
        this.updateTeacherJournalList();
        this.updateGradeAnalytics();
        this.updateTeacherStatusDisplay();
        
        // Update teacher class display and load check-ins
        this.updateTeacherClassDisplay();
        this.loadTeacherClassCheckins('daily');
        
        // Update teacher filters with a delay to ensure DOM is ready
        setTimeout(() => {
            updateTeacherFilters();
        }, 200);
        
        if (this.pluginSettings.messageCenterEnabled) {
            this.updateUnreadCount();
            this.updateNavUnreadCount();
        }
    }

    showDirectorDashboard() {
        this.hideScrollPrompt();
        const studentScreen = document.getElementById('studentDashboardScreen');
        const teacherScreen = document.getElementById('teacherDashboardScreen');
        const directorScreen = document.getElementById('directorDashboardScreen');
        
        if (!studentScreen || !teacherScreen) {
            console.error('Required dashboard screens not found in DOM');
            return;
        }
        
        if (!directorScreen) {
            console.error('Director dashboard screen not found in DOM');
            return;
        }
        
        studentScreen.classList.remove('active');
        teacherScreen.classList.remove('active');
        directorScreen.classList.add('active');
        
        // Update user info
        const directorNameElement = document.getElementById('directorName');
        const userNameElement = document.getElementById('userName');
        
        if (directorNameElement) {
            directorNameElement.textContent = this.currentUser.first_name;
        }
        if (userNameElement) {
            userNameElement.textContent = this.currentUser.first_name;
        }
        
        // Update date and time
        this.updateDirectorDateTime();
        
        // Load and display modal card data
        this.updateDirectorModalCards();
        
        // Load house points for dashboard card (all 5 houses)
        this.updateDirectorHousePoints();
        
        // Setup modal card click handlers
        this.setupDirectorModalHandlers();
        
        // Initialize charts
        this.initializeDirectorCharts();
        
        // Load journal entries
        this.loadDirectorJournalEntries();
        
        // Load flags
        this.loadDirectorFlags();
        this.setupFlagsHandlers();
        
        // Scan existing journal entries for flags (retroactive)
        this.scanExistingJournalEntries();
        
        if (this.pluginSettings.messageCenterEnabled) {
            this.updateUnreadCount();
            this.updateNavUnreadCount();
        }
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            const response = await APIUtils.getMoodHistory(this.currentUser.id, 'daily');
            if (response.success) {
                this.moodHistory = response.checkins.map(checkin => ({
                    ...checkin,
                    timestamp: new Date(checkin.timestamp)
                }));
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    async loadAllUsers() {
        try {
            const response = await APIUtils.getAllStudents();
            if (response.success) {
                this.allUsers = response.students;
            }
        } catch (error) {
            console.error('Failed to load all users:', error);
        }
    }

    async loadAllMoodHistory() {
        try {
            const response = await APIUtils.getAllMoodCheckins('daily');
            if (response.success) {
                this.allMoodHistory = response.checkins.map(checkin => ({
                    ...checkin,
                    timestamp: new Date(checkin.timestamp)
                }));
            }
        } catch (error) {
            console.error('Failed to load all mood history:', error);
        }
    }

    showMoodModal() {
        // Students: block opening if already checked in today
        if (this.currentUser && this.currentUser.user_type === 'student') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayMoodCount = this.moodHistory.filter(record => record.timestamp >= today).length;
            if (todayMoodCount >= 1) {
                this.showMessage("You've already checked in today.", 'error');
                return;
            }
        }
        document.getElementById('moodModal').classList.add('active');
        this.selectedMood = null;
        this.updateMoodButtons();
        
        // Disable all mood modal buttons initially
        const proceedToEmotions = document.getElementById('proceedToEmotions');
        const confirmMoodCheckin = document.getElementById('confirmMoodCheckin');
        
        if (proceedToEmotions) {
            proceedToEmotions.disabled = true;
        }
        if (confirmMoodCheckin) {
            confirmMoodCheckin.disabled = true;
        }
        
        // Clear notes
        const moodNotes = document.getElementById('moodNotes');
        if (moodNotes) {
            moodNotes.value = '';
        }
    }

    hideMoodModal() {
        document.getElementById('moodModal').classList.remove('active');
    }

    showEmotionModal() {
        // Hide mood modal
        document.getElementById('moodModal').classList.remove('active');
        
        // Show emotion modal
        document.getElementById('emotionModal').classList.add('active');
        
        // Update ghost mode indicator
        const ghostModeEmotionIndicator = document.getElementById('ghostModeEmotionIndicator');
        if (ghostModeEmotionIndicator) {
            ghostModeEmotionIndicator.style.display = this.isGhostMode ? 'block' : 'none';
        }
        
        // Populate emotion options based on selected mood
        this.populateEmotionOptions();
        
        // Initialize emotion selection
        this.selectedEmotions = [];
        this.updateEmotionButtons();
        
        // Disable proceed button initially
        const proceedToLocation = document.getElementById('proceedToLocation');
        if (proceedToLocation) {
            proceedToLocation.disabled = true;
        }
    }

    populateEmotionOptions() {
        const emotionOptions = document.getElementById('emotionOptions');
        if (!emotionOptions) return;

        // Define emotions for each mood
        const moodEmotions = {
            happy: [
                { emotion: 'joyful', emoji: '😄', label: 'Joyful' },
                { emotion: 'excited', emoji: '🤩', label: 'Excited' },
                { emotion: 'grateful', emoji: '🙏', label: 'Grateful' },
                { emotion: 'proud', emoji: '😊', label: 'Proud' },
                { emotion: 'content', emoji: '😌', label: 'Content' },
                { emotion: 'hopeful', emoji: '✨', label: 'Hopeful' }
            ],
            excited: [
                { emotion: 'thrilled', emoji: '🤩', label: 'Thrilled' },
                { emotion: 'energetic', emoji: '⚡', label: 'Energetic' },
                { emotion: 'enthusiastic', emoji: '🎉', label: 'Enthusiastic' },
                { emotion: 'motivated', emoji: '💪', label: 'Motivated' },
                { emotion: 'curious', emoji: '🤔', label: 'Curious' },
                { emotion: 'adventurous', emoji: '🗺️', label: 'Adventurous' }
            ],
            calm: [
                { emotion: 'peaceful', emoji: '☮️', label: 'Peaceful' },
                { emotion: 'relaxed', emoji: '🧘', label: 'Relaxed' },
                { emotion: 'centered', emoji: '⚖️', label: 'Centered' },
                { emotion: 'serene', emoji: '🌅', label: 'Serene' },
                { emotion: 'balanced', emoji: '⚖️', label: 'Balanced' },
                { emotion: 'mindful', emoji: '🧠', label: 'Mindful' }
            ],
            tired: [
                { emotion: 'exhausted', emoji: '😴', label: 'Exhausted' },
                { emotion: 'drained', emoji: '🔋', label: 'Drained' },
                { emotion: 'weary', emoji: '😔', label: 'Weary' },
                { emotion: 'overwhelmed', emoji: '😵', label: 'Overwhelmed' },
                { emotion: 'stressed', emoji: '😰', label: 'Stressed' },
                { emotion: 'burnt-out', emoji: '🔥', label: 'Burnt Out' }
            ],
            anxious: [
                { emotion: 'worried', emoji: '😟', label: 'Worried' },
                { emotion: 'nervous', emoji: '😰', label: 'Nervous' },
                { emotion: 'restless', emoji: '😵', label: 'Restless' },
                { emotion: 'uneasy', emoji: '😕', label: 'Uneasy' },
                { emotion: 'panicked', emoji: '😱', label: 'Panicked' },
                { emotion: 'overwhelmed', emoji: '🌊', label: 'Overwhelmed' }
            ],
            sad: [
                { emotion: 'disappointed', emoji: '😞', label: 'Disappointed' },
                { emotion: 'lonely', emoji: '😢', label: 'Lonely' },
                { emotion: 'hurt', emoji: '💔', label: 'Hurt' },
                { emotion: 'grief', emoji: '🕊️', label: 'Grief' },
                { emotion: 'hopeless', emoji: '😔', label: 'Hopeless' },
                { emotion: 'empty', emoji: '🕳️', label: 'Empty' }
            ],
            angry: [
                { emotion: 'frustrated', emoji: '😤', label: 'Frustrated' },
                { emotion: 'irritated', emoji: '😠', label: 'Irritated' },
                { emotion: 'annoyed', emoji: '😒', label: 'Annoyed' },
                { emotion: 'furious', emoji: '😡', label: 'Furious' },
                { emotion: 'resentful', emoji: '😤', label: 'Resentful' },
                { emotion: 'betrayed', emoji: '🗡️', label: 'Betrayed' }
            ],
            confused: [
                { emotion: 'uncertain', emoji: '🤔', label: 'Uncertain' },
                { emotion: 'lost', emoji: '🧭', label: 'Lost' },
                { emotion: 'bewildered', emoji: '😵', label: 'Bewildered' },
                { emotion: 'conflicted', emoji: '⚔️', label: 'Conflicted' },
                { emotion: 'unsure', emoji: '❓', label: 'Unsure' },
                { emotion: 'disoriented', emoji: '🌀', label: 'Disoriented' }
            ]
        };

        // Get emotions for the selected mood
        const selectedMood = this.selectedMood?.mood || 'happy';
        const emotions = moodEmotions[selectedMood] || moodEmotions.happy;

        // Clear existing options
        emotionOptions.innerHTML = '';

        // Create emotion buttons
        emotions.forEach(emotion => {
            const button = document.createElement('button');
            button.className = 'emotion-btn';
            button.dataset.emotion = emotion.emotion;
            button.innerHTML = `
                <span class="emotion-emoji">${emotion.emoji}</span>
                <span class="emotion-label">${emotion.label}</span>
            `;
            
            // Add click event listener
            button.addEventListener('click', (e) => {
                this.selectEmotion(e.target.closest('.emotion-btn').dataset.emotion);
            });
            
            emotionOptions.appendChild(button);
        });

    }

    hideEmotionModal() {
        document.getElementById('emotionModal').classList.remove('active');
    }

    showLocationModal() {
        // Hide emotion modal
        document.getElementById('emotionModal').classList.remove('active');
        
        // Show location modal
        document.getElementById('locationModal').classList.add('active');
        
        // Update ghost mode indicator
        const ghostModeLocationIndicator = document.getElementById('ghostModeLocationIndicator');
        if (ghostModeLocationIndicator) {
            ghostModeLocationIndicator.style.display = this.isGhostMode ? 'block' : 'none';
        }
        
        // Initialize location selection
        this.selectedLocation = null;
        this.updateLocationButtons();
        
        // Disable confirm button initially
        const confirmMoodCheckin = document.getElementById('confirmMoodCheckin');
        if (confirmMoodCheckin) {
            confirmMoodCheckin.disabled = true;
        }
    }

    hideLocationModal() {
        document.getElementById('locationModal').classList.remove('active');
    }

    showJournalingEncouragementModal() {
        // Show the journaling modal
        document.getElementById('journalingModal').classList.add('active');
        
        // Update ghost mode indicator
        const ghostModeJournalingIndicator = document.getElementById('ghostModeJournalingIndicator');
        if (ghostModeJournalingIndicator) {
            ghostModeJournalingIndicator.style.display = this.isGhostMode ? 'block' : 'none';
        }
        
        // Clear any existing journal entry
        const journalEntry = document.getElementById('journalEntry');
        if (journalEntry) {
            journalEntry.value = '';
            this.updateJournalCharacterCount('');
        }
        
        // Set up journaling modal event listeners if not already set
        this.setupJournalingModalListeners();
    }

    hideJournalingEncouragementModal() {
        document.getElementById('journalingModal').classList.remove('active');
    }

    setupJournalingModalListeners() {
        // Skip journaling button
        const skipJournaling = document.getElementById('skipJournaling');
        if (skipJournaling && !skipJournaling.hasAttribute('data-listener-added')) {
            skipJournaling.addEventListener('click', () => {
                this.hideJournalingEncouragementModal();
            });
            skipJournaling.setAttribute('data-listener-added', 'true');
        }

        // Save journal entry button
        const saveJournalEntry = document.getElementById('saveJournalEntry');
        if (saveJournalEntry && !saveJournalEntry.hasAttribute('data-listener-added')) {
            saveJournalEntry.addEventListener('click', () => {
                this.handleJournalingEntry();
            });
            saveJournalEntry.setAttribute('data-listener-added', 'true');
        }

        // Close modal button
        const closeJournalingModal = document.getElementById('closeJournalingModal');
        if (closeJournalingModal && !closeJournalingModal.hasAttribute('data-listener-added')) {
            closeJournalingModal.addEventListener('click', () => {
                this.hideJournalingEncouragementModal();
            });
            closeJournalingModal.setAttribute('data-listener-added', 'true');
        }

        // Journal entry character count
        const journalEntry = document.getElementById('journalEntry');
        if (journalEntry && !journalEntry.hasAttribute('data-listener-added')) {
            journalEntry.addEventListener('input', (e) => {
                this.updateJournalCharacterCount(e.target.value);
            });
            journalEntry.setAttribute('data-listener-added', 'true');
        }
    }

    updateJournalCharacterCount(text) {
        const countElement = document.getElementById('characterCount');
        if (countElement) {
            countElement.textContent = text.length;
        }
    }

    async handleJournalingEntry() {
        if (!this.currentUser) return;

        const entryText = document.getElementById('journalEntry').value.trim();
        
        if (!entryText) {
            this.showMessage('Please enter some text for your journal entry.', 'error');
            return;
        }

        try {
            const response = await APIUtils.saveJournalEntry({
                userId: this.currentUser.id,
                entry: entryText
            });

            if (response.success) {
                // Process flagging for journal entry (only for students)
                if (this.currentUser.user_type === 'student') {
                    if (typeof processJournalEntryFlagging === 'function') {
                        try {
                            console.log('Calling processJournalEntryFlagging for entry:', entryText);
                            // Pass entry ID and timestamp from response to prevent duplicates
                            const entryId = response.journalEntry?.id || null;
                            const entryTimestamp = response.journalEntry?.timestamp || null;
                            await processJournalEntryFlagging(entryText, this.currentUser, this.isGhostMode || false, false, entryId, entryTimestamp);
                        } catch (flagError) {
                            console.error('Error processing journal entry flagging:', flagError);
                            console.error('Error details:', flagError.message, flagError.stack);
                            // Don't block journal entry save if flagging fails
                        }
                    } else {
                        console.warn('processJournalEntryFlagging function not available');
                    }
                }
                
                // Add new entry to journalEntries array
                const newEntry = {
                    id: Date.now(), // Simple ID generation
                    title: entryText.substring(0, 50) + (entryText.length > 50 ? '...' : ''),
                    content: entryText,
                    timestamp: new Date().toLocaleString(),
                    mood: 'Reflective'
                };
                this.journalEntries.push(newEntry);
                
                this.hideJournalingEncouragementModal();
                this.showMessage('Journal entry saved successfully!', 'success');
                
                // Update journal display
                if (this.currentUser.user_type === 'student') {
                    this.studentJournalEntriesToday = this.studentJournalEntriesToday || [];
                    if (response.journalEntry) this.studentJournalEntriesToday.push(response.journalEntry);
                    this.updateJournalButtonState();
                    this.updateStudentJournalList();
                    this.refreshTileFlipStatus(); // Fetch fresh status so flips are immediately usable
                } else if (this.currentUser.user_type === 'teacher') {
                    this.updateTeacherJournalList();
                    this.updateTeacherStatusDisplay(); // Update the journal counter
                }
            } else {
                this.showMessage(response.error || 'Failed to save journal entry. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Journal entry error:', error);
            this.showMessage(error.message || 'Failed to save journal entry. Please try again.', 'error');
        }
    }

    updateLocationButtons() {
        document.querySelectorAll('.location-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.location === this.selectedLocation) {
                btn.classList.add('selected');
            }
        });
        
        // Enable/disable confirm button based on selection
        const confirmMoodCheckin = document.getElementById('confirmMoodCheckin');
        if (confirmMoodCheckin) {
            confirmMoodCheckin.disabled = !this.selectedLocation;
        }
    }

    selectLocation(location) {
        this.selectedLocation = location;
        this.selectedReasons = []; // Reset selected reasons
        this.updateLocationButtons();
        
        // Show/hide reason sections and other location input based on user type
        this.showReasonSectionForLocation(location);
    }

    showReasonSectionForLocation(location) {
        const isTeacher = this.currentUser && this.currentUser.user_type === 'teacher';
        
        // Get all reason sections
        const schoolReasons = document.getElementById('schoolReasons');
        const homeReasons = document.getElementById('homeReasons');
        const teacherSchoolReasons = document.getElementById('teacherSchoolReasons');
        const teacherHomeReasons = document.getElementById('teacherHomeReasons');
        const otherLocationInput = document.getElementById('otherLocationInput');
        
        // Hide all reason sections first
        [schoolReasons, homeReasons, teacherSchoolReasons, teacherHomeReasons].forEach(section => {
            if (section) section.style.display = 'none';
        });
        
        // Show appropriate sections based on location and user type
        if (location === 'school') {
            if (isTeacher && teacherSchoolReasons) {
                teacherSchoolReasons.style.display = 'block';
            } else if (schoolReasons) {
                schoolReasons.style.display = 'block';
            }
        } else if (location === 'home') {
            if (isTeacher && teacherHomeReasons) {
                teacherHomeReasons.style.display = 'block';
            } else if (homeReasons) {
                homeReasons.style.display = 'block';
            }
        }
        
        // Show other location input for any user type
        if (otherLocationInput) {
            otherLocationInput.style.display = location === 'other' ? 'block' : 'none';
        }
        
        // Clear any previously selected reasons
        this.clearReasonSelections();
        
        // Set up reason toggle event listeners for the visible section
        this.setupReasonToggleListeners();
        
    }

    clearReasonSelections() {
        // Clear all reason checkboxes
        document.querySelectorAll('.reason-toggle input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.selectedReasons = [];
    }

    setupReasonToggleListeners() {
        
        // Remove existing listeners to avoid duplicates
        document.querySelectorAll('.reason-toggle').forEach(toggle => {
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
        });

        // Add event listeners to reason checkboxes
        const checkboxes = document.querySelectorAll('.reason-toggle input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const reason = e.target.value;
                this.selectReason(reason);
            });
        });
    }

    selectReason(reason) {
        // Find the checkbox for this reason
        const checkbox = document.querySelector(`input[value="${reason}"]`);
        const isChecked = checkbox ? checkbox.checked : false;
        
        if (isChecked) {
            // Add reason if checkbox is checked and not already in array
            if (!this.selectedReasons.includes(reason)) {
                this.selectedReasons.push(reason);
            }
        } else {
            // Remove reason if checkbox is unchecked
            this.selectedReasons = this.selectedReasons.filter(r => r !== reason);
        }
    }

    toggleGhostMode(isEnabled) {
        if (isEnabled && !this.pluginSettings.ghostModeEnabled) {
            const t = document.getElementById('ghostModeToggle');
            if (t) t.checked = false;
            return;
        }
        // Update ghost mode status display
        const ghostModeStatus = document.getElementById('ghostModeStatus');
        if (ghostModeStatus) {
            ghostModeStatus.style.display = isEnabled ? 'block' : 'none';
        }
        
        // Update modal indicators
        const modalIndicators = document.querySelectorAll('.ghost-mode-modal-indicator');
        modalIndicators.forEach(indicator => {
            indicator.style.display = isEnabled ? 'block' : 'none';
        });
        
        // Store ghost mode state
        this.isGhostMode = isEnabled;
        
        console.log('Ghost mode state updated:', this.isGhostMode);
    }

    selectMood(mood, emoji) {
        this.selectedMood = { mood, emoji };
        this.updateMoodButtons();
        
        // Enable the correct button based on the modal step
        const proceedToEmotions = document.getElementById('proceedToEmotions');
        const confirmMoodCheckin = document.getElementById('confirmMoodCheckin');
        
        if (proceedToEmotions) {
            proceedToEmotions.disabled = false;
        }
        if (confirmMoodCheckin) {
            confirmMoodCheckin.disabled = false;
        }
    }

    updateMoodButtons() {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.mood === this.selectedMood?.mood) {
                btn.classList.add('selected');
            }
        });
    }

    updateEmotionButtons() {
        document.querySelectorAll('.emotion-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (this.selectedEmotions.includes(btn.dataset.emotion)) {
                btn.classList.add('selected');
            }
        });
        
        // Enable/disable proceed button based on selection
        const proceedToLocation = document.getElementById('proceedToLocation');
        if (proceedToLocation) {
            proceedToLocation.disabled = this.selectedEmotions.length === 0;
        }
    }

    selectEmotion(emotion) {
        if (!this.selectedEmotions) {
            this.selectedEmotions = [];
        }
        
        const index = this.selectedEmotions.indexOf(emotion);
        if (index > -1) {
            this.selectedEmotions.splice(index, 1);
        } else {
            this.selectedEmotions.push(emotion);
        }
        
        this.updateEmotionButtons();
    }

    async handleMoodCheckIn() {
        if (!this.selectedMood || !this.currentUser) {
            return;
        }

        const notes = document.getElementById('moodNotes').value;
        
        try {
            // Prepare data for API call
            const moodData = {
                userId: this.currentUser.id,
                mood: this.selectedMood.mood,
                emoji: this.selectedMood.emoji,
                notes: notes
            };
            
            // Add new fields if available
            if (this.selectedLocation) {
                moodData.location = this.selectedLocation;
            }
            if (this.selectedReasons && this.selectedReasons.length > 0) {
                moodData.reasons = this.selectedReasons;
            }
            if (this.selectedEmotions && this.selectedEmotions.length > 0) {
                moodData.emotions = this.selectedEmotions;
            }
            
            // Save to database
            const response = await APIUtils.saveMoodCheckin(moodData);

            if (response.success) {
                const moodRecord = {
                    ...response.checkin,
                    timestamp: new Date(response.checkin.timestamp)
                };

                this.moodHistory.unshift(moodRecord);
                this.allMoodHistory.unshift(moodRecord);
                
                // Update house points after check-in
                if (this.currentUser.user_type === 'student') {
                    this.updateHousePoints();
                }
                
                this.hideLocationModal(); // Hide location modal
                this.updateStatusDisplay();
                this.updateHistoryDisplay();
                
                // Update appropriate analytics based on user type
                if (this.currentUser.user_type === 'student') {
                    this.updateStudentAnalytics();
                } else if (this.currentUser.user_type === 'teacher') {
                    this.updateTeacherAnalytics();
                    this.updateTeacherStatusDisplay();
                }
                
                this.showMessage(`Mood recorded: ${this.selectedMood.emoji} ${this.selectedMood.mood}!`, 'success');
                
                // Show journaling encouragement modal after successful check-in
                setTimeout(() => {
                    this.showJournalingEncouragementModal();
                }, 1000);
            } else {
                this.showMessage(response.error || 'Failed to save mood check-in. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Mood check-in error:', error);
            this.showMessage(error.message || 'Failed to save mood check-in. Please try again.', 'error');
        }
    }

    updateStatusDisplay() {
        const lastMoodElement = document.getElementById('lastMood');
        const todayCountElement = document.getElementById('todayCount');
        const moodCheckInBtn = document.getElementById('moodCheckInBtn');
        
        // Get the most recent mood check-in
        const lastMoodRecord = this.moodHistory.find(record => record.mood);
        
        if (lastMoodRecord) {
            lastMoodElement.textContent = `${lastMoodRecord.emoji} ${lastMoodRecord.mood}`;
            lastMoodElement.className = 'status-value mood-recorded';
        } else {
            lastMoodElement.textContent = 'No mood recorded';
            lastMoodElement.className = 'status-value no-mood';
        }
        
        // Count today's mood check-ins
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayMoodCount = this.moodHistory.filter(record => 
            record.timestamp >= today
        ).length;
        
        todayCountElement.textContent = todayMoodCount.toString();
        todayCountElement.className = 'status-value today-count';
        
        // Students: disable check-in button after one check-in today
        if (moodCheckInBtn && this.currentUser && this.currentUser.user_type === 'student') {
            const alreadyCheckedIn = todayMoodCount >= 1;
            moodCheckInBtn.disabled = alreadyCheckedIn;
            moodCheckInBtn.classList.toggle('btn-mood-checkin--disabled', alreadyCheckedIn);
            moodCheckInBtn.textContent = alreadyCheckedIn ? '✓ Already checked in today' : '😊 How are you feeling?';
        }
    }

    updateTeacherStatusDisplay() {
        const teacherLastMoodElement = document.getElementById('teacherLastMood');
        const teacherTodayCountElement = document.getElementById('teacherTodayCount');
        const teacherJournalCountElement = document.getElementById('teacherJournalCount');
        const teacherCheckInCountElement = document.getElementById('teacherCheckInCount');
        
        if (!teacherLastMoodElement || !teacherTodayCountElement || !teacherJournalCountElement || !teacherCheckInCountElement) return;
        
        // Get the most recent mood check-in for teacher
        const lastMoodRecord = this.moodHistory.find(record => record.mood);
        
        if (lastMoodRecord) {
            teacherLastMoodElement.textContent = `${lastMoodRecord.emoji} ${lastMoodRecord.mood}`;
            teacherLastMoodElement.className = 'status-value mood-recorded';
        } else {
            teacherLastMoodElement.textContent = 'No mood recorded';
            teacherLastMoodElement.className = 'status-value no-mood';
        }
        
        // Count today's mood check-ins for teacher
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayMoodCount = this.moodHistory.filter(record => 
            record.timestamp >= today
        ).length;
        
        teacherTodayCountElement.textContent = todayMoodCount.toString();
        teacherTodayCountElement.className = 'status-value today-count';
        
        // Count journal entries for teacher (standalone + mood check-in notes)
        let journalCount = this.journalEntries ? this.journalEntries.length : 0;
        
        // Add journal entries from mood check-ins (notes field)
        if (this.moodHistory && this.moodHistory.length > 0) {
            const moodJournalCount = this.moodHistory.filter(record => 
                record.notes && record.notes.trim() !== ''
            ).length;
            journalCount += moodJournalCount;
        }
        
        teacherJournalCountElement.textContent = journalCount.toString();
        teacherJournalCountElement.className = 'status-value journal-count';
        
        // Count total check-ins for teacher
        const totalCheckIns = this.moodHistory ? this.moodHistory.length : 0;
        teacherCheckInCountElement.textContent = totalCheckIns.toString();
        teacherCheckInCountElement.className = 'status-value checkin-count';
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        const recentHistory = this.moodHistory.slice(0, 6); // Show up to 6 for 2x3 grid
        
        if (recentHistory.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No mood check-ins yet.</p>';
            return;
        }
        
        // Create physics container
        const physicsContainer = document.createElement('div');
        physicsContainer.className = 'physics-mood-container';
        
        recentHistory.forEach((record, index) => {
            const moodBox = this.createPhysicsMoodBox(record, index);
            physicsContainer.appendChild(moodBox);
        });
        
        historyList.appendChild(physicsContainer);
        
        // Initialize physics for all mood boxes
        this.initializePhysics();
    }

    createPhysicsMoodBox(record, index) {
        const moodBox = document.createElement('div');
        moodBox.className = 'physics-mood-item';
        moodBox.dataset.moodIndex = index;
        
        const time = record.timestamp.toLocaleString();
        const mood = record.mood.charAt(0).toUpperCase() + record.mood.slice(1);
        
        moodBox.innerHTML = `
            <div class="orbital-mood-center">
                <div class="orbital-mood-emoji">${record.emoji}</div>
                <div class="orbital-mood-text">${mood}</div>
                <div class="orbital-mood-time">${time}</div>
            </div>
        `;
        
        // Create physics elements
        this.createPhysicsElements(moodBox, record);
        
        return moodBox;
    }

    createPhysicsElements(moodBox, record) {
        const elements = [];
        
        // Add location element
        if (record.location) {
            const locationDisplay = this.getLocationDisplay(record.location);
            const element = this.createPhysicsElement('location', locationDisplay, moodBox);
            elements.push(element);
        }

        // Add emotion elements
        if (record.emotions && record.emotions.length > 0) {
            record.emotions.forEach(emotion => {
                const emotionDisplay = this.getEmotionDisplay(emotion);
                const element = this.createPhysicsElement('emotion', emotionDisplay, moodBox);
                elements.push(element);
            });
        }

        // Add reason elements
        if (record.reasons && record.reasons.length > 0) {
            record.reasons.forEach(reason => {
                const reasonDisplay = this.getReasonDisplay(reason);
                const element = this.createPhysicsElement('reason', reasonDisplay, moodBox);
                elements.push(element);
            });
        }

        // Add notes element
        if (record.notes) {
            const element = this.createPhysicsElement('notes', `📝 ${record.notes}`, moodBox);
            elements.push(element);
        }
    }

    createPhysicsElement(type, content, moodBox) {
        const element = document.createElement('div');
        element.className = `physics-element physics-${type}`;
        element.textContent = content;
        element.dataset.type = type;
        
        // Random initial position
        const boxRect = moodBox.getBoundingClientRect();
        const elementSize = 60; // Approximate element size
        const x = Math.random() * (boxRect.width - elementSize);
        const y = Math.random() * (boxRect.height - elementSize);
        
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        
        // Store physics properties
        element.physics = {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2, // Random velocity
            vy: (Math.random() - 0.5) * 2,
            size: elementSize,
            type: type
        };
        
        moodBox.appendChild(element);
        return element;
    }

    initializePhysics() {
        // Clear any existing physics intervals
        if (this.physicsInterval) {
            clearInterval(this.physicsInterval);
        }
        
        // Start physics simulation
        this.physicsInterval = setInterval(() => {
            this.updatePhysics();
        }, 16); // ~60fps
    }

    updatePhysics() {
        const moodBoxes = document.querySelectorAll('.physics-mood-item');
        
        moodBoxes.forEach(moodBox => {
            const elements = moodBox.querySelectorAll('.physics-element');
            const boxRect = moodBox.getBoundingClientRect();
            const mousePos = this.getMousePosition(moodBox);
            
            elements.forEach(element => {
                if (!element.physics) return;
                
                const physics = element.physics;
                const elementSize = physics.size;
                
                // Mouse avoidance
                if (mousePos) {
                    const dx = physics.x - mousePos.x;
                    const dy = physics.y - mousePos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const avoidanceRadius = 100;
                    
                    if (distance < avoidanceRadius) {
                        const force = (avoidanceRadius - distance) / avoidanceRadius;
                        physics.vx += (dx / distance) * force * 0.5;
                        physics.vy += (dy / distance) * force * 0.5;
                    }
                }
                
                // Collision detection with other elements
                elements.forEach(otherElement => {
                    if (otherElement === element || !otherElement.physics) return;
                    
                    const other = otherElement.physics;
                    const dx = physics.x - other.x;
                    const dy = physics.y - other.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = (physics.size + other.size) / 2;
                    
                    if (distance < minDistance && distance > 0) {
                        // Collision response
                        const overlap = minDistance - distance;
                        const separationX = (dx / distance) * overlap * 0.5;
                        const separationY = (dy / distance) * overlap * 0.5;
                        
                        physics.x += separationX;
                        physics.y += separationY;
                        other.x -= separationX;
                        other.y -= separationY;
                        
                        // Bounce effect
                        const bounce = 0.3;
                        physics.vx += (dx / distance) * bounce;
                        physics.vy += (dy / distance) * bounce;
                        other.vx -= (dx / distance) * bounce;
                        other.vy -= (dy / distance) * bounce;
                    }
                });
                
                // Boundary collision
                if (physics.x < 0) {
                    physics.x = 0;
                    physics.vx = Math.abs(physics.vx) * 0.8;
                }
                if (physics.x > boxRect.width - elementSize) {
                    physics.x = boxRect.width - elementSize;
                    physics.vx = -Math.abs(physics.vx) * 0.8;
                }
                if (physics.y < 0) {
                    physics.y = 0;
                    physics.vy = Math.abs(physics.vy) * 0.8;
                }
                if (physics.y > boxRect.height - elementSize) {
                    physics.y = boxRect.height - elementSize;
                    physics.vy = -Math.abs(physics.vy) * 0.8;
                }
                
                // Apply velocity
                physics.x += physics.vx;
                physics.y += physics.vy;
                
                // Apply friction
                physics.vx *= 0.98;
                physics.vy *= 0.98;
                
                // Update position
                element.style.left = `${physics.x}px`;
                element.style.top = `${physics.y}px`;
            });
        });
    }

    getMousePosition(moodBox) {
        const rect = moodBox.getBoundingClientRect();
        return {
            x: this.mouseX - rect.left,
            y: this.mouseY - rect.top
        };
    }

    getEmotionDisplay(emotion) {
        const emotionMap = {
            'excited': '😃 Excited',
            'grateful': '🙏 Grateful', 
            'confident': '💪 Confident',
            'peaceful': '😌 Peaceful',
            'hopeful': '🌟 Hopeful',
            'proud': '🏆 Proud',
            'anxious': '😰 Anxious',
            'frustrated': '😤 Frustrated',
            'overwhelmed': '😵 Overwhelmed',
            'lonely': '😔 Lonely',
            'angry': '😠 Angry',
            'sad': '😢 Sad',
            'tired': '😴 Tired',
            'confused': '😕 Confused',
            'worried': '😟 Worried',
            'disappointed': '😞 Disappointed'
        };
        return emotionMap[emotion] || `😊 ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`;
    }

    getReasonDisplay(reason) {
        const reasonMap = {
            'friends': '👥 Friends',
            'teacher': '👨‍🏫 Teacher',
            'schoolwork': '📚 School Work',
            'tests': '📝 Tests',
            'sports': '⚽ Sports',
            'classmates': '👫 Classmates',
            'parents': '👨‍👩‍👧‍👦 Parents',
            'siblings': '👫 Siblings',
            'family': '👨‍👩‍👧‍👦 Family',
            'sleep': '😴 Sleep',
            'food': '🍕 Food',
            'health': '🏥 Health'
        };
        return reasonMap[reason] || `📍 ${reason.charAt(0).toUpperCase() + reason.slice(1)}`;
    }

    getLocationDisplay(location) {
        const locationMap = {
            'school': '🏫 School',
            'home': '🏠 Home',
            'other': '📍 Other'
        };
        return locationMap[location] || `📍 ${location.charAt(0).toUpperCase() + location.slice(1)}`;
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleString();
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // Insert message at the top of main content
        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(messageDiv, mainContent.firstChild);
        
        // Auto-remove message after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    async updateStudentAnalytics() {
        const analyticsContent = document.getElementById('studentAnalytics');
        if (!analyticsContent) return;

        const activeTab = document.querySelector('.analytics-tab.active');
        const period = activeTab ? activeTab.dataset.period : 'daily';

        try {
            // Fetch fresh data from database
            const response = await APIUtils.getMoodHistory(this.currentUser.id, period);
            if (response.success) {
                const moodCounts = this.getMoodCounts(response.checkins);
                analyticsContent.innerHTML = this.generateAnalyticsHTML(moodCounts, period);
            } else {
                // Fallback to local data if database fails
                const filteredHistory = this.getFilteredHistory(period);
                const moodCounts = this.getMoodCounts(filteredHistory);
                analyticsContent.innerHTML = this.generateAnalyticsHTML(moodCounts, period);
            }
        } catch (error) {
            console.error('Analytics error:', error);
            // Fallback to local data
            const filteredHistory = this.getFilteredHistory(period);
            const moodCounts = this.getMoodCounts(filteredHistory);
            analyticsContent.innerHTML = this.generateAnalyticsHTML(moodCounts, period);
        }
    }

    async updateTeacherAnalytics() {
        const analyticsContent = document.getElementById('teacherAnalytics');
        if (!analyticsContent) return;

        const activeTab = document.querySelector('.analytics-tab.active');
        const period = activeTab ? activeTab.dataset.period : 'daily';

        try {
            // For demo purposes, generate sample analytics data
            const demoMoodData = this.getDemoMoodData(period);
            const moodCounts = this.getMoodCounts(demoMoodData);
            analyticsContent.innerHTML = this.generateAnalyticsHTML(moodCounts, period);
        } catch (error) {
            console.error('Teacher analytics error:', error);
            // Fallback to demo data
            const demoMoodData = this.getDemoMoodData(period);
            const moodCounts = this.getMoodCounts(demoMoodData);
            analyticsContent.innerHTML = this.generateAnalyticsHTML(moodCounts, period);
        }
    }

    getDemoMoodData(period) {
        // Generate demo mood data based on period
        const now = new Date();
        const moods = ['happy', 'excited', 'calm', 'tired', 'anxious', 'sad', 'angry', 'confused'];
        const emojis = ['😊', '🤩', '😌', '😴', '😰', '😢', '😠', '😕'];
        const demoData = [];

        let daysBack = 1;
        switch (period) {
            case 'weekly':
                daysBack = 7;
                break;
            case 'monthly':
                daysBack = 30;
                break;
            case 'yearly':
                daysBack = 365;
                break;
        }

        // Generate random mood data for the period
        for (let i = 0; i < daysBack; i++) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const numCheckins = Math.floor(Math.random() * 8) + 2; // 2-9 checkins per day

            for (let j = 0; j < numCheckins; j++) {
                const moodIndex = Math.floor(Math.random() * moods.length);
                const timestamp = new Date(date.getTime() + j * 60 * 60 * 1000); // Spread throughout the day

                demoData.push({
                    mood: moods[moodIndex],
                    emoji: emojis[moodIndex],
                    timestamp: timestamp,
                    user_id: `demo_student_${Math.floor(Math.random() * 6) + 1}`
                });
            }
        }

        return demoData;
    }

    getFilteredHistory(period, allUsers = false) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'daily':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'yearly':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(0);
        }

        const history = allUsers ? this.allMoodHistory : this.moodHistory;
        return history.filter(record => record.timestamp >= startDate);
    }

    getMoodCounts(history) {
        const counts = {};
        history.forEach(record => {
            counts[record.mood] = (counts[record.mood] || 0) + 1;
        });
        return counts;
    }

    generateAnalyticsHTML(moodCounts, period) {
        const total = Object.values(moodCounts).reduce((sum, count) => sum + count, 0);
        
        if (total === 0) {
            return `<p style="text-align: center; color: #666; padding: 2rem;">No mood data for ${period} view.</p>`;
        }

        const moodEmojis = {
            happy: '😊',
            excited: '🤩',
            calm: '😌',
            tired: '😴',
            anxious: '😰',
            sad: '😢',
            angry: '😠',
            confused: '😕'
        };

        let html = `<div class="analytics-summary">
            <h4>Total Check-ins: ${total}</h4>
            <div class="mood-breakdown">`;

        Object.entries(moodCounts).forEach(([mood, count]) => {
            const percentage = ((count / total) * 100).toFixed(1);
            html += `
                <div class="mood-stat">
                    <span class="mood-emoji">${moodEmojis[mood] || '😊'}</span>
                    <span class="mood-name">${mood.charAt(0).toUpperCase() + mood.slice(1)}</span>
                    <span class="mood-count">${count} (${percentage}%)</span>
                </div>
            `;
        });

        html += `</div></div>`;
        return html;
    }

    async switchAnalyticsTab(period) {
        // Update tab states
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-period="${period}"]`).classList.add('active');

        // Update analytics
        if (this.currentUser.user_type === 'student') {
            await this.updateStudentAnalytics();
        } else {
            await this.updateTeacherAnalytics();
        }
    }

    async updateTeacherView() {
        const studentsList = document.getElementById('studentsList');
        if (!studentsList) return;

        try {
            // For demo purposes, create sample students
            const demoStudents = this.getDemoStudents();
            
            studentsList.innerHTML = '';

            if (demoStudents.length === 0) {
                studentsList.innerHTML = `
                    <div class="no-students-message">
                        <p style="text-align: center; color: #666; padding: 2rem;">
                            No students found in your assigned grade and house.
                        </p>
                    </div>
                `;
                return;
            }

            // Load mood history for all students
            await this.loadAllMoodHistory();

            demoStudents.forEach(student => {
                const studentItem = document.createElement('div');
                studentItem.className = 'student-item';

                const lastMood = this.getLastMoodForStudent(student.id);
                const moodEmoji = lastMood ? lastMood.emoji : student.defaultMood;

                studentItem.innerHTML = `
                    <div class="student-info">
                        <h4>${student.first_name} ${student.surname}</h4>
                        <div class="student-details">
                            ${student.class} • ${student.house}
                        </div>
                    </div>
                    <div class="student-mood">
                        ${moodEmoji}
                    </div>
                `;

                studentsList.appendChild(studentItem);
            });
        } catch (error) {
            console.error('Failed to update teacher view:', error);
            studentsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Failed to load students.</p>';
        }
    }

    getDemoStudents() {
        // Create demo students based on teacher's assignment
        const teacherGrade = this.currentUser.class || 'Grade 6';
        const teacherHouse = this.currentUser.house || 'Mirfield';
        
        const demoStudents = [
            {
                id: 'demo_student_1',
                first_name: 'Alex',
                surname: 'Johnson',
                class: teacherGrade,
                house: teacherHouse,
                defaultMood: '😊'
            },
            {
                id: 'demo_student_2',
                first_name: 'Sarah',
                surname: 'Williams',
                class: teacherGrade,
                house: teacherHouse,
                defaultMood: '🤩'
            },
            {
                id: 'demo_student_3',
                first_name: 'Michael',
                surname: 'Brown',
                class: teacherGrade,
                house: teacherHouse,
                defaultMood: '😌'
            },
            {
                id: 'demo_student_4',
                first_name: 'Emma',
                surname: 'Davis',
                class: teacherGrade,
                house: teacherHouse,
                defaultMood: '😴'
            },
            {
                id: 'demo_student_5',
                first_name: 'James',
                surname: 'Wilson',
                class: teacherGrade,
                house: teacherHouse,
                defaultMood: '😰'
            },
            {
                id: 'demo_student_6',
                first_name: 'Olivia',
                surname: 'Miller',
                class: teacherGrade,
                house: teacherHouse,
                defaultMood: '😢'
            }
        ];

        return demoStudents;
    }

    getLastMoodForStudent(studentId) {
        return this.allMoodHistory
            .filter(record => record.user_id === studentId)
            .sort((a, b) => b.timestamp - a.timestamp)[0];
    }

    startMoodEmojiAnimation() {
        const moodEmojiElement = document.getElementById('moodEmoji');
        if (!moodEmojiElement) return;

        // Update emoji every 1 second
        setInterval(() => {
            this.currentEmojiIndex = (this.currentEmojiIndex + 1) % this.moodEmojis.length;
            moodEmojiElement.textContent = this.moodEmojis[this.currentEmojiIndex];
        }, 1000);
    }

    updatePasswordStrength(elementId, password) {
        const strengthElement = document.getElementById(elementId);
        if (!strengthElement || !password) {
            if (strengthElement) {
                strengthElement.className = 'password-strength';
            }
            return;
        }

        const validation = SecurityUtils.validatePasswordStrength(password);
        strengthElement.className = `password-strength ${validation.strength.toLowerCase().replace(' ', '-')}`;
    }

    // Journal entry methods
    showJournalEntryModal() {
        // Students: block opening if already did journal today
        if (this.currentUser && this.currentUser.user_type === 'student') {
            const count = (this.studentJournalEntriesToday || []).length;
            if (count >= 1) {
                this.showMessage("You've already done your journal entry today.", 'error');
                return;
            }
        }
        document.getElementById('journalEntryModal').classList.add('active');
        document.getElementById('journalEntryText').value = '';
        this.updateJournalCharacterCount('');
    }

    hideJournalEntryModal() {
        document.getElementById('journalEntryModal').classList.remove('active');
    }

    updateJournalCharacterCount(text) {
        const countElement = document.getElementById('journalCharacterCount');
        if (countElement) {
            countElement.textContent = text.length;
        }
    }

    async handleJournalEntry() {
        if (!this.currentUser) return;

        const entryText = document.getElementById('journalEntryText').value.trim();
        
        if (!entryText) {
            this.showMessage('Please enter some text for your journal entry.', 'error');
            return;
        }

        try {
            // Save to database
            const response = await APIUtils.saveJournalEntry({
                userId: this.currentUser.id,
                entry: entryText
            });

            if (response.success) {
                // Process flagging for journal entry (only for students)
                if (this.currentUser.user_type === 'student') {
                    if (typeof processJournalEntryFlagging === 'function') {
                        try {
                            console.log('Calling processJournalEntryFlagging for entry:', entryText);
                            // Pass entry ID and timestamp from response to prevent duplicates
                            const entryId = response.journalEntry?.id || null;
                            const entryTimestamp = response.journalEntry?.timestamp || null;
                            await processJournalEntryFlagging(entryText, this.currentUser, this.isGhostMode || false, false, entryId, entryTimestamp);
                        } catch (flagError) {
                            console.error('Error processing journal entry flagging:', flagError);
                            console.error('Error details:', flagError.message, flagError.stack);
                            // Don't block journal entry save if flagging fails
                        }
                    } else {
                        console.warn('processJournalEntryFlagging function not available');
                    }
                }
                
                // Add new entry to journalEntries array
                const newEntry = {
                    id: Date.now(), // Simple ID generation
                    title: entryText.substring(0, 50) + (entryText.length > 50 ? '...' : ''),
                    content: entryText,
                    timestamp: new Date().toLocaleString(),
                    mood: 'Reflective'
                };
                this.journalEntries.push(newEntry);
                
                this.hideJournalEntryModal();
                this.showMessage('Journal entry saved successfully!', 'success');
                
                // Update journal display based on user type
                if (this.currentUser.user_type === 'student') {
                    this.studentJournalEntriesToday = this.studentJournalEntriesToday || [];
                    this.studentJournalEntriesToday.push(response.journalEntry);
                    this.updateJournalButtonState();
                    this.updateStudentJournalList();
                    this.refreshTileFlipStatus(); // Fetch fresh status so flips are immediately usable
                    this.updateHousePoints(); // Update house points after journal entry
                } else if (this.currentUser.user_type === 'teacher') {
                    this.updateTeacherJournalList();
                    this.updateTeacherStatusDisplay(); // Update the journal counter
                }
            } else {
                this.showMessage(response.error || 'Failed to save journal entry. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Journal entry error:', error);
            this.showMessage(error.message || 'Failed to save journal entry. Please try again.', 'error');
        }
    }

    async updateStudentJournalList() {
        const journalList = document.getElementById('journalList');
        if (!journalList) return;

        try {
            const response = await APIUtils.getJournalEntries(this.currentUser.id, 'daily');
            if (response.success) {
                this.studentJournalEntriesToday = response.entries || [];
                this.displayJournalEntries(journalList, this.studentJournalEntriesToday);
                this.updateJournalButtonState();
            }
        } catch (error) {
            console.error('Failed to load journal entries:', error);
        }
    }

    updateJournalButtonState() {
        const journalEntryBtn = document.getElementById('journalEntryBtn');
        if (!journalEntryBtn || !this.currentUser || this.currentUser.user_type !== 'student') return;
        const count = (this.studentJournalEntriesToday || []).length;
        const alreadyDidJournal = count >= 1;
        journalEntryBtn.disabled = alreadyDidJournal;
        journalEntryBtn.classList.toggle('btn-journal-entry--disabled', alreadyDidJournal);
        journalEntryBtn.textContent = alreadyDidJournal ? '✓ Already did journal today' : '📝 Journal Entry';
    }

    // Tile Flip methods
    async initializeTileFlip() {
        if (!this.currentUser || this.currentUser.user_type !== 'student') return;
        if (!this.pluginSettings.tileFlipEnabled) return;

        try {
            // Check if tiles should reset
            await this.checkAndResetTiles();

            // Load status and quotes
            const [statusResponse, quotesResponse] = await Promise.all([
                APIUtils.getTileFlipStatus(this.currentUser.id),
                APIUtils.getTileQuotes()
            ]);

            if (statusResponse.success) {
                this.tileFlipStatus = statusResponse;
                this.availableFlips = statusResponse.availableFlips;
                this.nextQuoteIndex = statusResponse.nextQuoteIndex;
            }

            if (quotesResponse.success) {
                this.tileQuotes = quotesResponse.quotes;
            }

            this.renderTileGrid();
            this.updateTileFlipStatus();
        } catch (error) {
            console.error('Failed to initialize tile flip:', error);
        }
    }

    renderTileGrid() {
        const tileGrid = document.getElementById('tileGrid');
        if (!tileGrid) return;

        tileGrid.innerHTML = '';

        const flippedTiles = this.tileFlipStatus?.flippedTiles || [];

        for (let i = 0; i < 12; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.tileIndex = i;

            if (flippedTiles.includes(i)) {
                tile.classList.add('flipped');
            } else if (this.availableFlips > 0) {
                tile.classList.add('flipable');
                tile.addEventListener('click', () => this.handleTileFlip(i));
            }

            tileGrid.appendChild(tile);
        }
    }

    async handleTileFlip(tileIndex) {
        if (!this.currentUser) return;
        if (this.availableFlips <= 0) {
            this.showMessage('No available flips. Complete a journal entry to earn a flip!', 'error');
            return;
        }

        try {
            const response = await APIUtils.flipTile(this.currentUser.id, tileIndex);

            if (response.success) {
                // Update status
                this.tileFlipStatus = {
                    flippedTiles: response.flippedTiles,
                    availableFlips: response.availableFlips
                };
                this.availableFlips = response.availableFlips;

                // Update house points after tile flip
                if (this.currentUser.user_type === 'student') {
                    this.updateHousePoints();
                }

                // Show quote popup
                this.showTileQuoteModal(response.quote.text, response.quote.author);

                // Re-render grid
                this.renderTileGrid();
                this.updateTileFlipStatus();
            } else {
                this.showMessage(response.error || 'Failed to flip tile. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Tile flip error:', error);
            this.showMessage('Failed to flip tile. Please try again.', 'error');
        }
    }

    showTileQuoteModal(quoteText, author) {
        const modal = document.getElementById('tileQuoteModal');
        const quoteContent = document.getElementById('quoteContent');
        
        if (!modal || !quoteContent) return;

        quoteContent.innerHTML = `
            <div class="quote-text">"${quoteText}"</div>
            ${author ? `<div class="quote-author">— ${author}</div>` : ''}
        `;

        modal.classList.add('active');

        // Close button handler
        const closeBtn = document.getElementById('closeTileQuoteModal');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.classList.remove('active');
            };
        }

        // Close on backdrop click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        };
    }

    async refreshTileFlipStatus() {
        if (!this.currentUser || this.currentUser.user_type !== 'student') return;
        if (!this.pluginSettings.tileFlipEnabled) return;

        try {
            const statusResponse = await APIUtils.getTileFlipStatus(this.currentUser.id);
            if (statusResponse.success) {
                this.tileFlipStatus = statusResponse;
                this.availableFlips = statusResponse.availableFlips;
                this.renderTileGrid();
                this.updateTileFlipStatus();
            }
        } catch (error) {
            console.error('Failed to refresh tile flip status:', error);
        }
    }

    async updateTileFlipStatus() {
        if (!this.currentUser || this.currentUser.user_type !== 'student') return;

        const statusElement = document.getElementById('tileFlipStatus');
        const badgeElement = document.getElementById('tileFlipStatusBadge');
        const availableFlipsElement = document.getElementById('availableFlips');
        const count = this.availableFlips || 0;

        if (availableFlipsElement) {
            availableFlipsElement.textContent = count;
        }
        if (badgeElement) {
            badgeElement.classList.toggle('has-flips', count > 0);
        }
    }

    async checkAndResetTiles() {
        if (!this.currentUser || this.currentUser.user_type !== 'student') return;

        try {
            const statusResponse = await APIUtils.getTileFlipStatus(this.currentUser.id);
            
            if (statusResponse.success && statusResponse.shouldReset) {
                // Reset tiles
                await APIUtils.resetTiles(this.currentUser.id);
                
                // Reload status
                const newStatus = await APIUtils.getTileFlipStatus(this.currentUser.id);
                if (newStatus.success) {
                    this.tileFlipStatus = newStatus;
                    this.availableFlips = newStatus.availableFlips;
                    this.nextQuoteIndex = newStatus.nextQuoteIndex;
                }
            }
        } catch (error) {
            console.error('Failed to check/reset tiles:', error);
        }
    }

    // Messaging functions
    async showTalkToTeacherModal() {
        const modal = document.getElementById('talkToTeacherModal');
        if (!modal) return;

        modal.classList.add('active');
        
        // Reset modal state
        document.getElementById('messageComposeSection').style.display = 'none';
        document.getElementById('messageText').value = '';
        document.getElementById('sendMessageBtn').disabled = true;
        this.selectedTeacherId = null;

        // Load teachers
        try {
            const response = await APIUtils.getTeachers();
            if (response.success) {
                this.populateTeacherList(response.teachers);
            } else {
                const errorMsg = response.error || 'Unknown error';
                document.getElementById('teacherList').innerHTML = `<p class="loading-text" style="color: #f44336;">Failed to load teachers: ${errorMsg}. Please try again.</p>`;
                console.error('Failed to load teachers:', response.error);
            }
        } catch (error) {
            console.error('Failed to load teachers:', error);
            const errorMsg = error.message || 'Network error';
            document.getElementById('teacherList').innerHTML = `<p class="loading-text" style="color: #f44336;">Failed to load teachers: ${errorMsg}. Please check your connection and try again.</p>`;
        }
    }

    populateTeacherList(teachers) {
        const teacherList = document.getElementById('teacherList');
        if (!teacherList) return;

        if (teachers.length === 0) {
            teacherList.innerHTML = '<p class="loading-text">No teachers available.</p>';
            return;
        }

        teacherList.innerHTML = teachers.map(teacher => `
            <div class="teacher-item" data-teacher-id="${teacher.id}">
                <h5>${teacher.first_name} ${teacher.surname}</h5>
                <p>${teacher.class || 'Teacher'} - ${teacher.house || ''}</p>
            </div>
        `).join('');

        // Add click handlers
        teacherList.querySelectorAll('.teacher-item').forEach(item => {
            item.addEventListener('click', () => {
                // Remove previous selection
                teacherList.querySelectorAll('.teacher-item').forEach(i => i.classList.remove('selected'));
                // Select this teacher
                item.classList.add('selected');
                this.selectedTeacherId = parseInt(item.dataset.teacherId);
                
                // Show message compose section
                document.getElementById('messageComposeSection').style.display = 'block';
                
                // Focus on message textarea
                setTimeout(() => {
                    document.getElementById('messageText').focus();
                }, 100);
            });
        });
    }

    async handleSendMessage() {
        if (!this.currentUser || !this.selectedTeacherId) {
            this.showMessage('Please select a teacher first.', 'error');
            return;
        }

        const messageText = document.getElementById('messageText').value.trim();
        if (!messageText) {
            this.showMessage('Please enter a message.', 'error');
            return;
        }

        try {
            const response = await APIUtils.sendMessage(
                this.currentUser.id,
                this.selectedTeacherId,
                messageText
            );

            if (response.success) {
                this.showMessage('Message sent successfully!', 'success');
                document.getElementById('talkToTeacherModal').classList.remove('active');
                document.getElementById('messageText').value = '';
                document.getElementById('messageComposeSection').style.display = 'none';
                this.selectedTeacherId = null;
            } else {
                this.showMessage('Failed to send message. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Send message error:', error);
            this.showMessage('Failed to send message. Please try again.', 'error');
        }
    }

    async loadMessages() {
        if (!this.currentUser) return;

        try {
            const response = await APIUtils.getMessages(this.currentUser.id);
            if (response.success) {
                this.displayMessages(response.messages);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    displayMessages(messages) {
        const messagesSection = document.getElementById('messagesSection');
        if (!messagesSection) return;

        if (messages.length === 0) {
            messagesSection.innerHTML = '<p class="loading-text">No messages yet.</p>';
            return;
        }

        // Group messages by conversation (from_user_id)
        const conversations = {};
        messages.forEach(msg => {
            const otherUserId = msg.from_user_id === this.currentUser.id ? msg.to_user_id : msg.from_user_id;
            const otherUserName = msg.from_user_id === this.currentUser.id 
                ? `${msg.to_first_name} ${msg.to_surname}`
                : `${msg.from_first_name} ${msg.from_surname}`;
            
            if (!conversations[otherUserId]) {
                conversations[otherUserId] = {
                    otherUserId,
                    otherUserName,
                    messages: []
                };
            }
            conversations[otherUserId].messages.push(msg);
        });

        // Sort conversations by most recent message
        const sortedConversations = Object.values(conversations).sort((a, b) => {
            const aLatest = new Date(a.messages[a.messages.length - 1].timestamp);
            const bLatest = new Date(b.messages[b.messages.length - 1].timestamp);
            return bLatest - aLatest;
        });

        messagesSection.innerHTML = sortedConversations.map(conv => {
            const latestMsg = conv.messages[conv.messages.length - 1];
            const unreadCount = conv.messages.filter(m => !m.is_read && m.to_user_id === this.currentUser.id).length;
            
            return `
                <div class="message-item ${unreadCount > 0 ? 'unread' : ''}" data-user-id="${conv.otherUserId}">
                    <div class="message-item-header">
                        <span class="message-item-from">${conv.otherUserName}</span>
                        <span class="message-item-time">${new Date(latestMsg.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="message-item-content">${latestMsg.message}</div>
                    ${unreadCount > 0 ? `<div style="color: #f44336; font-size: 0.85rem; margin-top: 0.5rem;">${unreadCount} unread</div>` : ''}
                    <div class="message-item-actions">
                        <button class="message-reply-btn" data-user-id="${conv.otherUserId}" data-user-name="${conv.otherUserName}">Reply</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add reply button handlers
        messagesSection.querySelectorAll('.message-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = parseInt(btn.dataset.userId);
                const userName = btn.dataset.userName;
                this.showReplySection(userId, userName);
            });
        });
    }

    showReplySection(userId, userName) {
        document.getElementById('messageReplySection').style.display = 'block';
        document.getElementById('messageThreadHeader').textContent = `Message from ${userName}`;
        document.getElementById('replyText').value = '';
        document.getElementById('cancelReply').style.display = 'inline-block';
        document.getElementById('sendReplyBtn').style.display = 'inline-block';
        this.replyToUserId = userId;
        
        setTimeout(() => {
            document.getElementById('replyText').focus();
        }, 100);
    }

    async handleSendReply() {
        if (!this.currentUser || !this.replyToUserId) return;

        const replyText = document.getElementById('replyText').value.trim();
        if (!replyText) {
            this.showMessage('Please enter a reply.', 'error');
            return;
        }

        try {
            const response = await APIUtils.sendMessage(
                this.currentUser.id,
                this.replyToUserId,
                replyText
            );

            if (response.success) {
                this.showMessage('Reply sent successfully!', 'success');
                document.getElementById('messageReplySection').style.display = 'none';
                document.getElementById('replyText').value = '';
                document.getElementById('cancelReply').style.display = 'none';
                document.getElementById('sendReplyBtn').style.display = 'none';
                this.replyToUserId = null;
                
                // Reload messages
                await this.loadMessages();
                
                // Update unread count (both navbar badge and dashboard banners)
                await this.updateNavUnreadCount();
                await this.updateUnreadCount();
            } else {
                this.showMessage('Failed to send reply. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Send reply error:', error);
            this.showMessage('Failed to send reply. Please try again.', 'error');
        }
    }

    async updateUnreadCount() {
        if (!this.currentUser) return;

        try {
            const response = await APIUtils.getUnreadCount(this.currentUser.id);
            if (response.success) {
                const count = response.count;
                const bannerId = this.currentUser.user_type === 'teacher' ? 'teacherMessagesBanner' : 'directorMessagesBanner';
                const countId = this.currentUser.user_type === 'teacher' ? 'teacherUnreadCount' : 'directorUnreadCount';
                
                const banner = document.getElementById(bannerId);
                const countElement = document.getElementById(countId);
                
                if (banner && countElement) {
                    countElement.textContent = count;
                    banner.style.display = count > 0 ? 'block' : 'none';
                }
            }
        } catch (error) {
            console.error('Failed to update unread count:', error);
        }
    }

    showMessagesModal() {
        const modal = document.getElementById('messagesModal');
        if (!modal) return;

        modal.classList.add('active');
        this.loadMessages();
    }

    hideMessagesModal() {
        const modal = document.getElementById('messagesModal');
        if (modal) {
            modal.classList.remove('active');
        }
        document.getElementById('messageReplySection').style.display = 'none';
        this.replyToUserId = null;
    }

    hideTalkToTeacherModal() {
        const modal = document.getElementById('talkToTeacherModal');
        if (modal) {
            modal.classList.remove('active');
        }
        document.getElementById('messageComposeSection').style.display = 'none';
        document.getElementById('messageText').value = '';
        this.selectedTeacherId = null;
    }

    // Message Center functions
    async showMessageCenter() {
        const modal = document.getElementById('messageCenterModal');
        if (!modal) {
            console.error('Message center modal not found in DOM');
            return;
        }

        console.log('Opening message center...');
        modal.classList.add('active');
        this.showConversationsList();
        await this.loadConversations();
        await this.updateNavUnreadCount();
    }

    hideMessageCenter() {
        const modal = document.getElementById('messageCenterModal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.showConversationsList();
        this.currentConversationUserId = null;
    }

    showConversationsList() {
        const conversationsList = document.getElementById('conversationsList');
        const conversationView = document.getElementById('conversationView');
        if (conversationsList) conversationsList.style.display = 'block';
        if (conversationView) conversationView.style.display = 'none';
    }

    async loadConversations() {
        if (!this.currentUser) return;

        const conversationsList = document.getElementById('conversationsList');
        if (!conversationsList) return;

        try {
            const response = await APIUtils.getMessages(this.currentUser.id);
            if (response.success) {
                this.displayConversations(response.messages);
            } else {
                conversationsList.innerHTML = '<p class="loading-text" style="color: #f44336;">Failed to load conversations. Please try again.</p>';
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            conversationsList.innerHTML = '<p class="loading-text" style="color: #f44336;">Failed to load conversations. Please check your connection.</p>';
        }
    }

    displayConversations(messages) {
        const conversationsList = document.getElementById('conversationsList');
        if (!conversationsList) return;

        if (messages.length === 0) {
            conversationsList.innerHTML = '<p class="loading-text">No conversations yet.</p>';
            return;
        }

        // Group messages by conversation (other user)
        const conversations = {};
        messages.forEach(msg => {
            const otherUserId = msg.from_user_id === this.currentUser.id ? msg.to_user_id : msg.from_user_id;
            const otherUserName = msg.from_user_id === this.currentUser.id 
                ? `${msg.to_first_name} ${msg.to_surname}`
                : `${msg.from_first_name} ${msg.from_surname}`;
            const otherUserType = msg.from_user_id === this.currentUser.id 
                ? msg.to_user_type
                : msg.from_user_type;
            
            if (!conversations[otherUserId]) {
                conversations[otherUserId] = {
                    otherUserId,
                    otherUserName,
                    otherUserType,
                    messages: [],
                    unreadCount: 0
                };
            }
            conversations[otherUserId].messages.push(msg);
            
            // Count unread messages
            if (!msg.is_read && msg.to_user_id === this.currentUser.id) {
                conversations[otherUserId].unreadCount++;
            }
        });

        // Sort conversations by most recent message
        const sortedConversations = Object.values(conversations).sort((a, b) => {
            const aLatest = new Date(a.messages[a.messages.length - 1].timestamp);
            const bLatest = new Date(b.messages[b.messages.length - 1].timestamp);
            return bLatest - aLatest;
        });

        conversationsList.innerHTML = sortedConversations.map(conv => {
            const latestMsg = conv.messages[conv.messages.length - 1];
            const isUnread = conv.unreadCount > 0;
            const preview = latestMsg.message.length > 50 
                ? latestMsg.message.substring(0, 50) + '...'
                : latestMsg.message;
            const timeAgo = this.getTimeAgo(new Date(latestMsg.timestamp));
            
            return `
                <div class="conversation-item ${isUnread ? 'unread' : ''}" data-user-id="${conv.otherUserId}">
                    <div class="conversation-item-header">
                        <span class="conversation-item-name">${conv.otherUserName}</span>
                        <span class="conversation-item-time">${timeAgo}</span>
                    </div>
                    <div class="conversation-item-preview">${preview}</div>
                    ${isUnread ? `<span class="conversation-item-unread">${conv.unreadCount} unread</span>` : ''}
                </div>
            `;
        }).join('');

        // Add click handlers
        conversationsList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = parseInt(item.dataset.userId);
                this.showConversation(userId);
            });
        });
    }

    async showConversation(userId) {
        if (!this.currentUser) return;

        // Mark conversation item as active
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.userId) === userId) {
                item.classList.add('active');
            }
        });

        // Show conversation view
        document.getElementById('conversationsList').style.display = 'block';
        document.getElementById('conversationView').style.display = 'flex';

        this.currentConversationUserId = userId;

        try {
            const response = await APIUtils.getMessages(this.currentUser.id);
            if (response.success) {
                // Filter messages for this conversation
                const conversationMessages = response.messages.filter(msg => 
                    (msg.from_user_id === userId && msg.to_user_id === this.currentUser.id) ||
                    (msg.from_user_id === this.currentUser.id && msg.to_user_id === userId)
                ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                // Get other user's name
                const firstMsg = conversationMessages[0];
                const otherUserName = firstMsg.from_user_id === userId 
                    ? `${firstMsg.from_first_name} ${firstMsg.from_surname}`
                    : `${firstMsg.to_first_name} ${firstMsg.to_surname}`;

                document.getElementById('conversationTitle').textContent = otherUserName;
                this.displayConversationMessages(conversationMessages, userId);

                // Mark messages as read
                const unreadMessages = conversationMessages.filter(msg => !msg.is_read && msg.to_user_id === this.currentUser.id);
                if (unreadMessages.length > 0) {
                    // Mark all unread messages as read
                    await Promise.all(unreadMessages.map(msg => 
                        APIUtils.markMessageAsRead(msg.id).catch(err => console.error('Failed to mark as read:', err))
                    ));
                    
                    // Update UI after marking as read
                    await this.updateNavUnreadCount();
                    await this.updateUnreadCount(); // Update dashboard banners
                }

                // Update conversations list to reflect read status
                await this.loadConversations();
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    }

    displayConversationMessages(messages, otherUserId) {
        const conversationMessages = document.getElementById('conversationMessages');
        if (!conversationMessages) return;

        conversationMessages.innerHTML = messages.map(msg => {
            const isSent = msg.from_user_id === this.currentUser.id;
            const senderName = isSent 
                ? `${msg.from_first_name} ${msg.from_surname}`
                : `${msg.from_first_name} ${msg.from_surname}`;
            const time = new Date(msg.timestamp).toLocaleString();

            return `
                <div class="message-bubble ${isSent ? 'sent' : 'received'}">
                    <div class="message-bubble-header">
                        <span>${senderName}</span>
                    </div>
                    <div class="message-bubble-content">${msg.message}</div>
                    <div class="message-bubble-time">${time}</div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        conversationMessages.scrollTop = conversationMessages.scrollHeight;
    }

    async handleConversationReply() {
        if (!this.currentUser || !this.currentConversationUserId) return;

        const replyText = document.getElementById('conversationReplyText').value.trim();
        if (!replyText) {
            this.showMessage('Please enter a message.', 'error');
            return;
        }

        try {
            const response = await APIUtils.sendMessage(
                this.currentUser.id,
                this.currentConversationUserId,
                replyText
            );

            if (response.success) {
                document.getElementById('conversationReplyText').value = '';
                document.getElementById('sendConversationReplyBtn').disabled = true;
                
                // Reload conversation
                await this.showConversation(this.currentConversationUserId);
                await this.loadConversations();
                await this.updateNavUnreadCount();
            } else {
                this.showMessage('Failed to send message. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Send message error:', error);
            this.showMessage('Failed to send message. Please try again.', 'error');
        }
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    async updateNavUnreadCount() {
        if (!this.currentUser) return;

        try {
            const response = await APIUtils.getUnreadCount(this.currentUser.id);
            if (response.success) {
                const count = response.count;
                const badge = document.getElementById('navMessageBadge');
                if (badge) {
                    badge.textContent = count;
                    badge.style.display = count > 0 ? 'inline-block' : 'none';
                }
            }
        } catch (error) {
            console.error('Failed to update nav unread count:', error);
        }
    }

    async updateTeacherJournalList() {
        const journalList = document.getElementById('teacherJournalList');
        if (!journalList) return;

        try {
            // Load from database
            const response = await APIUtils.getJournalEntries(this.currentUser.id, 'daily');
            if (response.success) {
                this.displayJournalEntries(journalList, response.entries);
            } else {
                // Fallback to demo data if database fails
                const demoEntries = this.getDemoJournalEntries();
                this.displayJournalEntries(journalList, demoEntries);
            }
        } catch (error) {
            console.error('Failed to load journal entries:', error);
            // Fallback to demo data
            const demoEntries = this.getDemoJournalEntries();
            this.displayJournalEntries(journalList, demoEntries);
        }
    }

    getDemoJournalEntries() {
        const now = new Date();
        return [
            {
                entry: "Great day with the students today! They were all engaged and asking thoughtful questions. I'm really proud of how Grade 6 is progressing this term.",
                timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
            },
            {
                entry: "Noticed some students seem a bit stressed about the upcoming tests. I should check in with them individually and maybe adjust my teaching approach.",
                timestamp: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString() // Yesterday
            },
            {
                entry: "The new group project is working really well. Students are collaborating better than I expected. Mirfield house is showing great teamwork!",
                timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
            }
        ];
    }

    displayJournalEntries(container, entries) {
        container.innerHTML = '';

        if (entries.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No journal entries yet.</p>';
            return;
        }

        entries.forEach(entry => {
            const entryItem = document.createElement('div');
            entryItem.className = 'journal-entry-item';
            
            const time = new Date(entry.timestamp).toLocaleString();
            
            entryItem.innerHTML = `
                <div class="journal-entry-content">
                    <div class="journal-entry-text">${entry.entry}</div>
                </div>
                <div class="journal-entry-time">${time}</div>
            `;
            
            container.appendChild(entryItem);
        });
    }

    async updateGradeAnalytics() {
        const gradeAnalytics = document.getElementById('gradeAnalytics');
        
        if (!gradeAnalytics) return;

        // Get the teacher's assigned grade
        const teacherGrade = this.currentUser.class || 'Grade 6';
        
        try {
            // Generate demo grade analytics data
            const demoAnalytics = this.getDemoGradeAnalytics(teacherGrade);
            this.displayGradeAnalytics(gradeAnalytics, demoAnalytics, teacherGrade);
        } catch (error) {
            console.error('Failed to load grade analytics:', error);
            gradeAnalytics.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Failed to load grade analytics.</p>';
        }
    }

    getDemoGradeAnalytics(grade) {
        // Generate demo analytics for the grade
        const moods = ['happy', 'excited', 'calm', 'tired', 'anxious', 'sad', 'angry', 'confused'];
        const emojis = ['😊', '🤩', '😌', '😴', '😰', '😢', '😠', '😕'];
        const analytics = [];

        moods.forEach((mood, index) => {
            const count = Math.floor(Math.random() * 15) + 5; // 5-19 checkins
            analytics.push({
                mood: mood,
                emoji: emojis[index],
                count: count.toString()
            });
        });

        return analytics;
    }

    displayGradeAnalytics(container, analytics, grade) {
        container.innerHTML = '';

        if (analytics.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: #666; padding: 2rem;">No mood data available for ${grade}.</p>`;
            return;
        }

        const total = analytics.reduce((sum, item) => sum + parseInt(item.count), 0);
        
        let html = `
            <div class="grade-analytics-summary">
                <h4>${grade} Mood Distribution (Anonymous)</h4>
                <p>Total check-ins: ${total}</p>
                <div class="mood-breakdown">
        `;

        analytics.forEach(item => {
            const percentage = ((parseInt(item.count) / total) * 100).toFixed(1);
            html += `
                <div class="mood-stat">
                    <span class="mood-emoji">${item.emoji}</span>
                    <span class="mood-name">${item.mood.charAt(0).toUpperCase() + item.mood.slice(1)}</span>
                    <span class="mood-count">${item.count} (${percentage}%)</span>
                </div>
            `;
        });

        html += `</div></div>`;
        container.innerHTML = html;
    }

    // Director methods
    async updateDirectorView() {
        try {
            // Load all users
            const usersResponse = await APIUtils.getAllUsers();
            if (usersResponse.success) {
                this.updateAllUsersList(usersResponse.users);
            }

            // Load all mood data
            const moodResponse = await APIUtils.getAllMoodData('daily');
            if (moodResponse.success) {
                this.updateAllMoodDataList(moodResponse.checkins);
            }

            // Load all journal entries
            const journalResponse = await APIUtils.getAllJournalEntries('daily');
            if (journalResponse.success) {
                this.updateAllJournalEntriesList(journalResponse.entries);
            }
        } catch (error) {
            console.error('Failed to update director view:', error);
        }
    }

    updateAllUsersList(users) {
        const usersList = document.getElementById('allUsersList');
        if (!usersList) return;

        usersList.innerHTML = '';

        if (users.length === 0) {
            usersList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No users found.</p>';
            return;
        }

        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            const userTypeIcon = user.user_type === 'student' ? '🎓' : '👨‍🏫';
            const userTypeLabel = user.user_type === 'student' ? 'Student' : 'Teacher';
            
            userItem.innerHTML = `
                <div class="user-info">
                    <h4>${userTypeIcon} ${user.first_name} ${user.surname}</h4>
                    <div class="user-details">
                        ${userTypeLabel} • ${user.email}
                        ${user.class ? ` • ${user.class}` : ''}
                        ${user.house ? ` • ${user.house}` : ''}
                    </div>
                </div>
                <div class="user-status">
                    <span class="user-type-badge ${user.user_type}">${userTypeLabel}</span>
                </div>
            `;
            
            usersList.appendChild(userItem);
        });
    }

    updateAllMoodDataList(checkins) {
        const moodDataList = document.getElementById('allMoodDataList');
        if (!moodDataList) return;

        moodDataList.innerHTML = '';

        if (checkins.length === 0) {
            moodDataList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No mood check-ins found.</p>';
            return;
        }

        const recentCheckins = checkins.slice(0, 20); // Show last 20

        recentCheckins.forEach(checkin => {
            const checkinItem = document.createElement('div');
            checkinItem.className = 'mood-data-item';
            
            const time = new Date(checkin.timestamp).toLocaleString();
            const mood = checkin.mood.charAt(0).toUpperCase() + checkin.mood.slice(1);
            const userTypeIcon = checkin.user_type === 'student' ? '🎓' : '👨‍🏫';
            
            checkinItem.innerHTML = `
                <div class="mood-data-info">
                    <div class="mood-data-user">
                        ${userTypeIcon} ${checkin.first_name} ${checkin.surname}
                        <span class="user-type-badge ${checkin.user_type}">${checkin.user_type}</span>
                    </div>
                    <div class="mood-data-details">
                        ${checkin.emoji} ${mood}
                        ${checkin.class ? ` • ${checkin.class}` : ''}
                        ${checkin.house ? ` • ${checkin.house}` : ''}
                    </div>
                    ${checkin.notes ? `<div class="mood-data-notes">${checkin.notes}</div>` : ''}
                </div>
                <div class="mood-data-time">${time}</div>
            `;
            
            moodDataList.appendChild(checkinItem);
        });
    }

    updateAllJournalEntriesList(entries) {
        const journalList = document.getElementById('allJournalEntriesList');
        if (!journalList) return;

        journalList.innerHTML = '';

        if (entries.length === 0) {
            journalList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No journal entries found.</p>';
            return;
        }

        const recentEntries = entries.slice(0, 20); // Show last 20

        recentEntries.forEach(entry => {
            const entryItem = document.createElement('div');
            entryItem.className = 'journal-entry-item';
            
            const time = new Date(entry.timestamp).toLocaleString();
            const userTypeIcon = entry.user_type === 'student' ? '🎓' : '👨‍🏫';
            
            entryItem.innerHTML = `
                <div class="journal-entry-info">
                    <div class="journal-entry-user">
                        ${userTypeIcon} ${entry.first_name} ${entry.surname}
                        <span class="user-type-badge ${entry.user_type}">${entry.user_type}</span>
                    </div>
                    <div class="journal-entry-details">
                        ${entry.class ? `${entry.class}` : ''}
                        ${entry.house ? ` • ${entry.house}` : ''}
                    </div>
                    <div class="journal-entry-text">${entry.entry}</div>
                </div>
                <div class="journal-entry-time">${time}</div>
            `;
            
            journalList.appendChild(entryItem);
        });
    }

    // Load director journal entries
    async loadDirectorJournalEntries() {
        try {
            const journalResponse = await APIUtils.getAllJournalEntries('daily');
            if (journalResponse.success) {
                this.updateAllJournalEntriesList(journalResponse.entries);
            } else {
                const journalList = document.getElementById('allJournalEntriesList');
                if (journalList) {
                    journalList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Failed to load journal entries.</p>';
                }
            }
        } catch (error) {
            console.error('Failed to load director journal entries:', error);
            const journalList = document.getElementById('allJournalEntriesList');
            if (journalList) {
                journalList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Error loading journal entries.</p>';
            }
        }
    }

    // Scan existing journal entries retroactively for flags
    async scanExistingJournalEntries() {
        if (typeof processJournalEntryFlagging === 'undefined' || typeof loadJson === 'undefined' || typeof saveJson === 'undefined') {
            console.warn('Flagging utilities not loaded');
            return;
        }
        
        try {
            // Get all journal entries - use a period that returns all entries
            // Try 'all' first, if that doesn't work, we'll fetch without period filter
            let journalResponse = await APIUtils.getAllJournalEntries('all');
            
            // If 'all' doesn't work, try fetching with a very old date or modify the API call
            // For now, let's try monthly which should get more entries
            if (!journalResponse.success) {
                journalResponse = await APIUtils.getAllJournalEntries('monthly');
            }
            
            if (!journalResponse.success || !journalResponse.entries || journalResponse.entries.length === 0) {
                return;
            }
            
            // Get existing flags to avoid duplicates
            const existingFlags = loadJson('journalFlags', []);
            
            let newFlagsCount = 0;
            const newFlags = [];
            
            // Process each entry
            for (const entry of journalResponse.entries) {
                // Skip if not a student entry
                if (entry.user_type !== 'student') {
                    continue;
                }
                
                // Check if this entry is already flagged
                // We'll match by checking if there's a flag with same entry text and user ID
                const entryTimestamp = new Date(entry.timestamp).toISOString();
                const alreadyFlagged = existingFlags.some(flag => 
                    flag.studentId === entry.user_id && 
                    flag.entryText === entry.entry &&
                    Math.abs(new Date(flag.createdAt).getTime() - new Date(entryTimestamp).getTime()) < 60000 // Within 1 minute
                );
                
                if (alreadyFlagged) {
                    continue;
                }
                
                // Create user object for flagging
                const user = {
                    id: entry.user_id,
                    first_name: entry.first_name || '',
                    surname: entry.surname || '',
                    class: entry.class || '',
                    house: entry.house || '',
                    user_type: entry.user_type || 'student'
                };
                
                // Process flagging (ghost mode unknown for old entries, default to false)
                // Pass entry ID and timestamp to prevent duplicates
                const flag = await processJournalEntryFlagging(entry.entry, user, false, false, entry.id, entry.timestamp);
                if (flag) {
                    newFlags.push(flag);
                    newFlagsCount++;
                }
            }
            
            if (newFlagsCount > 0) {
                console.log(`Retroactively flagged ${newFlagsCount} existing journal entries`);
                // Flags are already saved by processJournalEntryFlagging, just reload display
                this.loadDirectorFlags();
            }
        } catch (error) {
            console.error('Error scanning existing journal entries:', error);
        }
    }

    // Deduplicate flags
    deduplicateFlags(flags) {
        const seen = new Set();
        const unique = [];
        
        for (const flag of flags) {
            // Create a unique key for this flag
            const key = flag.flagKey || 
                       (flag.entryId ? `entry_${flag.entryId}` : null) ||
                       `${flag.studentId}_${flag.createdAt}_${flag.entryText.substring(0, 50)}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(flag);
            }
        }
        
        // If we removed duplicates, save the deduplicated list
        if (unique.length < flags.length) {
            console.log(`Removed ${flags.length - unique.length} duplicate flags`);
            if (typeof saveJson !== 'undefined') {
                saveJson('journalFlags', unique);
            }
        }
        
        return unique;
    }

    // Load director flags
    loadDirectorFlags() {
        if (typeof loadJson === 'undefined') {
            console.warn('Flagging utilities not loaded');
            return;
        }
        
        let flags = loadJson('journalFlags', []);
        
        // Deduplicate flags on load
        flags = this.deduplicateFlags(flags);
        
        const events = loadJson('flagEvents', []);
        
        this.renderFlags(flags);
        this.renderEvents(events);
    }

    // Render flags list
    renderFlags(flags) {
        const flagsList = document.getElementById('flagsList');
        if (!flagsList) return;
        
        if (flags.length === 0) {
            flagsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No flagged entries.</p>';
            return;
        }
        
        // Remove duplicates before rendering
        const uniqueFlags = this.deduplicateFlags(flags);
        
        // Sort by newest first
        const sortedFlags = [...uniqueFlags].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        flagsList.innerHTML = sortedFlags.map(flag => {
            const severityColors = {
                red: '#f44336',
                amber: '#ff9800',
                yellow: '#ffeb3b'
            };
            const severityBg = {
                red: '#ffebee',
                amber: '#fff3e0',
                yellow: '#fffde7'
            };
            const statusColors = {
                new: '#2196f3',
                viewed: '#9e9e9e',
                followed_up: '#4caf50'
            };
            
            const date = new Date(flag.createdAt).toLocaleString();
            const matchesDisplay = [
                ...(flag.matches.red || []).map(m => `<span class="match-tag red">${m}</span>`),
                ...(flag.matches.amber || []).map(m => `<span class="match-tag amber">${m}</span>`),
                ...(flag.matches.yellow || []).map(m => `<span class="match-tag yellow">${m}</span>`)
            ].join('');
            
            return `
                <div class="flag-item" data-flag-id="${flag.id}" 
                     data-severity="${flag.severity}" 
                     data-grade="${flag.grade || ''}" 
                     data-house="${flag.house || ''}" 
                     data-ghost="${flag.ghost}" 
                     data-status="${flag.status}">
                    <div class="flag-header">
                        <div class="flag-severity-badge" style="background-color: ${severityBg[flag.severity]}; color: ${severityColors[flag.severity]}">
                            ${flag.severity === 'red' ? '🔴' : flag.severity === 'amber' ? '🟠' : '🟡'} ${flag.severity.toUpperCase()}
                        </div>
                        <div class="flag-status-badge" style="color: ${statusColors[flag.status]}">
                            ${flag.status === 'new' ? '🆕' : flag.status === 'viewed' ? '👁️' : '✅'} ${flag.status.replace('_', ' ')}
                        </div>
                    </div>
                    <div class="flag-info">
                        <div class="flag-student">
                            ${flag.ghost ? '👻 Anonymous' : (flag.studentName || 'Unknown')}
                            ${flag.grade ? ` • Grade ${flag.grade}` : ''}
                            ${flag.house ? ` • ${flag.house}` : ''}
                        </div>
                        <div class="flag-matches">${matchesDisplay || 'No matches'}</div>
                        <div class="flag-entry-preview">${flag.entryText.substring(0, 150)}${flag.entryText.length > 150 ? '...' : ''}</div>
                        <div class="flag-date">${date}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        flagsList.querySelectorAll('.flag-item').forEach(item => {
            item.addEventListener('click', () => {
                const flagId = item.dataset.flagId;
                const flag = flags.find(f => f.id === flagId);
                if (flag) {
                    this.showFlagDetail(flag);
                }
            });
        });
    }

    // Render events list
    renderEvents(events) {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return;
        
        if (events.length === 0) {
            eventsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No pattern events.</p>';
            return;
        }
        
        const sortedEvents = [...events].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        eventsList.innerHTML = sortedEvents.map(event => {
            const date = new Date(event.createdAt).toLocaleString();
            const eventTypeLabel = event.type === 'amberPattern' ? '🟠 Amber Pattern' : '🟡 Yellow Pattern';
            const eventColor = event.type === 'amberPattern' ? '#ff9800' : '#ffeb3b';
            
            return `
                <div class="event-item" style="border-left: 4px solid ${eventColor}">
                    <div class="event-header">
                        <span class="event-type">${eventTypeLabel}</span>
                        <span class="event-date">${date}</span>
                    </div>
                    <div class="event-details">
                        Student ID: ${event.studentId}<br>
                        Count: ${event.count} occurrences in last ${event.windowDays} days
                    </div>
                </div>
            `;
        }).join('');
    }

    // Show flag detail modal
    showFlagDetail(flag) {
        const modal = document.getElementById('flagDetailModal');
        const content = document.getElementById('flagDetailContent');
        if (!modal || !content) return;
        
        const severityColors = {
            red: '#f44336',
            amber: '#ff9800',
            yellow: '#ffeb3b'
        };
        
        const date = new Date(flag.createdAt).toLocaleString();
        const matchesDisplay = [
            ...(flag.matches.red || []).map(m => `<span class="match-tag red">${m}</span>`),
            ...(flag.matches.amber || []).map(m => `<span class="match-tag amber">${m}</span>`),
            ...(flag.matches.yellow || []).map(m => `<span class="match-tag yellow">${m}</span>`)
        ].join('') || 'No matches';
        
        content.innerHTML = `
            <div class="flag-detail-section">
                <h4>Severity</h4>
                <div class="flag-severity-badge-large" style="background-color: ${severityColors[flag.severity]}20; color: ${severityColors[flag.severity]}">
                    ${flag.severity === 'red' ? '🔴' : flag.severity === 'amber' ? '🟠' : '🟡'} ${flag.severity.toUpperCase()}
                </div>
            </div>
            <div class="flag-detail-section">
                <h4>Student Information</h4>
                <p><strong>Name:</strong> ${flag.ghost ? '👻 Anonymous (Ghost Mode)' : (flag.studentName || 'Unknown')}</p>
                <p><strong>Student ID:</strong> ${flag.studentId}</p>
                <p><strong>Grade:</strong> ${flag.grade || 'N/A'}</p>
                <p><strong>House:</strong> ${flag.house || 'N/A'}</p>
            </div>
            <div class="flag-detail-section">
                <h4>Matched Terms</h4>
                <div class="flag-matches-container">${matchesDisplay}</div>
            </div>
            <div class="flag-detail-section">
                <h4>Journal Entry</h4>
                <div class="flag-entry-full">${flag.entryText}</div>
            </div>
            <div class="flag-detail-section">
                <h4>Timestamp</h4>
                <p>${date}</p>
            </div>
            <div class="flag-detail-section">
                <h4>Status</h4>
                <select id="flagStatusSelect" class="flag-status-select">
                    <option value="new" ${flag.status === 'new' ? 'selected' : ''}>New</option>
                    <option value="viewed" ${flag.status === 'viewed' ? 'selected' : ''}>Viewed</option>
                    <option value="followed_up" ${flag.status === 'followed_up' ? 'selected' : ''}>Followed Up</option>
                </select>
            </div>
            <div class="flag-detail-section">
                <h4>Notes</h4>
                <textarea id="flagNotesTextarea" class="flag-notes-textarea" rows="4" placeholder="Add notes about follow-up actions...">${flag.notes || ''}</textarea>
            </div>
            <div class="flag-detail-actions">
                <button class="btn-primary" id="saveFlagChangesBtn" data-flag-id="${flag.id}">Save Changes</button>
            </div>
        `;
        
        modal.style.display = 'block';
        modal.classList.add('active');
        
        // Setup save button handler
        const saveBtn = document.getElementById('saveFlagChangesBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveFlagChanges(flag.id);
            });
        }
    }

    // Save flag changes
    saveFlagChanges(flagId) {
        if (typeof loadJson === 'undefined' || typeof saveJson === 'undefined') {
            console.error('Storage utilities not available');
            return;
        }
        
        const flags = loadJson('journalFlags', []);
        const flag = flags.find(f => f.id === flagId);
        if (!flag) return;
        
        const statusSelect = document.getElementById('flagStatusSelect');
        const notesTextarea = document.getElementById('flagNotesTextarea');
        
        if (statusSelect) {
            flag.status = statusSelect.value;
        }
        if (notesTextarea) {
            flag.notes = notesTextarea.value;
        }
        
        saveJson('journalFlags', flags);
        
        // Reload flags display
        this.loadDirectorFlags();
        
        // Close modal
        const modal = document.getElementById('flagDetailModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        
        this.showMessage('Flag updated successfully.', 'success');
    }

    // Setup flags handlers
    setupFlagsHandlers() {
        // Tab switching
        document.querySelectorAll('.flags-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update tab buttons
                document.querySelectorAll('.flags-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update tab content
                document.querySelectorAll('.flags-tab-content').forEach(c => c.classList.remove('active'));
                if (targetTab === 'flags') {
                    document.getElementById('flagsTabContent')?.classList.add('active');
                } else if (targetTab === 'events') {
                    document.getElementById('eventsTabContent')?.classList.add('active');
                }
            });
        });
        
        // Filter handlers
        const filters = ['flagsSeverityFilter', 'flagsGradeFilter', 'flagsHouseFilter', 'flagsGhostFilter', 'flagsStatusFilter'];
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.applyFlagsFilters();
                });
            }
        });
        
        // Export CSV button
        const exportBtn = document.getElementById('exportFlagsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportFlagsCSV();
            });
        }
        
        // Close flag detail modal
        const closeBtn = document.getElementById('closeFlagDetailModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const modal = document.getElementById('flagDetailModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('active');
                }
            });
        }
    }

    // Apply flags filters
    applyFlagsFilters() {
        if (typeof loadJson === 'undefined') return;
        
        const flags = loadJson('journalFlags', []);
        const severityFilter = document.getElementById('flagsSeverityFilter')?.value || 'all';
        const gradeFilter = document.getElementById('flagsGradeFilter')?.value || 'all';
        const houseFilter = document.getElementById('flagsHouseFilter')?.value || 'all';
        const ghostFilter = document.getElementById('flagsGhostFilter')?.value || 'all';
        const statusFilter = document.getElementById('flagsStatusFilter')?.value || 'all';
        
        let filtered = flags.filter(flag => {
            if (severityFilter !== 'all' && flag.severity !== severityFilter) return false;
            if (gradeFilter !== 'all' && flag.grade !== gradeFilter) return false;
            if (houseFilter !== 'all' && flag.house !== houseFilter) return false;
            if (ghostFilter !== 'all' && String(flag.ghost) !== ghostFilter) return false;
            if (statusFilter !== 'all' && flag.status !== statusFilter) return false;
            return true;
        });
        
        this.renderFlags(filtered);
    }

    // Export flags to CSV
    exportFlagsCSV() {
        if (typeof loadJson === 'undefined') return;
        
        const flags = loadJson('journalFlags', []);
        if (flags.length === 0) {
            this.showMessage('No flags to export.', 'info');
            return;
        }
        
        // CSV header
        const headers = ['Created At', 'Severity', 'Status', 'Grade', 'House', 'Ghost', 'Student Name', 'Matches (Red)', 'Matches (Amber)', 'Matches (Yellow)', 'Entry Text'];
        
        // CSV rows
        const rows = flags.map(flag => {
            const date = new Date(flag.createdAt).toLocaleString();
            const redMatches = (flag.matches.red || []).join('|');
            const amberMatches = (flag.matches.amber || []).join('|');
            const yellowMatches = (flag.matches.yellow || []).join('|');
            const entryText = (flag.entryText || '').replace(/"/g, '""'); // Escape quotes
            
            return [
                date,
                flag.severity,
                flag.status,
                flag.grade || '',
                flag.house || '',
                flag.ghost ? 'Yes' : 'No',
                flag.studentName || '',
                redMatches,
                amberMatches,
                yellowMatches,
                `"${entryText}"`
            ];
        });
        
        // Combine header and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `journal_flags_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage('Flags exported successfully.', 'success');
    }

    // Update director date and time display
    updateDirectorDateTime() {
        const now = new Date();
        const dateOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const timeOptions = { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        };
        
        const dateElement = document.getElementById('directorCurrentDate');
        const timeElement = document.getElementById('directorCurrentTime');
        
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
        }
        
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
        }
    }

    // Update director modal cards with data
    async updateDirectorModalCards() {
        try {
            // Load all users and mood data
            const usersResponse = await APIUtils.getAllUsers();
            const moodResponse = await APIUtils.getAllMoodData('daily');
            
            if (usersResponse.success && moodResponse.success) {
                const users = usersResponse.users || [];
                const moodData = moodResponse.checkins || [];
                
                // Update each modal card
                this.updateGradeCard('grade5', users, moodData);
                this.updateGradeCard('grade6', users, moodData);
                this.updateGradeCard('grade7', users, moodData);
                this.updateHouseCard('bavin', users, moodData);
                this.updateHouseCard('bishops', users, moodData);
                this.updateHouseCard('dodson', users, moodData);
                this.updateHouseCard('mirfield', users, moodData);
                this.updateHouseCard('sage', users, moodData);
                this.updateTeachersCard(users, moodData);
            }
        } catch (error) {
            console.error('Failed to update director modal cards:', error);
        }
    }

    // Update grade card with data
    updateGradeCard(grade, users, moodData) {
        const gradeValue = grade.replace('grade', 'Grade ');
        
        // Debug: Log all students and their classes
        const allStudents = users.filter(user => user.user_type === 'student');
        console.log(`[${gradeValue}] Total students:`, allStudents.length);
        console.log(`[${gradeValue}] Students with classes:`, allStudents.map(s => ({ 
            name: `${s.first_name} ${s.surname}`, 
            class: s.class, 
            derivedGrade: getGradeFromClass(s.class),
            matchesGrade: isClassInGrade(s.class, gradeValue)
        })));
        
        // Filter students by grade - supports both new class names (5EF, 6A) and legacy format (Grade 5)
        const students = users.filter(user => user.user_type === 'student' && isClassInGrade(user.class, gradeValue));
        console.log(`[${gradeValue}] Filtered students:`, students.length);
        
        const studentMoods = moodData.filter(mood => 
            students.some(student => student.id === mood.user_id)
        );
        
        const topMood = this.getTopMood(studentMoods);
        
        // Update mood display
        const emojiElement = document.getElementById(grade + 'TopMoodEmoji');
        const moodElement = document.getElementById(grade + 'TopMood');
        const countElement = document.getElementById(grade + 'StudentCount');
        
        if (emojiElement && moodElement && countElement) {
            emojiElement.textContent = topMood.emoji;
            moodElement.textContent = topMood.name;
            countElement.textContent = `${students.length} students`;
        }
    }

    // Update house card with data
    updateHouseCard(house, users, moodData) {
        const students = users.filter(user => 
            user.user_type === 'student' && user.house && user.house.toLowerCase() === house
        );
        const studentMoods = moodData.filter(mood => 
            students.some(student => student.id === mood.user_id)
        );
        
        const topMood = this.getTopMood(studentMoods);
        
        // Update mood display
        const emojiElement = document.getElementById(house + 'TopMoodEmoji');
        const moodElement = document.getElementById(house + 'TopMood');
        const countElement = document.getElementById(house + 'StudentCount');
        
        if (emojiElement && moodElement && countElement) {
            emojiElement.textContent = topMood.emoji;
            moodElement.textContent = topMood.name;
            countElement.textContent = `${students.length} students`;
        }
    }

    // Update teachers card with data
    updateTeachersCard(users, moodData) {
        const teachers = users.filter(user => user.user_type === 'teacher');
        const teacherMoods = moodData.filter(mood => 
            teachers.some(teacher => teacher.id === mood.user_id)
        );
        
        const topMood = this.getTopMood(teacherMoods);
        
        // Update mood display
        const emojiElement = document.getElementById('teachersTopMoodEmoji');
        const moodElement = document.getElementById('teachersTopMood');
        const countElement = document.getElementById('teachersCount');
        
        if (emojiElement && moodElement && countElement) {
            emojiElement.textContent = topMood.emoji;
            moodElement.textContent = topMood.name;
            countElement.textContent = `${teachers.length} teachers`;
        }
    }

    // Get top mood from mood data
    getTopMood(moodData) {
        if (!moodData || moodData.length === 0) {
            return { emoji: '😊', name: 'No Data' };
        }
        
        // Count mood occurrences
        const moodCounts = {};
        moodData.forEach(mood => {
            const moodName = mood.mood || 'happy';
            moodCounts[moodName] = (moodCounts[moodName] || 0) + 1;
        });
        
        // Find most common mood
        const topMoodName = Object.keys(moodCounts).reduce((a, b) => 
            moodCounts[a] > moodCounts[b] ? a : b
        );
        
        // Map mood names to emojis
        const moodEmojis = {
            'happy': '😊',
            'excited': '🤩',
            'calm': '😌',
            'tired': '😴',
            'anxious': '😰',
            'sad': '😢',
            'angry': '😠',
            'confused': '😕'
        };
        
        return {
            emoji: moodEmojis[topMoodName] || '😊',
            name: topMoodName.charAt(0).toUpperCase() + topMoodName.slice(1)
        };
    }

    // Setup modal card click handlers
    setupDirectorModalHandlers() {
        console.log('setupDirectorModalHandlers() called');
        // Setup grade card handlers
        ['grade5', 'grade6', 'grade7'].forEach(grade => {
            const card = document.getElementById(grade + 'Card');
            if (card) {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Grade card clicked:', grade);
                    this.showGroupDetailModal(grade, 'grade');
                });
            }
        });
        
        // Setup house card handlers
        ['bavin', 'bishops', 'dodson', 'mirfield', 'sage'].forEach(house => {
            const card = document.getElementById(house + 'Card');
            if (card) {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('House card clicked:', house);
                    this.showGroupDetailModal(house, 'house');
                });
            }
        });
        
        // Setup teachers card handler
        const teachersCard = document.getElementById('teachersCard');
        if (teachersCard) {
            teachersCard.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Teachers card clicked');
                this.showGroupDetailModal('teachers', 'teachers');
            });
        }

        // Director Profile card -> open profile modal
        const profileCard = document.getElementById('directorProfileCard');
        if (profileCard) {
            profileCard.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openDirectorProfileModal();
            });
        }
        
        // Setup modal close handlers
        const groupModal = document.getElementById('directorGroupDetailModal');
        const studentModal = document.getElementById('directorStudentDetailModal');
        const profileModal = document.getElementById('directorProfileModal');
        const closeGroupBtn = document.getElementById('closeDirectorGroupDetailModal');
        const closeStudentBtn = document.getElementById('closeDirectorStudentDetailModal');
        const closeProfileBtn = document.getElementById('closeDirectorProfileModal');
        
        if (closeGroupBtn && groupModal) {
            closeGroupBtn.addEventListener('click', () => {
                groupModal.style.display = 'none';
                groupModal.classList.remove('active');
            });
        }
        
        if (closeStudentBtn && studentModal) {
            closeStudentBtn.addEventListener('click', () => {
                studentModal.style.display = 'none';
                studentModal.classList.remove('active');
            });
        }
        const moodStudentsModal = document.getElementById('directorMoodStudentsModal');
        const closeMoodStudentsBtn = document.getElementById('closeDirectorMoodStudentsModal');
        if (closeMoodStudentsBtn && moodStudentsModal) {
            closeMoodStudentsBtn.addEventListener('click', () => {
                moodStudentsModal.style.display = 'none';
                moodStudentsModal.classList.remove('active');
            });
        }
        if (moodStudentsModal) {
            moodStudentsModal.addEventListener('click', (e) => {
                if (e.target === moodStudentsModal) {
                    moodStudentsModal.style.display = 'none';
                    moodStudentsModal.classList.remove('active');
                }
            });
        }
        if (closeProfileBtn && profileModal) {
            closeProfileBtn.addEventListener('click', () => {
                profileModal.style.display = 'none';
                profileModal.classList.remove('active');
            });
        }
        
        // Save Director Profile (plugins)
        const saveProfileBtn = document.getElementById('saveDirectorProfileBtn');
        if (saveProfileBtn && profileModal) {
            saveProfileBtn.addEventListener('click', () => this.saveDirectorProfile());
        }
        
        // Close modals when clicking outside
        if (groupModal) {
            groupModal.addEventListener('click', (e) => {
                if (e.target === groupModal) {
                    groupModal.style.display = 'none';
                    groupModal.classList.remove('active');
                }
            });
        }
        
        if (studentModal) {
            studentModal.addEventListener('click', (e) => {
                if (e.target === studentModal) {
                    studentModal.style.display = 'none';
                    studentModal.classList.remove('active');
                }
            });
        }
        if (profileModal) {
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal) {
                    profileModal.style.display = 'none';
                    profileModal.classList.remove('active');
                }
            });
        }

        // Director Profile modal tabs
        document.querySelectorAll('.director-profile-tab').forEach(tabBtn => {
            tabBtn.addEventListener('click', () => {
                const tab = tabBtn.getAttribute('data-tab');
                document.querySelectorAll('.director-profile-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.director-profile-panel').forEach(p => p.classList.remove('active'));
                tabBtn.classList.add('active');
                const panel = document.getElementById('directorProfilePanel' + (tab.charAt(0).toUpperCase() + tab.slice(1)));
                if (panel) panel.classList.add('active');
            });
        });

        // Save check-in and journal limits
        const saveCheckinJournalSettingsBtn = document.getElementById('saveCheckinJournalSettingsBtn');
        if (saveCheckinJournalSettingsBtn) {
            saveCheckinJournalSettingsBtn.addEventListener('click', () => this.saveCheckinJournalSettings());
        }

        // Delete all student data
        const deleteAllStudentDataBtn = document.getElementById('deleteAllStudentDataBtn');
        if (deleteAllStudentDataBtn) {
            deleteAllStudentDataBtn.addEventListener('click', () => this.confirmDeleteAllStudentData());
        }

        // Delete all teacher data
        const deleteAllTeacherDataBtn = document.getElementById('deleteAllTeacherDataBtn');
        if (deleteAllTeacherDataBtn) {
            deleteAllTeacherDataBtn.addEventListener('click', () => this.confirmDeleteAllTeacherData());
        }

        // Add class name button
        const addClassNameBtn = document.getElementById('addClassNameBtn');
        if (addClassNameBtn) {
            addClassNameBtn.addEventListener('click', () => this.addClassName());
        }

        // Add class name input - allow Enter key to submit
        const newClassNameInput = document.getElementById('newClassNameInput');
        if (newClassNameInput) {
            newClassNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addClassName();
                }
            });
        }

        // Student Class Assignment Modal
        const openStudentClassAssignmentBtn = document.getElementById('openStudentClassAssignmentBtn');
        console.log('Setting up Student Class Assignment button:', openStudentClassAssignmentBtn);
        if (openStudentClassAssignmentBtn) {
            openStudentClassAssignmentBtn.addEventListener('click', () => {
                console.log('Manage Student Classes button clicked');
                this.openStudentClassAssignmentModal();
            });
        } else {
            console.warn('openStudentClassAssignmentBtn not found in DOM');
        }

        const closeStudentClassAssignmentModal = document.getElementById('closeStudentClassAssignmentModal');
        if (closeStudentClassAssignmentModal) {
            closeStudentClassAssignmentModal.addEventListener('click', () => this.closeStudentClassAssignmentModal());
        }

        const studentClassAssignmentModal = document.getElementById('studentClassAssignmentModal');
        if (studentClassAssignmentModal) {
            studentClassAssignmentModal.addEventListener('click', (e) => {
                if (e.target === studentClassAssignmentModal) {
                    this.closeStudentClassAssignmentModal();
                }
            });
        }

        const saveAllStudentClassesBtn = document.getElementById('saveAllStudentClassesBtn');
        if (saveAllStudentClassesBtn) {
            saveAllStudentClassesBtn.addEventListener('click', () => this.saveAllStudentClasses());
        }

        const studentClassFilter = document.getElementById('studentClassFilter');
        if (studentClassFilter) {
            studentClassFilter.addEventListener('change', (e) => {
                this.loadStudentsForClassAssignment(e.target.value);
            });
        }

        // Student Deletion Modal
        const openStudentDeletionBtn = document.getElementById('openStudentDeletionBtn');
        if (openStudentDeletionBtn) {
            openStudentDeletionBtn.addEventListener('click', () => {
                console.log('Manage Student Accounts button clicked');
                this.openStudentDeletionModal();
            });
        }

        const closeStudentDeletionModal = document.getElementById('closeStudentDeletionModal');
        if (closeStudentDeletionModal) {
            closeStudentDeletionModal.addEventListener('click', () => this.closeStudentDeletionModal());
        }

        const studentDeletionModal = document.getElementById('studentDeletionModal');
        if (studentDeletionModal) {
            studentDeletionModal.addEventListener('click', (e) => {
                if (e.target === studentDeletionModal) {
                    this.closeStudentDeletionModal();
                }
            });
        }

        const studentDeletionSearch = document.getElementById('studentDeletionSearch');
        if (studentDeletionSearch) {
            studentDeletionSearch.addEventListener('input', (e) => {
                // Debounce the search
                clearTimeout(this.studentSearchTimeout);
                this.studentSearchTimeout = setTimeout(() => {
                    this.loadStudentsForDeletion(e.target.value);
                }, 300);
            });
        }

        // Student Credentials Modal
        const openStudentCredentialsBtn = document.getElementById('openStudentCredentialsBtn');
        if (openStudentCredentialsBtn) {
            openStudentCredentialsBtn.addEventListener('click', () => this.openStudentCredentialsModal());
        }

        const closeStudentCredentialsModal = document.getElementById('closeStudentCredentialsModal');
        if (closeStudentCredentialsModal) {
            closeStudentCredentialsModal.addEventListener('click', () => this.closeStudentCredentialsModal());
        }

        const studentCredentialsModal = document.getElementById('studentCredentialsModal');
        if (studentCredentialsModal) {
            studentCredentialsModal.addEventListener('click', (e) => {
                if (e.target === studentCredentialsModal) {
                    this.closeStudentCredentialsModal();
                }
            });
        }

        const studentCredentialsSearch = document.getElementById('studentCredentialsSearch');
        if (studentCredentialsSearch) {
            studentCredentialsSearch.addEventListener('input', (e) => {
                clearTimeout(this.studentCredentialsSearchTimeout);
                this.studentCredentialsSearchTimeout = setTimeout(() => {
                    this.loadStudentsForCredentials(e.target.value);
                }, 300);
            });
        }

        // Password Reset Modal
        const closePasswordResetModal = document.getElementById('closePasswordResetModal');
        if (closePasswordResetModal) {
            closePasswordResetModal.addEventListener('click', () => this.closePasswordResetModal());
        }

        const passwordResetModal = document.getElementById('passwordResetModal');
        if (passwordResetModal) {
            passwordResetModal.addEventListener('click', (e) => {
                if (e.target === passwordResetModal) {
                    this.closePasswordResetModal();
                }
            });
        }

        const cancelPasswordResetBtn = document.getElementById('cancelPasswordResetBtn');
        if (cancelPasswordResetBtn) {
            cancelPasswordResetBtn.addEventListener('click', () => this.closePasswordResetModal());
        }

        const confirmPasswordResetBtn = document.getElementById('confirmPasswordResetBtn');
        if (confirmPasswordResetBtn) {
            confirmPasswordResetBtn.addEventListener('click', () => this.confirmPasswordReset());
        }

        const customPasswordInput = document.getElementById('customPasswordInput');
        if (customPasswordInput) {
            customPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.confirmPasswordReset();
                }
            });
        }

        // Teacher Class Selection Modal
        const teacherClassButton = document.getElementById('teacherClassButton');
        if (teacherClassButton) {
            teacherClassButton.addEventListener('click', () => this.openTeacherClassModal());
        }

        const closeTeacherClassModal = document.getElementById('closeTeacherClassModal');
        if (closeTeacherClassModal) {
            closeTeacherClassModal.addEventListener('click', () => this.closeTeacherClassModal());
        }

        const teacherClassModal = document.getElementById('teacherClassModal');
        if (teacherClassModal) {
            teacherClassModal.addEventListener('click', (e) => {
                if (e.target === teacherClassModal) {
                    this.closeTeacherClassModal();
                }
            });
        }

        const cancelTeacherClassBtn = document.getElementById('cancelTeacherClassBtn');
        if (cancelTeacherClassBtn) {
            cancelTeacherClassBtn.addEventListener('click', () => this.closeTeacherClassModal());
        }

        const saveTeacherClassBtn = document.getElementById('saveTeacherClassBtn');
        if (saveTeacherClassBtn) {
            saveTeacherClassBtn.addEventListener('click', () => this.saveTeacherClass());
        }

        // Period filter buttons for class check-ins (delegated event listener)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('period-btn') && e.target.dataset.period) {
                if (this.currentUser && this.currentUser.user_type === 'teacher') {
                    const period = e.target.dataset.period;
                    this.loadTeacherClassCheckins(period);
                }
            }
        });
    }

    async openDirectorProfileModal() {
        const modal = document.getElementById('directorProfileModal');
        const msgToggle = document.getElementById('messageCenterPluginToggle');
        const ghostToggle = document.getElementById('ghostModePluginToggle');
        const tileFlipToggle = document.getElementById('tileFlipPluginToggle');
        const housePointsToggle = document.getElementById('housePointsPluginToggle');
        if (!modal || !msgToggle) return;
        msgToggle.checked = !!this.pluginSettings.messageCenterEnabled;
        if (ghostToggle) ghostToggle.checked = !!this.pluginSettings.ghostModeEnabled;
        if (tileFlipToggle) tileFlipToggle.checked = !!this.pluginSettings.tileFlipEnabled;
        if (housePointsToggle) housePointsToggle.checked = !!this.pluginSettings.housePointsEnabled;
        modal.style.display = 'flex';
        modal.classList.add('active');
        if (this.currentUser && this.currentUser.user_type === 'director') {
            this.loadCheckinJournalSettings();
            this.loadDirectorClassNames();
        }
    }

    async loadCheckinJournalSettings() {
        const maxCheckinsEl = document.getElementById('maxCheckinsPerDay');
        const maxJournalsEl = document.getElementById('maxJournalEntriesPerDay');
        if (!maxCheckinsEl || !maxJournalsEl || !this.currentUser || this.currentUser.user_type !== 'director') return;
        try {
            const res = await APIUtils.getCheckinJournalSettings(this.currentUser.id);
            if (res.success) {
                maxCheckinsEl.value = res.maxCheckinsPerDay ?? 1;
                maxJournalsEl.value = res.maxJournalEntriesPerDay ?? 1;
            }
        } catch (e) {
            console.error('Load checkin/journal settings error:', e);
        }
    }

    async saveCheckinJournalSettings() {
        const maxCheckinsEl = document.getElementById('maxCheckinsPerDay');
        const maxJournalsEl = document.getElementById('maxJournalEntriesPerDay');
        if (!maxCheckinsEl || !maxJournalsEl || !this.currentUser || this.currentUser.user_type !== 'director') return;
        const maxCheckinsPerDay = Math.min(999, Math.max(1, parseInt(maxCheckinsEl.value, 10) || 1));
        const maxJournalEntriesPerDay = Math.min(999, Math.max(1, parseInt(maxJournalsEl.value, 10) || 1));
        try {
            const res = await APIUtils.updateCheckinJournalSettings(this.currentUser.id, maxCheckinsPerDay, maxJournalEntriesPerDay);
            if (res.success) {
                this.showMessage('Check-in and journal limits saved.', 'success');
            } else {
                this.showMessage(res.error || 'Failed to save limits.', 'error');
            }
        } catch (e) {
            console.error('Save checkin/journal settings error:', e);
            this.showMessage(e.message || 'Failed to save limits.', 'error');
        }
    }

    // Class Names Management
    async loadClassNames() {
        const studentClassSelect = document.getElementById('studentClass');
        if (!studentClassSelect) return;

        try {
            const response = await APIUtils.getClassNames();
            if (response.success && response.classNames) {
                // Clear existing options except the first one
                studentClassSelect.innerHTML = '<option value="">Select your class</option>';
                
                // Add class options
                response.classNames.forEach(className => {
                    const option = document.createElement('option');
                    option.value = className;
                    option.textContent = className;
                    studentClassSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load class names:', error);
            // Fallback to default class names
            const defaultClasses = ['5EF', '5AM', '5JS', '6A', '6B', '6C', '7A', '7B', '7C'];
            studentClassSelect.innerHTML = '<option value="">Select your class</option>';
            defaultClasses.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                studentClassSelect.appendChild(option);
            });
        }
    }

    async loadDirectorClassNames() {
        const classNamesList = document.getElementById('classNamesList');
        if (!classNamesList) return;

        try {
            const response = await APIUtils.getClassNames();
            if (response.success && response.classNames) {
                if (response.classNames.length === 0) {
                    classNamesList.innerHTML = '<p class="no-classes-text">No classes configured. Add a class above.</p>';
                    return;
                }
                
                classNamesList.innerHTML = response.classNames.map(className => `
                    <div class="class-name-item">
                        <span class="class-name-text">${className}</span>
                        <button type="button" class="class-delete-btn" data-class="${className}" title="Delete class">×</button>
                    </div>
                `).join('');

                // Add delete handlers
                classNamesList.querySelectorAll('.class-delete-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const className = e.target.getAttribute('data-class');
                        this.confirmDeleteClassName(className);
                    });
                });
            }
        } catch (error) {
            console.error('Failed to load class names for director:', error);
            classNamesList.innerHTML = '<p class="error-text">Failed to load classes.</p>';
        }
    }

    async addClassName() {
        const input = document.getElementById('newClassNameInput');
        if (!input || !this.currentUser || this.currentUser.user_type !== 'director') return;

        const className = input.value.trim();
        if (!className) {
            this.showMessage('Please enter a class name.', 'error');
            return;
        }

        if (className.length > 10) {
            this.showMessage('Class name must be 10 characters or less.', 'error');
            return;
        }

        try {
            const response = await APIUtils.addClassName(this.currentUser.id, className);
            if (response.success) {
                this.showMessage(`Class "${className}" added successfully.`, 'success');
                input.value = '';
                await this.loadDirectorClassNames();
                await this.loadClassNames(); // Update registration dropdown
            } else {
                this.showMessage(response.error || 'Failed to add class.', 'error');
            }
        } catch (error) {
            console.error('Failed to add class name:', error);
            this.showMessage(error.message || 'Failed to add class.', 'error');
        }
    }

    async confirmDeleteClassName(className) {
        if (!confirm(`Are you sure you want to delete the class "${className}"? Students already registered with this class will keep their current class assignment.`)) {
            return;
        }

        try {
            const response = await APIUtils.deleteClassName(this.currentUser.id, className);
            if (response.success) {
                this.showMessage(`Class "${className}" deleted successfully.`, 'success');
                await this.loadDirectorClassNames();
                await this.loadClassNames(); // Update registration dropdown
            } else {
                this.showMessage(response.error || 'Failed to delete class.', 'error');
            }
        } catch (error) {
            console.error('Failed to delete class name:', error);
            this.showMessage(error.message || 'Failed to delete class.', 'error');
        }
    }

    // Student Class Assignment Methods
    async openStudentClassAssignmentModal() {
        console.log('openStudentClassAssignmentModal called');
        const modal = document.getElementById('studentClassAssignmentModal');
        console.log('Modal element:', modal);
        if (!modal) {
            console.error('studentClassAssignmentModal not found!');
            return;
        }

        modal.style.display = 'flex';
        modal.classList.add('active');
        console.log('Modal should now be visible');

        // Load class names for filter dropdown
        await this.loadClassFilterOptions();
        // Load students
        await this.loadStudentsForClassAssignment();
    }

    closeStudentClassAssignmentModal() {
        const modal = document.getElementById('studentClassAssignmentModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        // Refresh grade cards to reflect any changes
        this.updateDirectorModalCards();
    }

    async loadClassFilterOptions() {
        const filterSelect = document.getElementById('studentClassFilter');
        if (!filterSelect) return;

        try {
            const response = await APIUtils.getClassNames();
            if (response.success && response.classNames) {
                // Keep the first two options (All Students, Unassigned Only)
                const existingOptions = filterSelect.querySelectorAll('option');
                existingOptions.forEach((opt, index) => {
                    if (index > 1) opt.remove();
                });

                // Add class name options
                response.classNames.forEach(className => {
                    const option = document.createElement('option');
                    option.value = className;
                    option.textContent = className;
                    filterSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load class filter options:', error);
        }
    }

    async loadStudentsForClassAssignment(filterValue = 'all') {
        const listContainer = document.getElementById('studentClassList');
        if (!listContainer) return;

        listContainer.innerHTML = '<p class="loading-text">Loading students...</p>';

        try {
            // Get all users
            const usersResponse = await APIUtils.getAllUsers();
            // Get class names
            const classNamesResponse = await APIUtils.getClassNames();

            if (usersResponse.success && classNamesResponse.success) {
                let students = usersResponse.users.filter(u => u.user_type === 'student');
                const classNames = classNamesResponse.classNames || [];

                // Apply filter
                if (filterValue === 'unassigned') {
                    students = students.filter(s => !s.class || s.class.trim() === '');
                } else if (filterValue !== 'all') {
                    students = students.filter(s => s.class === filterValue);
                }

                if (students.length === 0) {
                    listContainer.innerHTML = '<p class="no-students-text">No students found matching the filter.</p>';
                    return;
                }

                // Sort by name
                students.sort((a, b) => {
                    const nameA = `${a.first_name} ${a.surname}`.toLowerCase();
                    const nameB = `${b.first_name} ${b.surname}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });

                listContainer.innerHTML = students.map(student => {
                    const initials = `${student.first_name.charAt(0)}${student.surname.charAt(0)}`.toUpperCase();
                    const currentClass = student.class || '';
                    const hasNoClass = !currentClass || currentClass.trim() === '';

                    return `
                        <div class="student-class-item ${hasNoClass ? 'no-class' : ''}" data-student-id="${student.id}">
                            <div class="student-class-info">
                                <div class="student-class-avatar">${initials}</div>
                                <div class="student-class-details">
                                    <div class="student-class-name">${student.first_name} ${student.surname}</div>
                                    <div class="student-class-meta">${currentClass ? `${getGradeFromClass(currentClass) || ''} • ` : ''}${student.house || 'No house'} • ${student.email}</div>
                                </div>
                            </div>
                            <div class="student-class-select-wrapper">
                                <select class="student-class-select" data-student-id="${student.id}" data-original-class="${currentClass}">
                                    <option value="" ${hasNoClass ? 'selected' : ''}>-- No Class --</option>
                                    ${classNames.map(cn => `<option value="${cn}" ${currentClass === cn ? 'selected' : ''}>${cn}</option>`).join('')}
                                </select>
                                ${hasNoClass ? '<span class="unassigned-badge">Unassigned</span>' : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                // Track changes
                this.studentClassChanges = {};
                listContainer.querySelectorAll('.student-class-select').forEach(select => {
                    select.addEventListener('change', (e) => {
                        const studentId = e.target.dataset.studentId;
                        const originalClass = e.target.dataset.originalClass;
                        const newClass = e.target.value;

                        if (newClass !== originalClass) {
                            this.studentClassChanges[studentId] = newClass;
                            e.target.closest('.student-class-item').classList.add('changed');
                        } else {
                            delete this.studentClassChanges[studentId];
                            e.target.closest('.student-class-item').classList.remove('changed');
                        }

                        this.updateSaveButtonState();
                    });
                });

                this.updateSaveButtonState();
            } else {
                listContainer.innerHTML = '<p class="error-text">Failed to load students.</p>';
            }
        } catch (error) {
            console.error('Failed to load students for class assignment:', error);
            listContainer.innerHTML = '<p class="error-text">Failed to load students.</p>';
        }
    }

    updateSaveButtonState() {
        const saveBtn = document.getElementById('saveAllStudentClassesBtn');
        if (!saveBtn) return;

        const changeCount = Object.keys(this.studentClassChanges || {}).length;
        saveBtn.textContent = changeCount > 0 
            ? `Save ${changeCount} Change${changeCount > 1 ? 's' : ''}` 
            : 'Save All Changes';
        saveBtn.disabled = changeCount === 0;
    }

    async saveAllStudentClasses() {
        if (!this.studentClassChanges || Object.keys(this.studentClassChanges).length === 0) {
            this.showMessage('No changes to save.', 'info');
            return;
        }

        const updates = Object.entries(this.studentClassChanges).map(([studentId, className]) => ({
            studentId: parseInt(studentId),
            className: className || null
        }));

        try {
            const response = await APIUtils.updateStudentClasses(this.currentUser.id, updates);
            if (response.success) {
                this.showMessage(`Successfully updated ${response.count} student${response.count > 1 ? 's' : ''}.`, 'success');
                this.studentClassChanges = {};
                
                // Refresh the list in the modal
                const filterSelect = document.getElementById('studentClassFilter');
                const filterValue = filterSelect ? filterSelect.value : 'all';
                await this.loadStudentsForClassAssignment(filterValue);
                
                // Refresh the grade cards on the director dashboard
                await this.updateDirectorModalCards();
            } else {
                this.showMessage(response.error || 'Failed to update student classes.', 'error');
            }
        } catch (error) {
            console.error('Failed to save student classes:', error);
            this.showMessage(error.message || 'Failed to save changes.', 'error');
        }
    }

    // Student Deletion Modal Methods
    async openStudentDeletionModal() {
        console.log('openStudentDeletionModal called');
        const modal = document.getElementById('studentDeletionModal');
        if (!modal) {
            console.error('studentDeletionModal not found');
            return;
        }

        modal.style.display = 'flex';
        modal.classList.add('active');

        // Load students
        await this.loadStudentsForDeletion();
    }

    closeStudentDeletionModal() {
        const modal = document.getElementById('studentDeletionModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    }

    async loadStudentsForDeletion(searchTerm = '') {
        const listContainer = document.getElementById('studentDeletionList');
        if (!listContainer) return;

        listContainer.innerHTML = '<p class="loading-text">Loading students...</p>';

        try {
            const usersResponse = await APIUtils.getAllUsers();

            if (usersResponse.success) {
                let students = usersResponse.users.filter(u => u.user_type === 'student');

                // Apply search filter
                if (searchTerm.trim()) {
                    const term = searchTerm.toLowerCase();
                    students = students.filter(s => 
                        `${s.first_name} ${s.surname}`.toLowerCase().includes(term) ||
                        s.email.toLowerCase().includes(term)
                    );
                }

                if (students.length === 0) {
                    listContainer.innerHTML = searchTerm 
                        ? '<p class="no-students-text">No students found matching your search.</p>'
                        : '<p class="no-students-text">No students registered yet.</p>';
                    return;
                }

                // Sort by name
                students.sort((a, b) => {
                    const nameA = `${a.first_name} ${a.surname}`.toLowerCase();
                    const nameB = `${b.first_name} ${b.surname}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });

                listContainer.innerHTML = students.map(student => {
                    const initials = `${student.first_name.charAt(0)}${student.surname.charAt(0)}`.toUpperCase();

                    return `
                        <div class="student-deletion-item" data-student-id="${student.id}">
                            <div class="student-deletion-info">
                                <div class="student-deletion-avatar">${initials}</div>
                                <div class="student-deletion-details">
                                    <div class="student-deletion-name">${student.first_name} ${student.surname}</div>
                                    <div class="student-deletion-meta">${student.class ? `${student.class} (${getGradeFromClass(student.class) || 'No grade'})` : 'No class'} • ${student.house || 'No house'} • ${student.email}</div>
                                </div>
                            </div>
                            <button type="button" class="btn-delete-student" data-student-id="${student.id}" data-student-name="${student.first_name} ${student.surname}">
                                🗑️ Delete
                            </button>
                        </div>
                    `;
                }).join('');

                // Add delete button handlers
                listContainer.querySelectorAll('.btn-delete-student').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const studentId = e.target.dataset.studentId;
                        const studentName = e.target.dataset.studentName;
                        this.confirmDeleteStudent(studentId, studentName);
                    });
                });
            } else {
                listContainer.innerHTML = '<p class="error-text">Failed to load students.</p>';
            }
        } catch (error) {
            console.error('Failed to load students for deletion:', error);
            listContainer.innerHTML = '<p class="error-text">Failed to load students.</p>';
        }
    }

    async confirmDeleteStudent(studentId, studentName) {
        const confirmed = confirm(
            `Are you sure you want to delete "${studentName}"?\n\n` +
            `This will permanently remove:\n` +
            `• Their account and login\n` +
            `• All mood check-ins\n` +
            `• All journal entries\n` +
            `• All house points earned\n` +
            `• All tile flips\n` +
            `• All messages\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            const response = await APIUtils.deleteStudent(this.currentUser.id, studentId);
            if (response.success) {
                this.showMessage(response.message || `Student deleted successfully.`, 'success');
                // Refresh the list
                const searchInput = document.getElementById('studentDeletionSearch');
                const searchTerm = searchInput ? searchInput.value : '';
                await this.loadStudentsForDeletion(searchTerm);
            } else {
                this.showMessage(response.error || 'Failed to delete student.', 'error');
            }
        } catch (error) {
            console.error('Failed to delete student:', error);
            this.showMessage(error.message || 'Failed to delete student.', 'error');
        }
    }

    // Student Credentials Modal
    async openStudentCredentialsModal() {
        const modal = document.getElementById('studentCredentialsModal');
        if (!modal) return;

        modal.style.display = 'flex';
        modal.classList.add('active');
        await this.loadStudentsForCredentials();
    }

    closeStudentCredentialsModal() {
        const modal = document.getElementById('studentCredentialsModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        this.studentResetPasswords = {};
    }

    async loadStudentsForCredentials(searchTerm = '') {
        const listContainer = document.getElementById('studentCredentialsList');
        if (!listContainer) return;

        listContainer.innerHTML = '<p class="loading-text">Loading students...</p>';

        try {
            const usersResponse = await APIUtils.getAllUsers();

            if (usersResponse.success) {
                let students = usersResponse.users.filter(u => u.user_type === 'student');

                if (searchTerm.trim()) {
                    const term = searchTerm.toLowerCase();
                    students = students.filter(s =>
                        `${s.first_name} ${s.surname}`.toLowerCase().includes(term) ||
                        (s.email && s.email.toLowerCase().includes(term))
                    );
                }

                if (students.length === 0) {
                    listContainer.innerHTML = searchTerm
                        ? '<p class="no-students-text">No students found matching your search.</p>'
                        : '<p class="no-students-text">No students registered yet.</p>';
                    return;
                }

                students.sort((a, b) => {
                    const nameA = `${a.first_name} ${a.surname}`.toLowerCase();
                    const nameB = `${b.first_name} ${b.surname}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });

                this.studentResetPasswords = this.studentResetPasswords || {};
                listContainer.innerHTML = students.map(student => {
                    const initials = `${student.first_name.charAt(0)}${student.surname.charAt(0)}`.toUpperCase();
                    const email = student.email || '';
                    const resetPassword = this.studentResetPasswords[student.id];
                    const passwordRow = resetPassword
                        ? `<div class="student-credentials-password-row">
                            <span class="credentials-label">Password:</span>
                            <code class="credentials-password">${resetPassword}</code>
                            <button type="button" class="btn-copy-password" data-password="${resetPassword}" title="Copy password">📋 Copy</button>
                           </div>`
                        : '';
                    return `
                        <div class="student-credentials-item" data-student-id="${student.id}">
                            <div class="student-credentials-info">
                                <div class="student-credentials-avatar">${initials}</div>
                                <div class="student-credentials-details">
                                    <div class="student-credentials-name">${student.first_name} ${student.surname}</div>
                                    <div class="student-credentials-meta">${student.class || 'No class'} • ${student.house || 'No house'}</div>
                                    <div class="student-credentials-email-row">
                                        <span class="credentials-label">Username:</span>
                                        <code class="credentials-email">${email}</code>
                                        <button type="button" class="btn-copy-email" data-email="${email}" title="Copy email">📋 Copy</button>
                                    </div>
                                    ${passwordRow}
                                </div>
                            </div>
                            <button type="button" class="btn-reset-password" data-student-id="${student.id}" data-student-name="${student.first_name} ${student.surname}">
                                🔑 Reset Password
                            </button>
                        </div>
                    `;
                }).join('');

                listContainer.querySelectorAll('.btn-copy-email').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const email = e.target.dataset.email;
                        if (email && navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(email).then(() => {
                                this.showMessage('Email copied to clipboard.', 'success');
                            }).catch(() => this.copyToClipboardFallback(email));
                        } else {
                            this.copyToClipboardFallback(email);
                        }
                    });
                });

                listContainer.querySelectorAll('.btn-copy-password').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const password = e.target.dataset.password;
                        if (password && navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(password).then(() => {
                                this.showMessage('Password copied to clipboard.', 'success');
                            }).catch(() => this.copyPasswordFallback(password));
                        } else if (password) {
                            this.copyPasswordFallback(password);
                        }
                    });
                });

                listContainer.querySelectorAll('.btn-reset-password').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const button = e.currentTarget;
                        const studentId = button.dataset.studentId;
                        const studentName = button.dataset.studentName;
                        this.handleResetStudentPassword(studentId, studentName);
                    });
                });
            } else {
                listContainer.innerHTML = '<p class="error-text">Failed to load students.</p>';
            }
        } catch (error) {
            console.error('Failed to load students for credentials:', error);
            listContainer.innerHTML = '<p class="error-text">Failed to load students.</p>';
        }
    }

    copyToClipboardFallback(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            this.showMessage('Email copied to clipboard.', 'success');
        } catch (err) {
            this.showMessage('Could not copy. Please copy manually: ' + text, 'error');
        }
        document.body.removeChild(ta);
    }

    copyPasswordFallback(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            this.showMessage('Password copied to clipboard.', 'success');
        } catch (err) {
            this.showMessage('Could not copy. Please copy manually.', 'error');
        }
        document.body.removeChild(ta);
    }

    async handleResetStudentPassword(studentId, studentName) {
        this.pendingPasswordReset = { studentId, studentName };
        const modal = document.getElementById('passwordResetModal');
        const nameElement = document.getElementById('passwordResetStudentName');
        const passwordInput = document.getElementById('customPasswordInput');
        
        if (!modal || !nameElement || !passwordInput) {
            console.error('Password reset modal elements not found');
            return;
        }

        nameElement.textContent = `Reset password for: ${studentName}`;
        passwordInput.value = '';
        modal.style.display = 'flex';
        modal.classList.add('active');
        passwordInput.focus();
    }

    closePasswordResetModal() {
        const modal = document.getElementById('passwordResetModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        this.pendingPasswordReset = null;
        const passwordInput = document.getElementById('customPasswordInput');
        if (passwordInput) passwordInput.value = '';
    }

    async confirmPasswordReset() {
        if (!this.pendingPasswordReset) return;

        const { studentId, studentName } = this.pendingPasswordReset;
        const passwordInput = document.getElementById('customPasswordInput');
        const trimmed = passwordInput ? passwordInput.value.trim() : '';

        if (trimmed) {
            const validation = SecurityUtils.validatePasswordStrength(trimmed);
            if (!validation.isValid) {
                this.showMessage(validation.errors.join('. '), 'error');
                return;
            }
        }

        this.closePasswordResetModal();

        const btn = document.querySelector(`.btn-reset-password[data-student-id="${studentId}"]`);
        if (btn) btn.disabled = true;

        try {
            const response = await APIUtils.resetStudentPassword(this.currentUser.id, studentId, trimmed || undefined);
            if (response.success) {
                this.studentResetPasswords = this.studentResetPasswords || {};
                this.studentResetPasswords[studentId] = response.newPassword;
                this.showMessage('Password reset. It is shown below—copy when ready.', 'success');

                const searchInput = document.getElementById('studentCredentialsSearch');
                await this.loadStudentsForCredentials(searchInput ? searchInput.value : '');
            } else {
                this.showMessage(response.error || 'Failed to reset password.', 'error');
            }
        } catch (error) {
            console.error('Failed to reset password:', error);
            this.showMessage(error.message || 'Failed to reset password.', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async updateDirectorHousePoints() {
        if (!this.currentUser || this.currentUser.user_type !== 'director') {
            return;
        }

        const housePointsRow = document.getElementById('directorHousePointsRow');
        if (!housePointsRow) return;

        const houseOrder = ['Mirfield', 'Bavin', 'Sage', 'Bishops', 'Dodson'];
        const houseBadgeMap = {
            'Bavin': 'images/SP House_Bavin.png',
            'Bishops': 'images/SP House_Bishops.png',
            'Dodson': 'images/SP House_Dodson.png',
            'Mirfield': 'images/SP House_Mirfield.png',
            'Sage': 'images/SP House_Sage.png'
        };

        try {
            const response = await APIUtils.getHousePointsTotals(this.currentUser.id);
            if (response.success && response.housePoints) {
                const byHouse = {};
                (response.housePoints || []).forEach(h => { byHouse[h.house] = h; });
                housePointsRow.innerHTML = houseOrder.map(houseName => {
                    const house = byHouse[houseName] || { house: houseName, total_points: 0, student_count: 0 };
                    const badgeSrc = houseBadgeMap[house.house] || '';
                    const pts = parseInt(house.total_points) || 0;
                    const count = parseInt(house.student_count) || 0;
                    return `
                        <div class="house-points-item">
                            <img src="${badgeSrc}" alt="${house.house} House Badge" class="house-badge-director">
                            <div class="house-points-details">
                                <div class="house-name-director">${house.house} House</div>
                                <div class="house-points-total">${pts} Points</div>
                                <div class="house-students-count">${count} Student${count !== 1 ? 's' : ''}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                housePointsRow.innerHTML = '<p class="loading-text">No house points data available.</p>';
            }
        } catch (error) {
            console.error('Error loading house points:', error);
            housePointsRow.innerHTML = '<p class="loading-text">Error loading house points.</p>';
        }
    }

    async saveDirectorProfile() {
        const msgToggle = document.getElementById('messageCenterPluginToggle');
        const ghostToggle = document.getElementById('ghostModePluginToggle');
        const tileFlipToggle = document.getElementById('tileFlipPluginToggle');
        const housePointsToggle = document.getElementById('housePointsPluginToggle');
        const modal = document.getElementById('directorProfileModal');
        if (!this.currentUser || this.currentUser.user_type !== 'director' || !msgToggle || !modal) return;
        const messageCenterEnabled = !!msgToggle.checked;
        const ghostModeEnabled = ghostToggle ? !!ghostToggle.checked : true;
        const tileFlipEnabled = tileFlipToggle ? !!tileFlipToggle.checked : true;
        const housePointsEnabled = housePointsToggle ? !!housePointsToggle.checked : true;
        try {
            const res = await APIUtils.updateDirectorSettings(this.currentUser.id, messageCenterEnabled, ghostModeEnabled, tileFlipEnabled, housePointsEnabled);
            if (res.success) {
                if (typeof res.messageCenterEnabled === 'boolean') this.pluginSettings.messageCenterEnabled = res.messageCenterEnabled;
                if (typeof res.ghostModeEnabled === 'boolean') this.pluginSettings.ghostModeEnabled = res.ghostModeEnabled;
                if (typeof res.tileFlipEnabled === 'boolean') this.pluginSettings.tileFlipEnabled = res.tileFlipEnabled;
                if (typeof res.housePointsEnabled === 'boolean') this.pluginSettings.housePointsEnabled = res.housePointsEnabled;
                this.applyMessageCenterVisibility();
                this.applyGhostModeVisibility();
                this.applyTileFlipVisibility();
                this.applyHousePointsVisibility();
                modal.style.display = 'none';
                modal.classList.remove('active');
                this.showMessage('Settings saved.', 'success');
            } else {
                this.showMessage(res.error || 'Failed to save settings.', 'error');
            }
        } catch (e) {
            console.error('Save director profile error:', e);
            this.showMessage('Failed to save settings. Please try again.', 'error');
        }
    }

    async confirmDeleteAllStudentData() {
        if (!this.currentUser || this.currentUser.user_type !== 'director') return;
        const msg = 'Permanently delete all student data? This will remove all students and their check-ins, journal entries, house points, tile flips, and messages. This cannot be undone.';
        if (!confirm(msg)) return;
        const btn = document.getElementById('deleteAllStudentDataBtn');
        if (btn) btn.disabled = true;
        try {
            const res = await APIUtils.deleteAllStudentData(this.currentUser.id);
            if (res.success) {
                this.showMessage(`All student data deleted. ${res.deletedCount || 0} student(s) removed.`, 'success');
                const modal = document.getElementById('directorProfileModal');
                if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
                this.updateDirectorModalCards();
                this.updateDirectorHousePoints();
            } else {
                this.showMessage(res.error || 'Failed to delete student data.', 'error');
            }
        } catch (e) {
            console.error('Delete all student data error:', e);
            this.showMessage(e.message || 'Failed to delete student data. Please try again.', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async confirmDeleteAllTeacherData() {
        if (!this.currentUser || this.currentUser.user_type !== 'director') return;
        const msg = 'Permanently delete all teacher data? This will remove all teachers and their check-ins, journal entries, messages, and assignments. This cannot be undone.';
        if (!confirm(msg)) return;
        const btn = document.getElementById('deleteAllTeacherDataBtn');
        if (btn) btn.disabled = true;
        try {
            const res = await APIUtils.deleteAllTeacherData(this.currentUser.id);
            if (res.success) {
                this.showMessage(`All teacher data deleted. ${res.deletedCount || 0} teacher(s) removed.`, 'success');
                const modal = document.getElementById('directorProfileModal');
                if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
                this.updateDirectorModalCards();
            } else {
                this.showMessage(res.error || 'Failed to delete teacher data.', 'error');
            }
        } catch (e) {
            console.error('Delete all teacher data error:', e);
            this.showMessage(e.message || 'Failed to delete teacher data. Please try again.', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    // Show group detail modal
    async showGroupDetailModal(groupId, groupType) {
        try {
            console.log('showGroupDetailModal called with:', groupId, groupType);
            const modal = document.getElementById('directorGroupDetailModal');
            const titleElement = document.getElementById('directorGroupDetailTitle');
            const contentElement = document.getElementById('directorGroupDetailContent');
            
            console.log('Group modal elements found:', { modal: !!modal, titleElement: !!titleElement, contentElement: !!contentElement });
            
            if (!modal || !titleElement || !contentElement) {
                console.error('Missing group modal elements');
                return;
            }
            
            // Set title based on group type
            if (groupType === 'grade') {
                titleElement.textContent = `${groupId.replace('grade', 'Grade ')} Students`;
            } else if (groupType === 'house') {
                titleElement.textContent = `${groupId.charAt(0).toUpperCase() + groupId.slice(1)} House Students`;
            } else if (groupType === 'teachers') {
                titleElement.textContent = 'Teachers';
            }
            
            // Load and display group data
            const usersResponse = await APIUtils.getAllUsers();
            const moodResponse = await APIUtils.getAllMoodData('daily');
            
            if (usersResponse.success && moodResponse.success) {
                const users = usersResponse.users || [];
                const moodData = moodResponse.checkins || [];
                
                let groupUsers = [];
                if (groupType === 'grade') {
                    const gradeValue = groupId.replace('grade', 'Grade ');
                    // Filter students by grade - supports both new class names (5EF, 6A) and legacy format (Grade 5)
                    groupUsers = users.filter(user => user.user_type === 'student' && isClassInGrade(user.class, gradeValue));
                } else if (groupType === 'house') {
                    groupUsers = users.filter(user => 
                        user.user_type === 'student' && user.house && user.house.toLowerCase() === groupId
                    );
                } else if (groupType === 'teachers') {
                    groupUsers = users.filter(user => user.user_type === 'teacher');
                }
                
                this.currentGroupUsers = groupUsers;
                this.currentGroupMoodData = moodData;
                this.currentGroupType = groupType;
                this.displayGroupDetailContent(contentElement, groupUsers, moodData, groupType);
            }
            
            console.log('Showing group detail modal');
            modal.style.display = 'flex';
            modal.style.zIndex = '3000';
            modal.classList.add('active');
            console.log('Group modal classes after adding active:', modal.className);
            console.log('Group modal computed display:', window.getComputedStyle(modal).display);
            console.log('Group modal computed visibility:', window.getComputedStyle(modal).visibility);
            console.log('Group modal computed z-index:', window.getComputedStyle(modal).zIndex);
        } catch (error) {
            console.error('Failed to show group detail modal:', error);
        }
    }

    // Display group detail content
    displayGroupDetailContent(contentElement, users, moodData, groupType) {
        const groupMoods = moodData.filter(mood => 
            users.some(user => user.id === mood.user_id)
        );
        
        const topMood = this.getTopMood(groupMoods);
        
        const distinctClasses = [];
        if (groupType === 'grade' || groupType === 'house') {
            const seen = new Set();
            (users || []).forEach(u => {
                const c = u.class || 'No class';
                if (!seen.has(c)) { seen.add(c); distinctClasses.push(c); }
            });
            distinctClasses.sort((a, b) => (a || '').localeCompare(b || ''));
        }
        
        const classFilterHTML = (groupType === 'grade' || groupType === 'house') && distinctClasses.length > 0
            ? `
                <div class="director-group-class-filter">
                    <label for="groupClassFilter">Filter by class:</label>
                    <select id="groupClassFilter" class="group-class-filter-select">
                        <option value="">All classes</option>
                        ${distinctClasses.map(c => `<option value="${(c || '').replace(/"/g, '&quot;')}">${c || 'No class'}</option>`).join('')}
                    </select>
                </div>
            `
            : '';
        
        contentElement.innerHTML = `
            <div class="director-group-detail-content">
                <div class="director-group-summary">
                    <div class="group-emoji">${groupType === 'teachers' ? '👨‍🏫' : '🎓'}</div>
                    <div class="director-group-info">
                        <h4>${contentElement.closest('.modal').querySelector('h3').textContent}</h4>
                        <div class="director-group-stats">
                            <div class="director-stat-item">
                                <div class="director-stat-label">Total Members</div>
                                <div class="director-stat-value" id="groupDetailMemberCount">${users.length}</div>
                            </div>
                            <div class="director-stat-item">
                                <div class="director-stat-label">Top Mood</div>
                                <div class="director-stat-value">${topMood.emoji} ${topMood.name}</div>
                            </div>
                            <div class="director-stat-item">
                                <div class="director-stat-label">Check-ins Today</div>
                                <div class="director-stat-value">${groupMoods.length}</div>
                            </div>
                        </div>
                    </div>
                </div>
                ${classFilterHTML}
                <div class="director-students-list" id="groupStudentsList">
                    ${this.generateStudentsListHTML(users, moodData)}
                </div>
            </div>
        `;
        
        const filterEl = document.getElementById('groupClassFilter');
        if (filterEl) {
            filterEl.addEventListener('change', () => this.applyGroupClassFilter());
        }
        
        this.setupStudentClickHandlers();
    }

    applyGroupClassFilter() {
        const filterEl = document.getElementById('groupClassFilter');
        const listEl = document.getElementById('groupStudentsList');
        const countEl = document.getElementById('groupDetailMemberCount');
        if (!filterEl || !listEl || !this.currentGroupUsers || !this.currentGroupMoodData) return;
        const selectedClass = filterEl.value;
        const users = selectedClass === ''
            ? this.currentGroupUsers
            : selectedClass === 'No class'
                ? this.currentGroupUsers.filter(u => !u.class)
                : this.currentGroupUsers.filter(u => (u.class || '') === selectedClass);
        if (countEl) countEl.textContent = users.length;
        listEl.innerHTML = this.generateStudentsListHTML(users, this.currentGroupMoodData);
        this.setupStudentClickHandlers();
    }

    // Generate students list HTML
    generateStudentsListHTML(users, moodData) {
        if (users.length === 0) {
            return '<div class="no-students">No members found</div>';
        }
        
        return users.map(user => {
            const userMoods = moodData.filter(mood => mood.user_id === user.id);
            const latestMood = userMoods.length > 0 ? userMoods[userMoods.length - 1] : null;
            const moodEmoji = latestMood ? this.getMoodEmoji(latestMood.mood) : '😊';
            
            const initials = `${user.first_name.charAt(0)}${user.surname.charAt(0)}`.toUpperCase();
            
            return `
                <div class="director-student-item" data-user-id="${user.id}">
                    <div class="director-student-avatar">${initials}</div>
                    <div class="director-student-info">
                        <div class="director-student-name">${user.first_name} ${user.surname}</div>
                        <div class="director-student-details">
                            ${user.class ? `${user.class} (${getGradeFromClass(user.class) || 'No grade'})` : user.house || 'Teacher'} • ${user.email}
                        </div>
                    </div>
                    <div class="director-student-mood">
                        <span class="director-mood-emoji-small">${moodEmoji}</span>
                        <span>${userMoods.length} check-ins</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Get mood emoji from mood name
    getMoodEmoji(moodName) {
        const moodEmojis = {
            'happy': '😊',
            'excited': '🤩',
            'calm': '😌',
            'tired': '😴',
            'anxious': '😰',
            'sad': '😢',
            'angry': '😠',
            'confused': '😕'
        };
        return moodEmojis[moodName] || '😊';
    }

    // Setup student click handlers
    setupStudentClickHandlers() {
        const studentItems = document.querySelectorAll('.director-student-item');
        console.log('Setting up click handlers for', studentItems.length, 'student items');
        studentItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = item.dataset.userId;
                console.log('Student item clicked, userId:', userId);
                await this.showStudentDetailModal(userId);
            });
        });
    }

    // Show student detail modal
    async showStudentDetailModal(userId) {
        try {
            console.log('showStudentDetailModal called with userId:', userId);
            const modal = document.getElementById('directorStudentDetailModal');
            const titleElement = document.getElementById('directorStudentDetailTitle');
            const contentElement = document.getElementById('directorStudentDetailContent');
            
            console.log('Modal elements found:', { modal: !!modal, titleElement: !!titleElement, contentElement: !!contentElement });
            
            if (!modal || !titleElement || !contentElement) {
                console.error('Missing modal elements');
                return;
            }
            
            // Show modal immediately
            console.log('Showing student detail modal immediately');
            modal.style.display = 'flex';
            modal.style.zIndex = '3000';
            modal.classList.add('active');
            console.log('Modal classes after adding active:', modal.className);
            console.log('Modal computed display:', window.getComputedStyle(modal).display);
            console.log('Modal computed visibility:', window.getComputedStyle(modal).visibility);
            console.log('Modal computed z-index:', window.getComputedStyle(modal).zIndex);
            
            // Load user, mood, and this student's journal entries (all time so director sees full history)
            console.log('Loading user and mood data...');
            const usersResponse = await APIUtils.getAllUsers();
            const moodResponse = await APIUtils.getAllMoodData('daily');
            const journalResponse = await APIUtils.getJournalEntries(userId, 'all');
            
            console.log('API responses:', {
                usersSuccess: usersResponse.success,
                moodSuccess: moodResponse.success,
                journalSuccess: journalResponse.success,
                usersCount: usersResponse.users?.length || 0,
                moodCount: moodResponse.checkins?.length || 0,
                journalCount: journalResponse.entries?.length || 0
            });
            
            if (usersResponse.success && moodResponse.success && journalResponse.success) {
                const users = usersResponse.users || [];
                const moodData = moodResponse.checkins || [];
                const journalData = journalResponse.entries || [];
                
                console.log('Looking for user with ID:', userId);
                const user = users.find(u => u.id == userId); // Use == instead of === for type coercion
                console.log('Found user:', user);
                
                if (!user) {
                    console.error('User not found with ID:', userId);
                    return;
                }
                
                titleElement.textContent = user.first_name;
                console.log('Set title to:', titleElement.textContent);
                
                const userJournals = journalData.filter(journal => journal.user_id == userId); // Use == for type coercion
                this.currentStudentDetailUserId = user.id;
                this.displayStudentDetailContent(contentElement, user, [], userJournals);
                this.loadStudentCheckinsForPeriod(user.id, 'weekly');
                console.log('Content populated');
            } else {
                console.error('API responses failed:', { usersResponse, moodResponse, journalResponse });
                // Show modal with error message
                contentElement.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">Failed to load user data. Please try again.</div>';
            }
        } catch (error) {
            console.error('Failed to show student detail modal:', error);
        }
    }

    // Display student detail content
    displayStudentDetailContent(contentElement, user, moodData, journalData) {
        console.log('displayStudentDetailContent called with:', { user, moodDataLength: moodData.length, journalDataLength: journalData.length });
        
        const initials = `${user.first_name.charAt(0)}${user.surname.charAt(0)}`.toUpperCase();
        const latestMood = moodData.length > 0 ? moodData[moodData.length - 1] : null;
        const moodEmoji = latestMood ? this.getMoodEmoji(latestMood.mood) : '😊';
        
        const contentHTML = `
            <div class="director-student-detail-content">
                <div class="director-student-header">
                    <div class="student-avatar-large">${initials}</div>
                    <div class="director-student-info">
                        <h4>${user.first_name} ${user.surname}</h4>
                        <div class="director-student-details">
                            ${user.class ? `Class: ${user.class} • ${getGradeFromClass(user.class) || 'No grade'}` : user.house || 'Teacher'} • ${user.email}
                            <br>
                            Latest Mood: ${moodEmoji} ${latestMood ? latestMood.mood : 'No recent mood'}
                        </div>
                    </div>
                </div>
                
                <div class="director-student-checkins">
                    <div class="director-checkins-period-row">
                        <h5>Check-ins</h5>
                        <div class="director-checkins-period-tabs">
                            <button type="button" class="director-checkins-period-tab active" data-period="weekly">Weekly</button>
                            <button type="button" class="director-checkins-period-tab" data-period="monthly">Monthly</button>
                            <button type="button" class="director-checkins-period-tab" data-period="all">All time</button>
                        </div>
                    </div>
                    <div id="directorStudentCheckinsList" class="director-checkins-list">
                        <p class="loading-text">Loading check-ins...</p>
                    </div>
                </div>
                
                <div class="director-student-journal">
                    <h5>Journal Entries (${journalData.length})</h5>
                    ${this.generateJournalHTML(journalData)}
                </div>
            </div>
        `;
        
        console.log('Setting content HTML, length:', contentHTML.length);
        contentElement.innerHTML = contentHTML;
        
        document.querySelectorAll('.director-checkins-period-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const period = tab.getAttribute('data-period');
                if (!this.currentStudentDetailUserId || !period) return;
                document.querySelectorAll('.director-checkins-period-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadStudentCheckinsForPeriod(this.currentStudentDetailUserId, period);
            });
        });
        console.log('Content set successfully');
    }

    async loadStudentCheckinsForPeriod(userId, period) {
        const container = document.getElementById('directorStudentCheckinsList');
        if (!container) return;
        container.innerHTML = '<p class="loading-text">Loading check-ins...</p>';
        try {
            const res = await APIUtils.getMoodHistory(userId, period);
            if (res.success && Array.isArray(res.checkins)) {
                const count = res.checkins.length;
                const heading = container.closest('.director-student-checkins')?.querySelector('.director-checkins-period-row h5');
                if (heading) heading.textContent = `Check-ins (${count})`;
                container.innerHTML = this.generateCheckinsHTML(res.checkins, true);
            } else {
                const heading = container.closest('.director-student-checkins')?.querySelector('.director-checkins-period-row h5');
                if (heading) heading.textContent = 'Check-ins (0)';
                container.innerHTML = '<div class="no-checkins">No check-ins for this period.</div>';
            }
        } catch (e) {
            console.error('Load student check-ins error:', e);
            container.innerHTML = '<div class="no-checkins">Failed to load check-ins.</div>';
        }
    }

    // Generate check-ins HTML (showAll: if true, show all newest-first; otherwise show last 5 oldest-first)
    generateCheckinsHTML(moodData, showAll = false) {
        if (moodData.length === 0) {
            return '<div class="no-checkins">No check-ins for this period.</div>';
        }
        const toShow = showAll ? moodData : moodData.slice(-5);
        const ordered = showAll ? toShow : toShow.slice().reverse();
        return ordered.map(mood => {
            const moodEmoji = this.getMoodEmoji(mood.mood);
            const date = new Date(mood.timestamp).toLocaleString();
            
            return `
                <div class="director-checkin-item">
                    <div class="director-checkin-header">
                        <div class="director-checkin-mood">
                            <span class="director-mood-emoji-small">${moodEmoji}</span>
                            <span>${mood.mood}</span>
                        </div>
                        <div class="director-checkin-date">${date}</div>
                    </div>
                    <div class="director-checkin-content">
                        <strong>Location:</strong> ${mood.location || 'Not specified'}<br>
                        ${mood.emotions ? `<strong>Emotions:</strong> ${mood.emotions.join(', ')}<br>` : ''}
                        ${mood.notes ? `<strong>Notes:</strong> ${mood.notes}` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Generate journal HTML
    generateJournalHTML(journalData) {
        if (journalData.length === 0) {
            return '<div class="no-journal">No journal entries</div>';
        }
        
        return journalData.slice(-5).reverse().map(journal => {
            const date = new Date(journal.timestamp).toLocaleString();
            // Use 'entry' field from database, fallback to 'content' for legacy data
            const entryText = journal.entry || journal.content || 'No content';
            
            return `
                <div class="director-journal-item">
                    <div class="director-journal-header">
                        <div class="director-journal-mood">
                            <span>📝 Journal Entry</span>
                        </div>
                        <div class="director-journal-date">${date}</div>
                    </div>
                    <div class="director-journal-content">
                        ${entryText}
                    </div>
                </div>
            `;
        }).join('');
    }

    // ==================== CHART FUNCTIONS ====================

    // Initialize director charts
    async initializeDirectorCharts() {
        try {
            console.log('Initializing director charts...');
            
            // Setup chart controls
            this.setupChartControls();
            
            // Load and display charts
            await this.updateAllCharts();
            
        } catch (error) {
            console.error('Failed to initialize charts:', error);
        }
    }

    // Setup chart control handlers
    setupChartControls() {
        const exportBtn = document.getElementById('exportChartsBtn');
        const periodSelect = document.getElementById('chartPeriodSelect');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportChartData());
        }
        
        if (periodSelect) {
            periodSelect.addEventListener('change', () => this.updateAllCharts());
        }

        // Chart view tabs: switch view without scrolling
        document.querySelectorAll('.chart-view-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const chart = btn.dataset.chart;
                if (!chart) return;
                document.querySelectorAll('.chart-view-tab').forEach(b => {
                    b.classList.toggle('active', b === btn);
                    b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
                });
                this.currentChartTab = chart;
                this.renderActiveMoodChart();
            });
        });
    }

    // Update all charts with fresh data (builds all views; renders active tab)
    async updateAllCharts() {
        try {
            const period = document.getElementById('chartPeriodSelect')?.value || 'daily';
            console.log('Updating charts with period:', period);
            
            const [usersResponse, moodResponse, journalResponse] = await Promise.all([
                APIUtils.getAllUsers(),
                APIUtils.getAllMoodData(period),
                APIUtils.getAllJournalEntries(period)
            ]);

            if (usersResponse.success && moodResponse.success) {
                const users = usersResponse.users || [];
                const moodData = moodResponse.checkins || [];

                if (users.length === 0) console.warn('No users found for charts');
                if (moodData.length === 0) console.warn('No mood data found for charts');

                // Build and store all four chart datasets
                const houseGroup = this.aggregateMoodDataByHouses(users, moodData);
                const gradeGroup = this.aggregateMoodDataByGrades(users, moodData);
                const schoolGroup = this.aggregateMoodDataBySchool(users, moodData);
                const classGroup = this.aggregateMoodDataByClass(users, moodData);

                const houseLabels = Object.keys(houseGroup);
                const gradeLabels = Object.keys(gradeGroup);
                const schoolLabels = Object.keys(schoolGroup);
                const classLabels = Object.keys(classGroup);

                this.lastHousesChartData = { labels: houseLabels, ...this.getApexMoodSeries(houseGroup, houseLabels), groupData: houseGroup };
                this.lastGradesChartData = { labels: gradeLabels, ...this.getApexMoodSeries(gradeGroup, gradeLabels), groupData: gradeGroup };
                this.lastSchoolChartData = { labels: schoolLabels, ...this.getApexMoodSeries(schoolGroup, schoolLabels), groupData: schoolGroup };
                this.lastClassChartData = { labels: classLabels, ...this.getApexMoodSeries(classGroup, classLabels), groupData: classGroup };

                this.lastDirectorUsers = users;
                this.lastDirectorMoodData = moodData;

                this.currentChartTab = document.querySelector('.chart-view-tab.active')?.dataset?.chart || 'house';
                this.renderActiveMoodChart();
            } else {
                console.error('API calls failed:', { usersResponse, moodResponse });
            }
        } catch (error) {
            console.error('Failed to update charts:', error);
        }
    }

    // Render the currently selected mood chart (single container, no scrolling)
    renderActiveMoodChart() {
        const container = document.getElementById('directorMoodChartContainer');
        const titleEl = document.getElementById('directorChartTitle');
        if (!container || !titleEl) return;

        const tab = this.currentChartTab || 'house';
        let chartData, title;
        if (tab === 'house') {
            chartData = this.lastHousesChartData;
            title = 'Mood Distribution by House';
        } else if (tab === 'grade') {
            chartData = this.lastGradesChartData;
            title = 'Mood Distribution by Grade';
        } else if (tab === 'school') {
            chartData = this.lastSchoolChartData;
            title = 'Mood Distribution by School';
        } else if (tab === 'class') {
            chartData = this.lastClassChartData;
            title = 'Mood Distribution by Class';
        } else {
            chartData = this.lastHousesChartData;
            title = 'Mood Distribution by House';
        }

        titleEl.textContent = title;

        if (this.directorMoodChart) {
            try { this.directorMoodChart.destroy(); } catch (_) {}
            this.directorMoodChart = null;
        }
        container.innerHTML = '';

        if (!chartData || !chartData.labels?.length || !chartData.series?.length) {
            container.innerHTML = '<p class="chart-no-data">No data for this view.</p>';
            return;
        }

        const options = this.getApexStackedBarOptions(chartData.labels, chartData.series, chartData.colors);
        options.chart.events = {
            dataPointSelection: (event, chartContext, config) => {
                this.onMoodChartSegmentClick(config, tab, chartData);
            }
        };
        this.directorMoodChart = new ApexCharts(container, options);
        this.directorMoodChart.render();
    }

    // Called when user clicks a mood segment on the chart: show list of students who had that mood
    onMoodChartSegmentClick(config, tab, chartData) {
        const dataPointIndex = config.dataPointIndex;
        const seriesIndex = config.seriesIndex;
        if (dataPointIndex == null || dataPointIndex < 0 || seriesIndex == null || seriesIndex < 0) return;
        const groupName = chartData.labels[dataPointIndex];
        const moodName = chartData.series[seriesIndex]?.name;
        if (!groupName || !moodName) return;

        const users = this.lastDirectorUsers || [];
        const moodData = this.lastDirectorMoodData || [];
        const moodLower = moodName.toLowerCase();

        const userInGroup = (user) => {
            if (user.user_type !== 'student') return false;
            if (tab === 'house') return user.house === groupName;
            if (tab === 'grade') return getGradeFromClass(user.class) === groupName;
            if (tab === 'school') return true;
            if (tab === 'class') return user.class === groupName;
            return false;
        };

        const userIdsWithThisMood = new Set();
        moodData.forEach(m => {
            if ((m.mood || '').toLowerCase() !== moodLower) return;
            const user = users.find(u => u.id == m.user_id);
            if (user && userInGroup(user)) userIdsWithThisMood.add(Number(m.user_id));
        });

        const studentUsers = users.filter(u => userIdsWithThisMood.has(Number(u.id)));
        const groupLabel = tab === 'school' ? 'School' : tab === 'class' ? 'Class' : tab === 'grade' ? 'Grade' : 'House';
        this.showMoodStudentsModal(moodName, groupName, groupLabel, studentUsers);
    }

    // Show modal listing students who had a given mood in a group; clicking a student opens their detail modal
    showMoodStudentsModal(moodName, groupName, groupLabel, studentUsers) {
        const modal = document.getElementById('directorMoodStudentsModal');
        const titleEl = document.getElementById('directorMoodStudentsModalTitle');
        const listEl = document.getElementById('directorMoodStudentsModalList');
        if (!modal || !titleEl || !listEl) return;

        titleEl.textContent = `Students who felt ${moodName} in ${groupName}`;
        if (studentUsers.length === 0) {
            listEl.innerHTML = '<p class="mood-students-empty">No students in this selection.</p>';
        } else {
            listEl.innerHTML = studentUsers.map(user => `
                <button type="button" class="mood-student-row" data-user-id="${user.id}">
                    <span class="mood-student-name">${user.first_name} ${user.surname}</span>
                    <span class="mood-student-meta">${user.class || ''} ${user.house || ''}</span>
                </button>
            `).join('');
            listEl.querySelectorAll('.mood-student-row').forEach(btn => {
                btn.addEventListener('click', () => {
                    const userId = btn.dataset.userId;
                    modal.style.display = 'none';
                    modal.classList.remove('active');
                    if (userId) this.showStudentDetailModal(userId);
                });
            });
        }
        modal.style.display = 'flex';
        modal.style.zIndex = '3001';
        modal.classList.add('active');
    }

    // Build ApexCharts series and colors from groupData (for stacked bar)
    getApexMoodSeries(groupData, labels) {
        const allMoods = new Set();
        Object.values(groupData).forEach(groupMoods => {
            Object.keys(groupMoods).forEach(mood => {
                if (groupMoods[mood] > 0) allMoods.add(mood);
            });
        });
        let moodTypes = Array.from(allMoods).sort();
        if (moodTypes.length === 0) moodTypes = ['Happy', 'Sad', 'Angry', 'Anxious', 'Excited', 'Calm'];
        const colors = ['#4CAF50', '#F44336', '#FF9800', '#9C27B0', '#2196F3', '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'];
        const series = moodTypes.map((mood, index) => ({
            name: mood,
            data: labels.map(group => groupData[group]?.[mood] || 0)
        }));
        return { series, colors: colors.slice(0, series.length) };
    }

    // ApexCharts options for stacked bar (professional theme)
    getApexStackedBarOptions(categories, series, colors) {
        return {
            chart: {
                type: 'bar',
                height: 320,
                stacked: true,
                toolbar: { show: false },
                zoom: { enabled: false },
                fontFamily: 'inherit',
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800
                }
            },
            colors: colors,
            plotOptions: {
                bar: {
                    horizontal: false,
                    borderRadius: 4,
                    columnWidth: '65%',
                    dataLabels: { position: 'top' }
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                show: true,
                width: 1,
                colors: ['#fff']
            },
            series: series,
            xaxis: {
                categories: categories,
                labels: {
                    style: { fontSize: '12px', colors: '#64748b' },
                    rotate: -25,
                    rotateAlways: false
                },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                labels: {
                    style: { fontSize: '12px', colors: '#64748b' }
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
                crosshairs: { show: false },
                tickAmount: 6
            },
            grid: {
                borderColor: '#e2e8f0',
                strokeDashArray: 4,
                xaxis: { lines: { show: false } },
                yaxis: { lines: { show: true } }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'center',
                fontSize: '13px',
                fontWeight: 500,
                itemMargin: { horizontal: 12 },
                markers: { radius: 4 }
            },
            tooltip: {
                theme: 'light',
                y: { formatter: (v) => v + ' check-in' + (v !== 1 ? 's' : '') }
            }
        };
    }


    // ==================== DATA AGGREGATION FUNCTIONS ====================

    // Aggregate mood data by houses only
    aggregateMoodDataByHouses(users, moodData) {
        const groupData = {};
        
        console.log('Aggregating mood data for houses:', users.length, 'users and', moodData.length, 'mood entries');
        
        // First, collect all unique houses from users
        const allHouses = new Set();
        
        users.forEach(user => {
            if (user.user_type === 'student' && user.house) {
                allHouses.add(user.house);
            }
        });
        
        console.log('All houses found:', Array.from(allHouses));
        
        // Initialize all houses with empty mood counts
        allHouses.forEach(house => {
            groupData[house] = {};
        });
        
        // Now count moods for each user by house
        users.forEach(user => {
            if (user.user_type === 'student' && user.house) {
                const userMoods = moodData.filter(mood => mood.user_id == user.id);
                console.log(`User ${user.first_name} ${user.surname} (House: ${user.house}): ${userMoods.length} mood entries`);
                
                userMoods.forEach(mood => {
                    // Capitalize mood value to match chart expectations (e.g., 'happy' -> 'Happy')
                    const moodType = mood.mood ? mood.mood.charAt(0).toUpperCase() + mood.mood.slice(1) : 'Unknown';
                    
                    if (!groupData[user.house][moodType]) {
                        groupData[user.house][moodType] = 0;
                    }
                    groupData[user.house][moodType]++;
                    console.log(`Added ${moodType} mood to house ${user.house}`);
                });
            }
        });
        
        console.log('Final houses group data:', groupData);
        
        // Add sample data for missing houses
        if (Object.keys(groupData).length === 0 || Object.values(groupData).every(group => Object.keys(group).length === 0)) {
            console.log('No house data found, adding sample data for testing');
            groupData['Mirfield'] = { 'Happy': 3, 'Sad': 1, 'Excited': 2, 'Calm': 1 };
            groupData['Bishops'] = { 'Happy': 2, 'Calm': 3, 'Anxious': 1, 'Excited': 1 };
            groupData['Bavin'] = { 'Happy': 4, 'Excited': 1, 'Calm': 2, 'Sad': 1 };
            groupData['Dodson'] = { 'Happy': 1, 'Sad': 2, 'Angry': 1, 'Calm': 2 };
            groupData['Sage'] = { 'Happy': 3, 'Calm': 2, 'Excited': 1, 'Anxious': 1 };
        }
        
        // Ensure all houses are present
        const allHouseNames = ['Mirfield', 'Bishops', 'Bavin', 'Dodson', 'Sage'];
        allHouseNames.forEach(house => {
            if (!groupData[house]) {
                groupData[house] = { 'Happy': Math.floor(Math.random() * 4) + 1, 'Calm': Math.floor(Math.random() * 3) + 1, 'Excited': Math.floor(Math.random() * 2) + 1 };
            }
        });
        
        return groupData;
    }

    // Aggregate mood data by grades only
    aggregateMoodDataByGrades(users, moodData) {
        const groupData = {};
        
        console.log('Aggregating mood data for grades:', users.length, 'users and', moodData.length, 'mood entries');
        
        // Initialize all standard grades
        const standardGrades = ['Grade 5', 'Grade 6', 'Grade 7'];
        standardGrades.forEach(grade => {
            groupData[grade] = {};
        });
        
        // Now count moods for each user by their derived grade
        users.forEach(user => {
            if (user.user_type === 'student' && user.class) {
                // Get the grade from the class name (e.g., "5EF" -> "Grade 5")
                const userGrade = getGradeFromClass(user.class);
                if (!userGrade) return;
                
                const userMoods = moodData.filter(mood => mood.user_id == user.id);
                console.log(`User ${user.first_name} ${user.surname} (Class: ${user.class}, Grade: ${userGrade}): ${userMoods.length} mood entries`);
                
                userMoods.forEach(mood => {
                    // Capitalize mood value to match chart expectations (e.g., 'happy' -> 'Happy')
                    const moodType = mood.mood ? mood.mood.charAt(0).toUpperCase() + mood.mood.slice(1) : 'Unknown';
                    
                    if (!groupData[userGrade]) {
                        groupData[userGrade] = {};
                    }
                    if (!groupData[userGrade][moodType]) {
                        groupData[userGrade][moodType] = 0;
                    }
                    groupData[userGrade][moodType]++;
                    console.log(`Added ${moodType} mood to ${userGrade}`);
                });
            }
        });
        
        console.log('Final grades group data:', groupData);
        
        // Add sample data for missing grades
        if (Object.keys(groupData).length === 0 || Object.values(groupData).every(group => Object.keys(group).length === 0)) {
            console.log('No grade data found, adding sample data for testing');
            groupData['Grade 5'] = { 'Happy': 5, 'Excited': 2, 'Calm': 1, 'Sad': 1 };
            groupData['Grade 6'] = { 'Happy': 3, 'Sad': 1, 'Anxious': 2, 'Calm': 2 };
            groupData['Grade 7'] = { 'Happy': 2, 'Calm': 3, 'Excited': 1, 'Angry': 1 };
        }
        
        // Ensure all grades are present
        const allGradeNames = ['Grade 5', 'Grade 6', 'Grade 7'];
        allGradeNames.forEach(grade => {
            if (!groupData[grade]) {
                groupData[grade] = { 'Happy': Math.floor(Math.random() * 5) + 1, 'Calm': Math.floor(Math.random() * 3) + 1, 'Sad': Math.floor(Math.random() * 2) + 1 };
            }
        });
        
        return groupData;
    }

    // Aggregate mood data for whole school (single bar)
    aggregateMoodDataBySchool(users, moodData) {
        const groupData = { 'School': {} };
        users.forEach(user => {
            if (user.user_type !== 'student') return;
            const userMoods = moodData.filter(m => m.user_id == user.id);
            userMoods.forEach(mood => {
                const moodType = mood.mood ? mood.mood.charAt(0).toUpperCase() + mood.mood.slice(1) : 'Unknown';
                if (!groupData['School'][moodType]) groupData['School'][moodType] = 0;
                groupData['School'][moodType]++;
            });
        });
        if (Object.keys(groupData['School']).length === 0) {
            groupData['School'] = { 'Happy': 0, 'Calm': 0, 'Excited': 0, 'Sad': 0, 'Anxious': 0, 'Angry': 0 };
        }
        return groupData;
    }

    // Aggregate mood data by class (e.g. 5EF, 6AB)
    aggregateMoodDataByClass(users, moodData) {
        const groupData = {};
        const allClasses = new Set();
        users.forEach(user => {
            if (user.user_type === 'student' && user.class) allClasses.add(user.class);
        });
        allClasses.forEach(c => { groupData[c] = {}; });
        users.forEach(user => {
            if (user.user_type !== 'student' || !user.class) return;
            const userMoods = moodData.filter(m => m.user_id == user.id);
            userMoods.forEach(mood => {
                const moodType = mood.mood ? mood.mood.charAt(0).toUpperCase() + mood.mood.slice(1) : 'Unknown';
                if (!groupData[user.class][moodType]) groupData[user.class][moodType] = 0;
                groupData[user.class][moodType]++;
            });
        });
        // Sort class names naturally (e.g. 5EF before 6AB)
        const sorted = {};
        Object.keys(groupData).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach(k => {
            sorted[k] = groupData[k];
        });
        return sorted;
    }

    // Aggregate mood data by group (grade/house) - DEPRECATED
    aggregateMoodDataByGroup(users, moodData) {
        const groupData = {};
        
        console.log('Aggregating mood data for', users.length, 'users and', moodData.length, 'mood entries');
        
        // Initialize standard houses and grades
        const standardHouses = ['Mirfield', 'Bishops', 'Bavin', 'Dodson', 'Sage'];
        const standardGrades = ['Grade 5', 'Grade 6', 'Grade 7'];
        
        // Initialize all groups with empty mood counts
        standardHouses.forEach(house => {
            groupData[house] = {};
        });
        standardGrades.forEach(grade => {
            groupData[grade] = {};
        });
        
        // Now count moods for each user
        users.forEach(user => {
            if (user.user_type === 'student') {
                const userMoods = moodData.filter(mood => mood.user_id == user.id);
                // Get the grade from the class name (e.g., "5EF" -> "Grade 5")
                const userGrade = getGradeFromClass(user.class);
                console.log(`User ${user.first_name} ${user.surname} (House: ${user.house}, Class: ${user.class}, Grade: ${userGrade}): ${userMoods.length} mood entries`);
                
                userMoods.forEach(mood => {
                    const moodType = mood.mood;
                    
                    // Add to house group
                    if (user.house && groupData[user.house]) {
                        if (!groupData[user.house][moodType]) {
                            groupData[user.house][moodType] = 0;
                        }
                        groupData[user.house][moodType]++;
                    }
                    
                    // Add to grade group (using derived grade from class name)
                    if (userGrade && groupData[userGrade]) {
                        if (!groupData[userGrade][moodType]) {
                            groupData[userGrade][moodType] = 0;
                        }
                        groupData[userGrade][moodType]++;
                    }
                    
                    console.log(`Added ${moodType} mood to ${user.house || 'no house'} and ${userGrade || 'no grade'}`);
                });
            }
        });
        
        console.log('Final group data:', groupData);
        
        // If still no data, add comprehensive sample data
        if (Object.keys(groupData).length === 0 || Object.values(groupData).every(group => Object.keys(group).length === 0)) {
            console.log('No data found, adding comprehensive sample data for testing');
            groupData['Mirfield'] = { 'Happy': 3, 'Sad': 1, 'Excited': 2, 'Calm': 1 };
            groupData['Bishops'] = { 'Happy': 2, 'Calm': 3, 'Anxious': 1, 'Excited': 1 };
            groupData['Bavin'] = { 'Happy': 4, 'Excited': 1, 'Calm': 2, 'Sad': 1 };
            groupData['Dodson'] = { 'Happy': 1, 'Sad': 2, 'Angry': 1, 'Calm': 2 };
            groupData['Sage'] = { 'Happy': 3, 'Calm': 2, 'Excited': 1, 'Anxious': 1 };
            groupData['Grade 5'] = { 'Happy': 5, 'Excited': 2, 'Calm': 1, 'Sad': 1 };
            groupData['Grade 6'] = { 'Happy': 3, 'Sad': 1, 'Anxious': 2, 'Calm': 2 };
            groupData['Grade 7'] = { 'Happy': 2, 'Calm': 3, 'Excited': 1, 'Angry': 1 };
        }
        
        // For testing: if we have very few groups, add all houses and grades with sample data
        if (Object.keys(groupData).length < 6) {
            console.log('Adding missing houses and grades with sample data for complete chart display');
            const allHouses = ['Mirfield', 'Bishops', 'Bavin', 'Dodson', 'Sage'];
            const allGrades = ['Grade 5', 'Grade 6', 'Grade 7'];
            
            allHouses.forEach(house => {
                if (!groupData[house]) {
                    groupData[house] = { 'Happy': Math.floor(Math.random() * 4) + 1, 'Calm': Math.floor(Math.random() * 3) + 1, 'Excited': Math.floor(Math.random() * 2) + 1 };
                }
            });
            
            allGrades.forEach(grade => {
                if (!groupData[grade]) {
                    groupData[grade] = { 'Happy': Math.floor(Math.random() * 5) + 1, 'Calm': Math.floor(Math.random() * 3) + 1, 'Sad': Math.floor(Math.random() * 2) + 1 };
                }
            });
        }
        
        return groupData;
    }


    // ==================== HELPER FUNCTIONS ====================

    // Get mood datasets for stacked bar chart
    getMoodDatasets(groupData, labels) {
        // First, let's find all unique mood types in the data
        const allMoods = new Set();
        Object.values(groupData).forEach(groupMoods => {
            Object.keys(groupMoods).forEach(mood => {
                if (groupMoods[mood] > 0) {
                    allMoods.add(mood);
                }
            });
        });
        
        // If no moods found in data, use default mood types
        let moodTypes = Array.from(allMoods).sort();
        if (moodTypes.length === 0) {
            moodTypes = ['Happy', 'Sad', 'Angry', 'Anxious', 'Excited', 'Calm'];
        }
        
        console.log('Found mood types:', moodTypes);
        console.log('Chart labels:', labels);
        
        // Use a more comprehensive color palette
        const colors = ['#4CAF50', '#F44336', '#FF9800', '#9C27B0', '#2196F3', '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'];
        
        return moodTypes.map((mood, index) => {
            const data = labels.map(group => {
                const value = groupData[group]?.[mood] || 0;
                return value;
            });
            console.log(`Mood ${mood} data for labels ${labels}:`, data);
            return {
                label: mood,
                data: data,
                backgroundColor: colors[index % colors.length],
                borderColor: colors[index % colors.length],
                borderWidth: 1
            };
        });
    }

    // Get mood color
    getMoodColor(mood, alpha = 1) {
        const colors = {
            'Happy': `rgba(76, 175, 80, ${alpha})`,
            'Sad': `rgba(244, 67, 54, ${alpha})`,
            'Angry': `rgba(255, 152, 0, ${alpha})`,
            'Anxious': `rgba(156, 39, 176, ${alpha})`,
            'Excited': `rgba(33, 150, 243, ${alpha})`,
            'Calm': `rgba(0, 188, 212, ${alpha})`
        };
        return colors[mood] || `rgba(128, 128, 128, ${alpha})`;
    }


    // Export chart data (from last ApexCharts data)
    exportChartData() {
        try {
            const period = document.getElementById('chartPeriodSelect')?.value || 'daily';
            const timestamp = new Date().toISOString().split('T')[0];
            const housesData = this.lastHousesChartData;
            const gradesData = this.lastGradesChartData;
            const schoolData = this.lastSchoolChartData;
            const classData = this.lastClassChartData;

            const hasAny = [housesData, gradesData, schoolData, classData].some(
                d => d && d.series?.length && d.labels?.length
            );
            if (!hasAny) {
                this.showMessage('No chart data available to export', 'error');
                return;
            }

            let csvContent = '';
            csvContent += `Mood Analytics Export\n`;
            csvContent += `Period: ${period}\n`;
            csvContent += `Export Date: ${timestamp}\n\n`;

            const appendSection = (title, rowLabel, data) => {
                if (!data?.series?.length || !data?.labels?.length) return;
                csvContent += `${title}\n`;
                csvContent += `${rowLabel},`;
                data.series.forEach((s, i) => {
                    csvContent += s.name;
                    if (i < data.series.length - 1) csvContent += ',';
                });
                csvContent += '\n';
                data.labels.forEach((label, idx) => {
                    csvContent += `${label},`;
                    data.series.forEach((s, i) => {
                        csvContent += s.data[idx] ?? 0;
                        if (i < data.series.length - 1) csvContent += ',';
                    });
                    csvContent += '\n';
                });
                csvContent += '\n';
            };

            appendSection('HOUSES MOOD DISTRIBUTION', 'House', housesData);
            appendSection('GRADES MOOD DISTRIBUTION', 'Grade', gradesData);
            appendSection('SCHOOL MOOD DISTRIBUTION', 'School', schoolData);
            appendSection('CLASS MOOD DISTRIBUTION', 'Class', classData);

            // Create and download CSV file
            const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `mood-analytics-${period}-${timestamp}.csv`;
            link.click();
            
            URL.revokeObjectURL(url);
            this.showMessage('Chart data exported as CSV successfully!', 'success');
        } catch (error) {
            console.error('Failed to export chart data:', error);
            this.showMessage('Failed to export chart data', 'error');
        }
    }
}

// Global function to force show teacher form
window.showTeacherForm = function() {
    console.log('Forcing teacher form to show...');
    
    // Hide all forms
    document.querySelectorAll('.register-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // Show teacher form
    const teacherForm = document.getElementById('teacherRegisterForm');
    if (teacherForm) {
        teacherForm.classList.add('active');
        console.log('Teacher form activated');
        
        // Check elements after a delay
        setTimeout(() => {
            const gradeElement = document.getElementById('teacherGrade');
            const houseElement = document.getElementById('teacherHouse');
            console.log('After forcing show:', {
                gradeElement: !!gradeElement,
                houseElement: !!houseElement,
                gradeParent: gradeElement ? gradeElement.parentElement : null,
                houseParent: houseElement ? houseElement.parentElement : null
            });
        }, 100);
    }
}

// Initialize Teacher UI elements
function initializeTeacherUI() {
    // Teacher mood button click handler
    const teacherMoodButton = document.getElementById('teacherMoodButton');
    if (teacherMoodButton) {
        teacherMoodButton.addEventListener('click', () => {
            if (window.moodApp) {
                window.moodApp.showMoodModal();
            }
        });
    }

    // Teacher journal button click handler
    const teacherJournalButton = document.getElementById('teacherJournalButton');
    if (teacherJournalButton) {
        teacherJournalButton.addEventListener('click', () => {
            if (window.moodApp) {
                window.moodApp.showJournalEntryModal();
            }
        });
    }

    // Last mood click handler
    const lastMoodItem = document.getElementById('lastMoodItem');
    if (lastMoodItem) {
        lastMoodItem.addEventListener('click', () => {
            showMoodDetailsModal();
        });
    }

    // Journal count click handler
    const journalCountItem = document.getElementById('journalCountItem');
    if (journalCountItem) {
        journalCountItem.addEventListener('click', () => {
            showJournalHistoryModal();
        });
    }

    // Check-in history click handler
    const checkInHistoryItem = document.getElementById('checkInHistoryItem');
    if (checkInHistoryItem) {
        checkInHistoryItem.addEventListener('click', () => {
            showCheckInHistoryModal();
        });
    }
    
    // Analytics cards click handlers
    const studentAnalyticsCard = document.getElementById('studentAnalyticsCard');
    const gradeAnalyticsCard = document.getElementById('gradeAnalyticsCard');
    const houseAnalyticsCard = document.getElementById('houseAnalyticsCard');
    
    if (studentAnalyticsCard) {
        studentAnalyticsCard.addEventListener('click', () => {
            showAnalyticsModal('student');
        });
    }
    
    if (gradeAnalyticsCard) {
        gradeAnalyticsCard.addEventListener('click', () => {
            showAnalyticsModal('grade');
        });
    }
    
    if (houseAnalyticsCard) {
        houseAnalyticsCard.addEventListener('click', () => {
            showAnalyticsModal('house');
        });
    }

    // Modal close handlers
    const closeMoodDetailsModal = document.getElementById('closeMoodDetailsModal');
    if (closeMoodDetailsModal) {
        closeMoodDetailsModal.addEventListener('click', () => {
            hideMoodDetailsModal();
        });
    }

    const closeJournalHistoryModal = document.getElementById('closeJournalHistoryModal');
    if (closeJournalHistoryModal) {
        closeJournalHistoryModal.addEventListener('click', () => {
            hideJournalHistoryModal();
        });
    }

    const closeCheckInHistoryModal = document.getElementById('closeCheckInHistoryModal');
    if (closeCheckInHistoryModal) {
        closeCheckInHistoryModal.addEventListener('click', () => {
            hideCheckInHistoryModal();
        });
    }
    
    // Analytics modals close handlers
    const closeStudentAnalyticsModal = document.getElementById('closeStudentAnalyticsModal');
    const closeGradeAnalyticsModal = document.getElementById('closeGradeAnalyticsModal');
    const closeHouseAnalyticsModal = document.getElementById('closeHouseAnalyticsModal');
    
    if (closeStudentAnalyticsModal) {
        closeStudentAnalyticsModal.addEventListener('click', () => {
            hideAnalyticsModal('student');
        });
    }
    
    if (closeGradeAnalyticsModal) {
        closeGradeAnalyticsModal.addEventListener('click', () => {
            hideAnalyticsModal('grade');
        });
    }
    
    if (closeHouseAnalyticsModal) {
        closeHouseAnalyticsModal.addEventListener('click', () => {
            hideAnalyticsModal('house');
        });
    }

    // Filter dropdown handlers
    initializeFilterDropdowns();
    
    // Initialize teacher filters display with a small delay to ensure data is available
    setTimeout(() => {
        updateTeacherFilters();
    }, 100);
}

// Initialize student info buttons
function initializeFilterDropdowns() {
    const houseButton = document.getElementById('houseButton');
    const gradeButton = document.getElementById('gradeButton');
    const studentListContainer = document.getElementById('studentListContainer');
    const closeStudentList = document.getElementById('closeStudentList');

    if (houseButton) {
        houseButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStudentList('house');
        });
    }

    if (gradeButton) {
        gradeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStudentList('grade');
        });
    }

    if (closeStudentList) {
        closeStudentList.addEventListener('click', (e) => {
            e.stopPropagation();
            hideStudentList();
        });
    }

    // Close student list when clicking outside
    document.addEventListener('click', (e) => {
        if (studentListContainer && !studentListContainer.contains(e.target) && 
            (!houseButton || !houseButton.contains(e.target)) && 
            (!gradeButton || !gradeButton.contains(e.target))) {
            hideStudentList();
        }
    });
}

// Toggle student list (show if hidden, hide if shown)
function toggleStudentList(type, grade = null) {
    const studentListContainer = document.getElementById('studentListContainer');
    
    if (studentListContainer.style.display === 'block') {
        // If already showing, hide it
        hideStudentList();
    } else {
        // If hidden, show it
        showStudentList(type, grade);
    }
}

// Show student list based on house or grade
async function showStudentList(type, grade = null) {
    const studentListContainer = document.getElementById('studentListContainer');
    const studentListTitle = document.getElementById('studentListTitle');
    const studentListContent = document.getElementById('studentListContent');
    const houseButton = document.getElementById('houseButton');
    const gradeButtons = document.querySelectorAll('.grade-button');

    if (!studentListContainer || !studentListTitle || !studentListContent) return;

    // Update button states
    if (type === 'house') {
        if (houseButton) houseButton.classList.add('active');
        gradeButtons.forEach(btn => btn.classList.remove('active'));
    } else if (type === 'grade' && grade) {
        gradeButtons.forEach(btn => {
            if (btn.dataset.grade === grade) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        if (houseButton) houseButton.classList.remove('active');
    }

    // Show loading state
    studentListContent.innerHTML = '<div class="no-students">Loading students...</div>';
    studentListContainer.style.display = 'block';

    try {
        // Get teacher's assigned house and grade
        const teacher = window.moodApp ? window.moodApp.currentUser : null;
        if (!teacher) {
            studentListContent.innerHTML = '<div class="no-students">No teacher data available</div>';
            return;
        }

        // Set title
        if (type === 'house') {
            studentListTitle.textContent = `Students in ${teacher.house || 'Your House'}`;
        } else if (type === 'grade' && grade) {
            studentListTitle.textContent = `Students in ${grade}`;
        } else {
            studentListTitle.textContent = `Students in ${teacher.class || 'Your Grade'}`;
        }

        // Get students based on type
        const students = await getStudentsForTeacher(teacher, type, grade);
        
        if (students.length === 0) {
            studentListContent.innerHTML = '<div class="no-students">No students found</div>';
            return;
        }

        // Display students
        displayStudents(studentListContent, students);

    } catch (error) {
        console.error('Error loading students:', error);
        studentListContent.innerHTML = '<div class="no-students">Error loading students</div>';
    }
}

// Hide student list
function hideStudentList() {
    const studentListContainer = document.getElementById('studentListContainer');
    const houseButton = document.getElementById('houseButton');
    const gradeButtons = document.querySelectorAll('.grade-button');

    if (studentListContainer) {
        studentListContainer.style.display = 'none';
    }
    if (houseButton) {
        houseButton.classList.remove('active');
    }
    gradeButtons.forEach(btn => btn.classList.remove('active'));
}

// Show mood details modal
function showMoodDetailsModal() {
    const modal = document.getElementById('moodDetailsModal');
    const content = document.getElementById('moodDetailsContent');
    
    if (!modal || !content) return;
    
    // Get the last mood check-in data from the actual mood history
    let lastMoodData = null;
    if (window.moodApp && window.moodApp.moodHistory && window.moodApp.moodHistory.length > 0) {
        // Find the most recent mood record
        lastMoodData = window.moodApp.moodHistory.find(record => record.mood);
    }
    
    // If no real data, show mock data for demo
    if (!lastMoodData) {
        lastMoodData = {
            mood: 'Happy',
            emoji: '😊',
            timestamp: new Date().toLocaleString(),
            emotions: ['Excited', 'Grateful', 'Confident'],
            location: 'Classroom',
            reasons: ['Great lesson with students', 'Positive feedback from parents', 'Team collaboration went well']
        };
    }
    
    // Ensure we have the required fields with fallbacks
    const emotions = lastMoodData.emotions || ['Content', 'Peaceful'];
    const location = lastMoodData.location || 'School';
    const reasons = lastMoodData.reasons || ['Feeling good today'];
    
    content.innerHTML = `
        <div class="mood-details">
            <div class="mood-detail-header">
                <div class="mood-emoji-large">${lastMoodData.emoji}</div>
                <div class="mood-info">
                    <h4>${lastMoodData.mood}</h4>
                    <p class="mood-timestamp">${lastMoodData.timestamp}</p>
                </div>
            </div>
            <div class="mood-detail-content">
                <div class="mood-detail-section">
                    <h5 class="section-title">Emotions</h5>
                    <div class="emotion-tags">
                        ${emotions.map(emotion => `<span class="emotion-tag">${emotion}</span>`).join('')}
                    </div>
                </div>
                <div class="mood-detail-section">
                    <h5 class="section-title">Location</h5>
                    <div class="location-info">
                        <span class="location-icon">📍</span>
                        <span class="location-text">${location}</span>
                    </div>
                </div>
                <div class="mood-detail-section">
                    <h5 class="section-title">Reasons</h5>
                    <ul class="reasons-list">
                        ${reasons.map(reason => `<li class="reason-item">${reason}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Hide mood details modal
function hideMoodDetailsModal() {
    const modal = document.getElementById('moodDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show journal history modal
function showJournalHistoryModal() {
    const modal = document.getElementById('journalHistoryModal');
    const content = document.getElementById('journalHistoryContent');
    
    if (!modal || !content) return;
    
    // Get journal history data from multiple sources
    let journalEntries = [];
    
    // Get standalone journal entries
    if (window.moodApp && window.moodApp.journalEntries && window.moodApp.journalEntries.length > 0) {
        journalEntries = [...window.moodApp.journalEntries];
    }
    
    // Get journal entries from mood check-ins (notes field)
    if (window.moodApp && window.moodApp.moodHistory && window.moodApp.moodHistory.length > 0) {
        const moodJournalEntries = window.moodApp.moodHistory
            .filter(record => record.notes && record.notes.trim() !== '')
            .map(record => ({
                id: `mood-${record.id || Date.now()}`,
                title: `Mood Check-in - ${record.mood ? record.mood.charAt(0).toUpperCase() + record.mood.slice(1) : 'Unknown'}`,
                content: record.notes,
                timestamp: new Date(record.timestamp).toLocaleString(),
                mood: record.mood ? record.mood.charAt(0).toUpperCase() + record.mood.slice(1) : 'Unknown',
                type: 'mood-checkin'
            }));
        
        journalEntries = [...journalEntries, ...moodJournalEntries];
    }
    
    // Sort by timestamp (newest first)
    journalEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // If no entries, show mock data for demo
    if (journalEntries.length === 0) {
        journalEntries = [
            {
                id: 1,
                title: 'Great day at work',
                content: 'Had a productive day teaching Grade 5. The students were really engaged in today\'s lesson.',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString(),
                mood: 'Happy'
            },
            {
                id: 2,
                title: 'Challenging morning',
                content: 'Some students were having difficulty with the math concepts. Need to review the lesson plan.',
                timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleString(),
                mood: 'Concerned'
            },
            {
                id: 3,
                title: 'Team meeting',
                content: 'Great collaboration with other teachers on the new curriculum. Excited about the changes.',
                timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleString(),
                mood: 'Excited'
            }
        ];
    }
    
    if (journalEntries.length === 0) {
        content.innerHTML = '<div class="no-entries">No journal entries found.</div>';
    } else {
        content.innerHTML = `
            <div class="journal-entries">
                ${journalEntries.map(entry => `
                    <div class="journal-entry">
                        <div class="journal-entry-header">
                            <h4>${entry.title}</h4>
                            <span class="journal-mood">${entry.mood}</span>
                        </div>
                        <div class="journal-entry-content">
                            <p>${entry.content}</p>
                        </div>
                        <div class="journal-entry-footer">
                            <span class="journal-timestamp">${entry.timestamp}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    modal.style.display = 'block';
}

// Hide journal history modal
function hideJournalHistoryModal() {
    const modal = document.getElementById('journalHistoryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show check-in history modal
function showCheckInHistoryModal() {
    const modal = document.getElementById('checkInHistoryModal');
    const content = document.getElementById('checkInHistoryContent');
    
    if (!modal || !content) return;
    
    // Get check-in history data from actual moodHistory array
    let checkIns = [];
    if (window.moodApp && window.moodApp.moodHistory && window.moodApp.moodHistory.length > 0) {
        checkIns = window.moodApp.moodHistory;
    } else {
        // Mock data for demo
        checkIns = [
            {
                id: 1,
                mood: 'happy',
                emoji: '😊',
                emotions: ['joy', 'gratitude'],
                location: 'school',
                reasons: 'Had a great day teaching my students!',
                journal: 'The students were so engaged today. It made me feel really proud.',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 2,
                mood: 'calm',
                emoji: '😌',
                emotions: ['peace', 'contentment'],
                location: 'home',
                reasons: 'Finished all my lesson planning for the week.',
                journal: 'Feeling organized and ready for the upcoming week.',
                timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 3,
                mood: 'excited',
                emoji: '🤩',
                emotions: ['enthusiasm', 'anticipation'],
                location: 'school',
                reasons: 'New teaching materials arrived!',
                journal: 'Can\'t wait to try out these new resources with my class.',
                timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
    }
    
    // Update the count display
    const countElement = document.getElementById('teacherCheckInCount');
    if (countElement) {
        countElement.textContent = checkIns.length;
    }
    
    // Generate HTML for check-in history
    let html = '<div class="check-in-history">';
    
    if (checkIns.length === 0) {
        html += '<div class="no-checkins">No check-ins yet. Start by checking in with your mood!</div>';
    } else {
        checkIns.forEach((checkIn, index) => {
            const date = new Date(checkIn.timestamp);
            const formattedDate = date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            const formattedTime = date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            html += `
                <div class="check-in-item">
                    <div class="check-in-header">
                        <div class="check-in-mood">
                            <span class="mood-emoji">${checkIn.emoji}</span>
                            <span class="mood-text">${checkIn.mood.charAt(0).toUpperCase() + checkIn.mood.slice(1)}</span>
                        </div>
                        <div class="check-in-date">
                            <div class="date">${formattedDate}</div>
                            <div class="time">${formattedTime}</div>
                        </div>
                    </div>
                    <div class="check-in-details">
                        <div class="detail-section">
                            <strong>Emotions:</strong> ${checkIn.emotions.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ')}
                        </div>
                        <div class="detail-section">
                            <strong>Location:</strong> ${checkIn.location.charAt(0).toUpperCase() + checkIn.location.slice(1)}
                        </div>
                        ${checkIn.reasons ? `<div class="detail-section"><strong>Reasons:</strong> ${checkIn.reasons}</div>` : ''}
                        ${checkIn.journal ? `<div class="detail-section"><strong>Journal:</strong> ${checkIn.journal}</div>` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    content.innerHTML = html;
    
    // Show modal
    modal.style.display = 'flex';
}

// Hide check-in history modal
function hideCheckInHistoryModal() {
    const modal = document.getElementById('checkInHistoryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Analytics Modal Functions
function showAnalyticsModal(type) {
    const modalId = `${type}AnalyticsModal`;
    const contentId = `${type}AnalyticsHistoryContent`;
    const modal = document.getElementById(modalId);
    const content = document.getElementById(contentId);
    
    if (!modal || !content) {
        console.error(`Modal or content not found for type: ${type}`);
        return;
    }
    
    // Get mood check-in history based on type
    const moodHistory = getAnalyticsMoodHistory(type);
    
    if (moodHistory.length === 0) {
        content.innerHTML = `
            <div class="no-checkins">
                <p>No mood check-ins found for this ${type}.</p>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="check-in-history">
                ${moodHistory.map(checkIn => `
                    <div class="check-in-item">
                        <div class="check-in-header">
                            <div class="check-in-mood">
                                <span class="mood-emoji">${checkIn.emoji}</span>
                                <span class="mood-text">${checkIn.mood}</span>
                            </div>
                            <div class="check-in-date">
                                <div class="date">${checkIn.date}</div>
                                <div class="time">${checkIn.time}</div>
                            </div>
                        </div>
                        <div class="check-in-details">
                            ${checkIn.emotions ? `
                                <div class="detail-section">
                                    <strong>Emotions:</strong>
                                    <span>${checkIn.emotions.join(', ')}</span>
                                </div>
                            ` : ''}
                            ${checkIn.location ? `
                                <div class="detail-section">
                                    <strong>Location:</strong>
                                    <span>${checkIn.location}</span>
                                </div>
                            ` : ''}
                            ${checkIn.reasons && checkIn.reasons.length > 0 ? `
                                <div class="detail-section">
                                    <strong>Reasons:</strong>
                                    <span>${checkIn.reasons.join(', ')}</span>
                                </div>
                            ` : ''}
                            ${checkIn.notes ? `
                                <div class="detail-section">
                                    <strong>Notes:</strong>
                                    <span>${checkIn.notes}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    modal.style.display = 'block';
}

function hideAnalyticsModal(type) {
    const modalId = `${type}AnalyticsModal`;
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function getAnalyticsMoodHistory(type) {
    // Get current user data
    const currentUser = window.moodApp?.currentUser;
    if (!currentUser) {
        console.error('No current user found');
        return [];
    }
    
    // Mock mood history data for different analytics types
    const mockMoodHistory = {
        student: [
            {
                mood: 'Happy',
                emoji: '😊',
                emotions: ['Excited', 'Confident'],
                location: 'School',
                reasons: ['Friends', 'School Work'],
                notes: 'Great day at school!',
                date: '2024-01-15',
                time: '09:30 AM'
            },
            {
                mood: 'Calm',
                emoji: '😌',
                emotions: ['Peaceful', 'Content'],
                location: 'Home',
                reasons: ['Family', 'Sleep'],
                notes: 'Relaxing evening at home',
                date: '2024-01-14',
                time: '07:45 PM'
            },
            {
                mood: 'Excited',
                emoji: '🤩',
                emotions: ['Energetic', 'Optimistic'],
                location: 'School',
                reasons: ['Sports', 'Friends'],
                notes: 'Won the basketball game!',
                date: '2024-01-13',
                time: '03:20 PM'
            }
        ],
        grade: [
            {
                mood: 'Happy',
                emoji: '😊',
                emotions: ['Excited', 'Confident'],
                location: 'School',
                reasons: ['Friends', 'School Work'],
                notes: 'Grade 5 student - Great day!',
                date: '2024-01-15',
                time: '09:30 AM'
            },
            {
                mood: 'Tired',
                emoji: '😴',
                emotions: ['Exhausted', 'Sleepy'],
                location: 'School',
                reasons: ['Tests', 'School Work'],
                notes: 'Grade 6 student - Long day of tests',
                date: '2024-01-15',
                time: '02:15 PM'
            },
            {
                mood: 'Anxious',
                emoji: '😰',
                emotions: ['Worried', 'Nervous'],
                location: 'School',
                reasons: ['Tests', 'Teacher'],
                notes: 'Grade 7 student - Math test tomorrow',
                date: '2024-01-14',
                time: '11:45 AM'
            }
        ],
        house: [
            {
                mood: 'Happy',
                emoji: '😊',
                emotions: ['Excited', 'Proud'],
                location: 'School',
                reasons: ['Sports', 'Friends'],
                notes: 'Mirfield house - Won the house competition!',
                date: '2024-01-15',
                time: '04:00 PM'
            },
            {
                mood: 'Calm',
                emoji: '😌',
                emotions: ['Peaceful', 'Focused'],
                location: 'School',
                reasons: ['School Work', 'Teacher'],
                notes: 'Sage house - Productive study session',
                date: '2024-01-15',
                time: '10:30 AM'
            },
            {
                mood: 'Excited',
                emoji: '🤩',
                emotions: ['Energetic', 'Enthusiastic'],
                location: 'School',
                reasons: ['Sports', 'Classmates'],
                notes: 'Bavin house - Great teamwork in PE',
                date: '2024-01-14',
                time: '01:20 PM'
            }
        ]
    };
    
    return mockMoodHistory[type] || [];
}

// Get students for teacher based on house or grade
async function getStudentsForTeacher(teacher, type, specificGrade = null) {
    // This would normally make an API call, but for demo purposes we'll return mock data
    const mockStudents = [
        // Mirfield House Students (all grades 3-7)
        { id: 1, first_name: 'Alice', surname: 'Johnson', house: 'Mirfield', class: 'Grade 3', last_mood: 'Happy', mood_emoji: '😊' },
        { id: 2, first_name: 'Bob', surname: 'Smith', house: 'Mirfield', class: 'Grade 4', last_mood: 'Excited', mood_emoji: '🤩' },
        { id: 3, first_name: 'Charlie', surname: 'Brown', house: 'Mirfield', class: 'Grade 5', last_mood: 'Calm', mood_emoji: '😌' },
        { id: 4, first_name: 'David', surname: 'Lee', house: 'Mirfield', class: 'Grade 5', last_mood: 'Tired', mood_emoji: '😴' },
        { id: 5, first_name: 'Emma', surname: 'Wilson', house: 'Mirfield', class: 'Grade 6', last_mood: 'Happy', mood_emoji: '😊' },
        { id: 6, first_name: 'Frank', surname: 'Miller', house: 'Mirfield', class: 'Grade 6', last_mood: 'Anxious', mood_emoji: '😰' },
        { id: 7, first_name: 'Grace', surname: 'Moore', house: 'Mirfield', class: 'Grade 7', last_mood: 'Sad', mood_emoji: '😢' },
        { id: 8, first_name: 'Henry', surname: 'Taylor', house: 'Mirfield', class: 'Grade 7', last_mood: 'Angry', mood_emoji: '😠' },
        
        // Grade 5 Students from ALL Houses (for grade filtering demo)
        { id: 9, first_name: 'Ivy', surname: 'Anderson', house: 'Bavin', class: 'Grade 5', last_mood: 'Confused', mood_emoji: '😕' },
        { id: 10, first_name: 'Jack', surname: 'Thomas', house: 'Sage', class: 'Grade 5', last_mood: 'Happy', mood_emoji: '😊' },
        { id: 11, first_name: 'Kate', surname: 'Jackson', house: 'Dodson', class: 'Grade 5', last_mood: 'Excited', mood_emoji: '🤩' },
        { id: 12, first_name: 'Liam', surname: 'Davis', house: 'Bishops', class: 'Grade 5', last_mood: 'Tired', mood_emoji: '😴' },
        
        // Grade 6 Students from ALL Houses
        { id: 13, first_name: 'Mia', surname: 'Garcia', house: 'Bavin', class: 'Grade 6', last_mood: 'Calm', mood_emoji: '😌' },
        { id: 14, first_name: 'Noah', surname: 'Martinez', house: 'Sage', class: 'Grade 6', last_mood: 'Happy', mood_emoji: '😊' },
        { id: 15, first_name: 'Olivia', surname: 'Rodriguez', house: 'Dodson', class: 'Grade 6', last_mood: 'Anxious', mood_emoji: '😰' },
        { id: 16, first_name: 'Peter', surname: 'White', house: 'Bishops', class: 'Grade 6', last_mood: 'Sad', mood_emoji: '😢' },
        
        // Grade 7 Students from ALL Houses
        { id: 17, first_name: 'Quinn', surname: 'Harris', house: 'Bavin', class: 'Grade 7', last_mood: 'Angry', mood_emoji: '😠' },
        { id: 18, first_name: 'Ruby', surname: 'Clark', house: 'Sage', class: 'Grade 7', last_mood: 'Confused', mood_emoji: '😕' },
        { id: 19, first_name: 'Sam', surname: 'Lewis', house: 'Dodson', class: 'Grade 7', last_mood: 'Happy', mood_emoji: '😊' },
        { id: 20, first_name: 'Tina', surname: 'Walker', house: 'Bishops', class: 'Grade 7', last_mood: 'Excited', mood_emoji: '🤩' }
    ];

    // Filter students based on teacher's assignment and type
    let filteredStudents = mockStudents;
    
    if (type === 'house' && teacher.house) {
        // Show ALL students in the teacher's house (all grades 3-7)
        filteredStudents = mockStudents.filter(student => 
            student.house === teacher.house && 
            ['Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'].includes(student.class)
        );
    } else if (type === 'grade') {
        if (specificGrade) {
            // Show ALL students in the specific grade (all houses)
            filteredStudents = mockStudents.filter(student => student.class === specificGrade);
        } else {
            // Fallback: get teacher's assigned grades
            const assignments = await fetchTeacherAssignments(teacher.id);
            if (assignments.length > 0) {
                const teacherGrades = [...new Set(assignments.map(a => a.grade))];
                filteredStudents = mockStudents.filter(student => teacherGrades.includes(student.class));
            } else {
                // Fallback to single grade from teacher data
                if (teacher.class) {
                    filteredStudents = mockStudents.filter(student => student.class === teacher.class);
                }
            }
        }
    }

    return filteredStudents;
}

// Display students in the list
function displayStudents(container, students) {
    container.innerHTML = students.map(student => `
        <div class="student-item">
            <div class="student-avatar">
                ${student.first_name.charAt(0)}${student.surname.charAt(0)}
            </div>
            <div class="student-details">
                <div class="student-name">${student.first_name} ${student.surname}</div>
                <div class="student-info">
                    ${student.house} • ${student.class}
                </div>
            </div>
            <div class="student-mood">
                <span class="mood-emoji-small">${student.mood_emoji}</span>
                <span>${student.last_mood}</span>
            </div>
        </div>
    `).join('');
}

// Fetch teacher assignments from backend
async function fetchTeacherAssignments(teacherId) {
    try {
        const response = await fetch(`/api/teacher/assignments/${teacherId}`);
        const data = await response.json();
        
        if (data.success) {
            return data.assignments;
        } else {
            console.error('Failed to fetch teacher assignments:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Error fetching teacher assignments:', error);
        return [];
    }
}

// Update teacher filters display
async function updateTeacherFilters() {
    console.log('updateTeacherFilters called');
    
    const teacherHouseDisplay = document.getElementById('teacherHouseDisplay');
    const gradeButtonsContainer = document.getElementById('gradeButtonsContainer');
    
    console.log('Elements found:', { 
        teacherHouseDisplay: !!teacherHouseDisplay, 
        gradeButtonsContainer: !!gradeButtonsContainer 
    });
    
    if (!teacherHouseDisplay || !gradeButtonsContainer) {
        console.log('Teacher filter elements not found');
        return;
    }
    
    // Set default values based on teacher's assigned grade and house
    if (window.moodApp && window.moodApp.currentUser) {
        console.log('Current user found:', window.moodApp.currentUser);
        const houseName = window.moodApp.currentUser.house || 'Unknown';
        
        // For demo purposes, let's use mock data instead of API call
        // Demo teacher is from Mirfield (blue), but let's show how other houses would look
        const mockAssignments = [
            { grade: 'Grade 5', house: houseName },
            { grade: 'Grade 6', house: houseName },
            { grade: 'Grade 7', house: houseName }
        ];
        
        // Get unique grades from assignments
        const grades = [...new Set(mockAssignments.map(a => a.grade))];
        
        teacherHouseDisplay.textContent = `House: ${houseName}`;
        
        // Update house button color
        const houseButton = document.getElementById('houseButton');
        if (houseButton) {
            houseButton.className = `student-info-button house-${houseName.toLowerCase()}`;
        }
        
        // Create grade buttons dynamically
        gradeButtonsContainer.innerHTML = '';
        grades.forEach(grade => {
            const gradeButton = document.createElement('button');
            gradeButton.className = `student-info-button grade-button house-${houseName.toLowerCase()}`;
            gradeButton.innerHTML = `
                <span>Grade: ${grade}</span>
                <span class="button-arrow">▼</span>
            `;
            gradeButton.dataset.grade = grade;
            gradeButton.addEventListener('click', () => toggleStudentList('grade', grade));
            gradeButtonsContainer.appendChild(gradeButton);
        });
        
        console.log('Updated teacher filters with mock data:', { houseName, grades });
    } else {
        console.log('No teacher data available, showing default buttons');
        // Set default values if no teacher data
        teacherHouseDisplay.textContent = 'House: Mirfield';
        
        // Update house button color
        const houseButton = document.getElementById('houseButton');
        if (houseButton) {
            houseButton.className = 'student-info-button house-mirfield';
        }
        
        // Create default grade buttons for demo
        const defaultGrades = ['Grade 5', 'Grade 6', 'Grade 7'];
        gradeButtonsContainer.innerHTML = '';
        defaultGrades.forEach(grade => {
            const gradeButton = document.createElement('button');
            gradeButton.className = 'student-info-button grade-button house-mirfield';
            gradeButton.innerHTML = `
                <span>Grade: ${grade}</span>
                <span class="button-arrow">▼</span>
            `;
            gradeButton.dataset.grade = grade;
            gradeButton.addEventListener('click', () => toggleStudentList('grade', grade));
            gradeButtonsContainer.appendChild(gradeButton);
        });
    }
}

// Update teacher analytics with filters
async function updateTeacherAnalyticsWithFilters(houseFilter, gradeFilter) {
    try {
        // Update student analytics
        const studentAnalyticsContent = document.getElementById('studentAnalyticsContent');
        if (studentAnalyticsContent) {
            studentAnalyticsContent.innerHTML = `
                <div style="text-align: center; color: #666;">
                    <p>Filtered by: ${houseFilter} | ${gradeFilter}</p>
                    <p>Loading analytics...</p>
                </div>
            `;
        }

        // Update grade analytics
        const gradeAnalyticsContent = document.getElementById('gradeAnalyticsContent');
        if (gradeAnalyticsContent) {
            gradeAnalyticsContent.innerHTML = `
                <div style="text-align: center; color: #666;">
                    <p>Grade: ${gradeFilter}</p>
                    <p>Loading analytics...</p>
                </div>
            `;
        }

        // Update house analytics
        const houseAnalyticsContent = document.getElementById('houseAnalyticsContent');
        if (houseAnalyticsContent) {
            houseAnalyticsContent.innerHTML = `
                <div style="text-align: center; color: #666;">
                    <p>House: ${houseFilter}</p>
                    <p>Loading analytics...</p>
                </div>
            `;
        }

        // Simulate loading analytics (replace with actual API calls)
        setTimeout(() => {
            updateAnalyticsDisplays(houseFilter, gradeFilter);
        }, 1000);

    } catch (error) {
        console.error('Error updating teacher analytics with filters:', error);
    }
}

    // Teacher Class Management
    async updateTeacherClassDisplay() {
        if (!this.currentUser || this.currentUser.user_type !== 'teacher') return;
        
        const teacherClassDisplay = document.getElementById('teacherClassDisplay');
        const teacherClassHint = document.getElementById('teacherClassHint');
        
        if (teacherClassDisplay) {
            const className = this.currentUser.class || 'Not Set';
            teacherClassDisplay.textContent = `Class: ${className}`;
        }
        
        if (teacherClassHint) {
            if (this.currentUser.class) {
                teacherClassHint.textContent = `Viewing check-ins for ${this.currentUser.class}`;
            } else {
                teacherClassHint.textContent = 'Select your class to view student check-ins';
            }
        }
    }

    async openTeacherClassModal() {
        if (!this.currentUser || this.currentUser.user_type !== 'teacher') return;
        
        const modal = document.getElementById('teacherClassModal');
        const classSelect = document.getElementById('teacherClassSelect');
        
        if (!modal || !classSelect) return;
        
        // Load available classes
        try {
            const response = await APIUtils.getClassNames();
            if (response.success && response.classNames) {
                classSelect.innerHTML = '<option value="">-- Select a class --</option>';
                response.classNames.forEach(className => {
                    const option = document.createElement('option');
                    option.value = className;
                    option.textContent = className;
                    if (this.currentUser.class === className) {
                        option.selected = true;
                    }
                    classSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load class names:', error);
            this.showMessage('Failed to load classes', 'error');
        }
        
        modal.style.display = 'flex';
        modal.classList.add('active');
    }

    closeTeacherClassModal() {
        const modal = document.getElementById('teacherClassModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    }

    async saveTeacherClass() {
        if (!this.currentUser || this.currentUser.user_type !== 'teacher') return;
        
        const classSelect = document.getElementById('teacherClassSelect');
        if (!classSelect) return;
        
        const className = classSelect.value;
        
        try {
            const response = await APIUtils.updateTeacherClass(this.currentUser.id, className);
            if (response.success) {
                // Update current user
                this.currentUser.class = className;
                // Update display
                this.updateTeacherClassDisplay();
                // Reload check-ins
                this.loadTeacherClassCheckins('daily');
                // Close modal
                this.closeTeacherClassModal();
                this.showMessage('Class updated successfully', 'success');
            } else {
                this.showMessage(response.error || 'Failed to update class', 'error');
            }
        } catch (error) {
            console.error('Failed to update teacher class:', error);
            this.showMessage('Failed to update class', 'error');
        }
    }

    async loadTeacherClassCheckins(period = 'daily') {
        if (!this.currentUser || this.currentUser.user_type !== 'teacher') return;
        
        if (!this.currentUser.class) {
            // Hide check-ins section if no class is set
            const section = document.getElementById('teacherClassCheckinsSection');
            if (section) {
                section.style.display = 'none';
            }
            return;
        }
        
        const section = document.getElementById('teacherClassCheckinsSection');
        const checkinsList = document.getElementById('classCheckinsList');
        const classNameDisplay = document.getElementById('classCheckinsClassName');
        
        if (!section || !checkinsList) return;
        
        // Show section
        section.style.display = 'block';
        
        // Update period buttons in the class check-ins section
        if (section) {
            section.querySelectorAll('.period-btn').forEach(btn => {
                if (btn.dataset.period === period) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        
        // Update class name display
        if (classNameDisplay) {
            classNameDisplay.textContent = this.currentUser.class;
        }
        
        // Show loading
        checkinsList.innerHTML = '<p class="loading-text">Loading check-ins...</p>';
        
        try {
            const response = await APIUtils.getTeacherClassCheckins(this.currentUser.id, period);
            if (response.success) {
                const checkins = response.checkins || [];
                
                if (checkins.length === 0) {
                    checkinsList.innerHTML = '<p class="loading-text">No check-ins found for this period.</p>';
                    return;
                }
                
                // Group check-ins by student
                const checkinsByStudent = {};
                checkins.forEach(checkin => {
                    const studentId = checkin.user_id;
                    if (!checkinsByStudent[studentId]) {
                        checkinsByStudent[studentId] = {
                            student: {
                                first_name: checkin.first_name,
                                surname: checkin.surname,
                                class: checkin.class,
                                house: checkin.house
                            },
                            checkins: []
                        };
                    }
                    checkinsByStudent[studentId].checkins.push(checkin);
                });
                
                // Render check-ins
                checkinsList.innerHTML = Object.values(checkinsByStudent).map(({ student, checkins }) => {
                    const latestCheckin = checkins[0]; // Already sorted by timestamp DESC
                    const moodEmojis = {
                        'Happy': '😊', 'Excited': '🤩', 'Calm': '😌', 'Tired': '😴',
                        'Anxious': '😰', 'Sad': '😢', 'Angry': '😠', 'Confused': '😕'
                    };
                    const moodEmoji = moodEmojis[latestCheckin.mood] || '😊';
                    const timestamp = new Date(latestCheckin.timestamp);
                    const timeStr = timestamp.toLocaleString();
                    
                    return `
                        <div class="class-checkin-item">
                            <div class="checkin-student-info">
                                <span class="checkin-mood-emoji">${moodEmoji}</span>
                                <div class="checkin-student-details">
                                    <span class="checkin-student-name">${student.first_name} ${student.surname}</span>
                                    <span class="checkin-student-meta">${student.class || ''} ${student.house || ''}</span>
                                </div>
                            </div>
                            <div class="checkin-details">
                                <span class="checkin-mood">${latestCheckin.mood}</span>
                                <span class="checkin-time">${timeStr}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                checkinsList.innerHTML = '<p class="loading-text">Failed to load check-ins.</p>';
            }
        } catch (error) {
            console.error('Failed to load teacher class check-ins:', error);
            checkinsList.innerHTML = '<p class="loading-text">Failed to load check-ins.</p>';
        }
    }
}

// Update analytics displays with mock data
function updateAnalyticsDisplays(houseFilter, gradeFilter) {
    const moods = ['Happy', 'Excited', 'Calm', 'Tired', 'Anxious', 'Sad', 'Angry', 'Confused'];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];
    const moodEmojis = {
        'Happy': '😊', 'Excited': '🤩', 'Calm': '😌', 'Tired': '😴',
        'Anxious': '😰', 'Sad': '😢', 'Angry': '😠', 'Confused': '😕'
    };

    // Update student analytics
    const studentHighestMood = document.getElementById('studentHighestMood');
    const studentAnalyticsContent = document.getElementById('studentAnalyticsContent');
    if (studentHighestMood) {
        studentHighestMood.textContent = randomMood;
    }
    if (studentAnalyticsContent) {
        studentAnalyticsContent.innerHTML = `
            <div style="text-align: center; color: #666;">
                <p>Total students: ${Math.floor(Math.random() * 50) + 20}</p>
                <p>Check-ins today: ${Math.floor(Math.random() * 30) + 10}</p>
            </div>
        `;
    }

    // Update grade analytics
    const gradeHighestMood = document.getElementById('gradeHighestMood');
    const gradeAnalyticsContent = document.getElementById('gradeAnalyticsContent');
    if (gradeHighestMood) {
        gradeHighestMood.textContent = randomMood;
    }
    if (gradeAnalyticsContent) {
        gradeAnalyticsContent.innerHTML = `
            <div style="text-align: center; color: #666;">
                <p>Grade: ${gradeFilter}</p>
                <p>Average mood: ${randomMood}</p>
            </div>
        `;
    }

    // Update house analytics
    const houseHighestMood = document.getElementById('houseHighestMood');
    const houseAnalyticsContent = document.getElementById('houseAnalyticsContent');
    if (houseHighestMood) {
        houseHighestMood.textContent = randomMood;
    }
    if (houseAnalyticsContent) {
        houseAnalyticsContent.innerHTML = `
            <div style="text-align: center; color: #666;">
                <p>House: ${houseFilter}</p>
                <p>Average mood: ${randomMood}</p>
            </div>
        `;
    }

    // Update mood emojis
    const moodEmojiElements = document.querySelectorAll('.mood-emoji-large');
    moodEmojiElements.forEach(element => {
        element.textContent = moodEmojis[randomMood] || '😊';
    });
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, initializing app with database...');
        window.moodApp = new MoodCheckInApp();
        console.log('App instance created and available as window.moodApp');
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Error initializing app: ' + error.message);
    }
});

// Service Worker Registration for PWA - DISABLED FOR DEVELOPMENT
// Unregister any existing service workers to prevent caching issues
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            console.log('Unregistering service worker:', registration);
            registration.unregister();
        }
    });
}

// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//         navigator.serviceWorker.register('/sw.js')
//             .then((registration) => {
//                 console.log('SW registered: ', registration);
//             })
//             .catch((registrationError) => {
//                 console.log('SW registration failed: ', registrationError);
//             });
//     });
// }
