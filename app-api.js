// API utility for backend communication
class APIUtils {
    static async makeRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`/api${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
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

    // Teacher grade analytics (no names)
    static async getGradeAnalytics(grade, period = 'daily') {
        return this.makeRequest(`/teacher/grade-analytics?grade=${grade}&period=${period}`);
    }

    // Get students for specific teacher
    static async getTeacherStudents(teacherId) {
        return this.makeRequest(`/teacher/students/${teacherId}`);
    }
}

// Security utility for password validation
class SecurityUtils {
    static validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

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
        if (!hasSpecialChar) {
            errors.push('Password must contain at least one special character');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            strength: this.calculateStrength(password, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar)
        };
    }

    static calculateStrength(password, hasUpper, hasLower, hasNumber, hasSpecial) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (hasUpper) score++;
        if (hasLower) score++;
        if (hasNumber) score++;
        if (hasSpecial) score++;
        
        if (score <= 2) return 'Weak';
        if (score <= 4) return 'Medium';
        if (score <= 5) return 'Strong';
        return 'Very Strong';
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
        this.selectedMood = null;
        this.allUsers = [];
        this.allMoodHistory = [];
        this.moodEmojis = ['😊', '🤩', '😌', '😴', '😰', '😢', '😠', '😕'];
        this.currentEmojiIndex = 0;
        
        this.initializeApp();
        this.setupEventListeners();
        this.startMoodEmojiAnimation();
    }

    async initializeApp() {
        console.log('Initializing app with database...');
        
        // Check if user is already logged in
        const savedUser = localStorage.getItem('checkinUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            await this.loadUserData();
            this.showDashboard();
        } else {
            this.showLoginScreen();
        }
        
        // Update time display
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
        console.log('App initialized successfully');
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

        // Modal controls
        const closeMoodModal = document.getElementById('closeMoodModal');
        if (closeMoodModal) {
            closeMoodModal.addEventListener('click', () => {
                this.hideMoodModal();
            });
        }

        // Mood selection
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectMood(e.target.closest('.mood-btn').dataset.mood, e.target.closest('.mood-btn').dataset.emoji);
            });
        });

        // Confirm mood check-in
        const confirmMoodCheckin = document.getElementById('confirmMoodCheckin');
        if (confirmMoodCheckin) {
            confirmMoodCheckin.addEventListener('click', () => {
                this.handleMoodCheckIn();
            });
        }

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

        // Close journal entry modal when clicking outside
        const journalEntryModal = document.getElementById('journalEntryModal');
        if (journalEntryModal) {
            journalEntryModal.addEventListener('click', (e) => {
                if (e.target.id === 'journalEntryModal') {
                    this.hideJournalEntryModal();
                }
            });
        }

        // Analytics tabs
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAnalyticsTab(e.target.dataset.period);
            });
        });

        // Teacher filters (removed - teachers can only see their assigned grade and house)
    }

    async handleLogin() {
        const email = SecurityUtils.sanitizeInput(document.getElementById('email').value);
        const password = document.getElementById('password').value;

        try {
            const response = await APIUtils.login(email, password);
            
            if (response.success) {
                this.currentUser = response.user;
                localStorage.setItem('checkinUser', JSON.stringify(this.currentUser));
                await this.loadUserData();
                this.showDashboard();
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
        const firstName = SecurityUtils.sanitizeInput(document.getElementById('studentFirstName').value);
        const surname = SecurityUtils.sanitizeInput(document.getElementById('studentSurname').value);
        const studentClass = document.getElementById('studentClass').value;
        const house = document.getElementById('studentHouse').value;
        const email = SecurityUtils.sanitizeInput(document.getElementById('studentEmail').value);
        const password = document.getElementById('studentPassword').value;
        const confirmPassword = document.getElementById('studentConfirmPassword').value;

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
        const firstName = SecurityUtils.sanitizeInput(document.getElementById('teacherFirstName').value);
        const surname = SecurityUtils.sanitizeInput(document.getElementById('teacherSurname').value);
        const grade = document.getElementById('teacherGrade').value;
        const house = document.getElementById('teacherHouse').value;
        const email = SecurityUtils.sanitizeInput(document.getElementById('teacherEmail').value);
        const password = document.getElementById('teacherPassword').value;
        const confirmPassword = document.getElementById('teacherConfirmPassword').value;

        // Validation
        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid @stpeters.co.za email address.', 'error');
            return;
        }

        if (!grade || !house) {
            this.showMessage('Please select both grade and house assignments.', 'error');
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
                grade,
                house
            });

            if (response.success) {
                this.showMessage(`Teacher account created successfully! You are assigned to ${grade} - ${house}. Password strength: ${passwordValidation.strength}. Please login.`, 'success');
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
        const firstName = SecurityUtils.sanitizeInput(document.getElementById('directorFirstName').value);
        const surname = SecurityUtils.sanitizeInput(document.getElementById('directorSurname').value);
        const email = SecurityUtils.sanitizeInput(document.getElementById('directorEmail').value);
        const password = document.getElementById('directorPassword').value;
        const confirmPassword = document.getElementById('directorConfirmPassword').value;

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
                userType: 'director'
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
        this.showLoginScreen();
        this.showMessage('Logged out successfully!', 'success');
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('registerScreen').classList.remove('active');
        document.getElementById('studentDashboardScreen').classList.remove('active');
        document.getElementById('teacherDashboardScreen').classList.remove('active');
        document.getElementById('directorDashboardScreen').classList.remove('active');
        document.getElementById('navUser').style.display = 'none';
        
        // Clear form
        document.getElementById('loginForm').reset();
    }

    showRegisterScreen() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('registerScreen').classList.add('active');
        document.getElementById('studentDashboardScreen').classList.remove('active');
        document.getElementById('teacherDashboardScreen').classList.remove('active');
        document.getElementById('directorDashboardScreen').classList.remove('active');
        document.getElementById('navUser').style.display = 'none';
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
            document.getElementById('studentRegisterForm').classList.add('active');
        } else if (type === 'teacher') {
            document.getElementById('teacherRegisterForm').classList.add('active');
        } else if (type === 'director') {
            document.getElementById('directorRegisterForm').classList.add('active');
        }
    }

    showDashboard() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('registerScreen').classList.remove('active');
        document.getElementById('navUser').style.display = 'flex';
        
        if (this.currentUser.user_type === 'student') {
            this.showStudentDashboard();
        } else if (this.currentUser.user_type === 'teacher') {
            this.showTeacherDashboard();
        } else if (this.currentUser.user_type === 'director') {
            this.showDirectorDashboard();
        }
    }

    showStudentDashboard() {
        document.getElementById('studentDashboardScreen').classList.add('active');
        document.getElementById('teacherDashboardScreen').classList.remove('active');
        document.getElementById('directorDashboardScreen').classList.remove('active');
        
        // Update user info
        document.getElementById('studentName').textContent = `${this.currentUser.first_name} ${this.currentUser.surname}`;
        document.getElementById('userName').textContent = `${this.currentUser.first_name} ${this.currentUser.surname}`;
        
        this.updateStatusDisplay();
        this.updateHistoryDisplay();
        this.updateStudentAnalytics();
        this.updateStudentJournalList();
    }

    showTeacherDashboard() {
        document.getElementById('studentDashboardScreen').classList.remove('active');
        document.getElementById('teacherDashboardScreen').classList.add('active');
        document.getElementById('directorDashboardScreen').classList.remove('active');
        
        // Update user info
        document.getElementById('teacherName').textContent = `${this.currentUser.first_name} ${this.currentUser.surname}`;
        document.getElementById('userName').textContent = `${this.currentUser.first_name} ${this.currentUser.surname}`;
        
        // Update teacher assignment info
        document.getElementById('teacherAssignedGrade').textContent = this.currentUser.class || 'Not assigned';
        document.getElementById('teacherAssignedHouse').textContent = this.currentUser.house || 'Not assigned';
        
        this.updateTeacherView();
        this.updateTeacherAnalytics();
        this.updateTeacherJournalList();
        this.updateGradeAnalytics();
    }

    showDirectorDashboard() {
        document.getElementById('studentDashboardScreen').classList.remove('active');
        document.getElementById('teacherDashboardScreen').classList.remove('active');
        document.getElementById('directorDashboardScreen').classList.add('active');
        
        // Update user info
        document.getElementById('directorName').textContent = `${this.currentUser.first_name} ${this.currentUser.surname}`;
        document.getElementById('userName').textContent = `${this.currentUser.first_name} ${this.currentUser.surname}`;
        
        this.updateDirectorView();
        this.updateDirectorAnalytics();
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
        document.getElementById('moodModal').classList.add('active');
        this.selectedMood = null;
        this.updateMoodButtons();
        document.getElementById('confirmMoodCheckin').disabled = true;
        document.getElementById('moodNotes').value = '';
    }

    hideMoodModal() {
        document.getElementById('moodModal').classList.remove('active');
    }

    selectMood(mood, emoji) {
        this.selectedMood = { mood, emoji };
        this.updateMoodButtons();
        document.getElementById('confirmMoodCheckin').disabled = false;
    }

    updateMoodButtons() {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.mood === this.selectedMood?.mood) {
                btn.classList.add('selected');
            }
        });
    }

    async handleMoodCheckIn() {
        if (!this.selectedMood || !this.currentUser) return;

        const notes = document.getElementById('moodNotes').value;
        
        try {
            const response = await APIUtils.saveMoodCheckin({
                userId: this.currentUser.id,
                mood: this.selectedMood.mood,
                emoji: this.selectedMood.emoji,
                notes: notes
            });

            if (response.success) {
                const moodRecord = {
                    ...response.checkin,
                    timestamp: new Date(response.checkin.timestamp)
                };

                this.moodHistory.unshift(moodRecord);
                this.allMoodHistory.unshift(moodRecord);
                
                this.hideMoodModal();
                this.updateStatusDisplay();
                this.updateHistoryDisplay();
                
                if (this.currentUser.user_type === 'student') {
                    this.updateStudentAnalytics();
                } else {
                    this.updateTeacherAnalytics();
                }
                
                this.showMessage(`Mood recorded: ${this.selectedMood.emoji} ${this.selectedMood.mood}!`, 'success');
            } else {
                this.showMessage('Failed to save mood check-in. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Mood check-in error:', error);
            this.showMessage('Failed to save mood check-in. Please try again.', 'error');
        }
    }

    updateStatusDisplay() {
        const lastMoodElement = document.getElementById('lastMood');
        const todayCountElement = document.getElementById('todayCount');
        
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
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        const recentHistory = this.moodHistory.slice(0, 10);
        
        if (recentHistory.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No mood check-ins yet.</p>';
            return;
        }
        
        recentHistory.forEach(record => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const time = record.timestamp.toLocaleString();
            const mood = record.mood.charAt(0).toUpperCase() + record.mood.slice(1);
            
            historyItem.innerHTML = `
                <div>
                    <div class="history-time">${record.emoji} Mood: ${mood}</div>
                    <div class="history-location">${record.notes || 'No additional notes'}</div>
                </div>
                <div class="history-time">${time}</div>
            `;
            
            historyList.appendChild(historyItem);
        });
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

    updateStudentAnalytics() {
        const analyticsContent = document.getElementById('studentAnalytics');
        if (!analyticsContent) return;

        const activeTab = document.querySelector('.analytics-tab.active');
        const period = activeTab ? activeTab.dataset.period : 'daily';

        const filteredHistory = this.getFilteredHistory(period);
        const moodCounts = this.getMoodCounts(filteredHistory);

        analyticsContent.innerHTML = this.generateAnalyticsHTML(moodCounts, period);
    }

    updateTeacherAnalytics() {
        const analyticsContent = document.getElementById('teacherAnalytics');
        if (!analyticsContent) return;

        const activeTab = document.querySelector('.analytics-tab.active');
        const period = activeTab ? activeTab.dataset.period : 'daily';

        const filteredHistory = this.getFilteredHistory(period, true);
        const moodCounts = this.getMoodCounts(filteredHistory);

        analyticsContent.innerHTML = this.generateAnalyticsHTML(moodCounts, period);
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

    switchAnalyticsTab(period) {
        // Update tab states
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-period="${period}"]`).classList.add('active');

        // Update analytics
        if (this.currentUser.user_type === 'student') {
            this.updateStudentAnalytics();
        } else {
            this.updateTeacherAnalytics();
        }
    }

    async updateTeacherView() {
        const studentsList = document.getElementById('studentsList');
        if (!studentsList) return;

        try {
            // Get students from teacher's assigned grade and house only
            const response = await APIUtils.getTeacherStudents(this.currentUser.id);
            if (!response.success) {
                studentsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Failed to load students.</p>';
                return;
            }

            const students = response.students;
            const assignment = response.teacherAssignment;

            studentsList.innerHTML = '';

            if (students.length === 0) {
                studentsList.innerHTML = `
                    <div class="no-students-message">
                        <p style="text-align: center; color: #666; padding: 2rem;">
                            No students found in your assigned grade (${assignment.grade}) and house (${assignment.house}).
                        </p>
                    </div>
                `;
                return;
            }

            // Load mood history for all students
            await this.loadAllMoodHistory();

            students.forEach(student => {
                const studentItem = document.createElement('div');
                studentItem.className = 'student-item';

                const lastMood = this.getLastMoodForStudent(student.id);
                const moodEmoji = lastMood ? lastMood.emoji : '😐';

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
            const response = await APIUtils.saveJournalEntry({
                userId: this.currentUser.id,
                entry: entryText
            });

            if (response.success) {
                this.hideJournalEntryModal();
                this.showMessage('Journal entry saved successfully!', 'success');
                
                // Update journal display
                if (this.currentUser.user_type === 'student') {
                    this.updateStudentJournalList();
                } else if (this.currentUser.user_type === 'teacher') {
                    this.updateTeacherJournalList();
                }
            } else {
                this.showMessage('Failed to save journal entry. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Journal entry error:', error);
            this.showMessage('Failed to save journal entry. Please try again.', 'error');
        }
    }

    async updateStudentJournalList() {
        const journalList = document.getElementById('journalList');
        if (!journalList) return;

        try {
            const response = await APIUtils.getJournalEntries(this.currentUser.id, 'daily');
            if (response.success) {
                this.displayJournalEntries(journalList, response.entries);
            }
        } catch (error) {
            console.error('Failed to load journal entries:', error);
        }
    }

    async updateTeacherJournalList() {
        const journalList = document.getElementById('teacherJournalList');
        if (!journalList) return;

        try {
            const response = await APIUtils.getJournalEntries(this.currentUser.id, 'daily');
            if (response.success) {
                this.displayJournalEntries(journalList, response.entries);
            }
        } catch (error) {
            console.error('Failed to load journal entries:', error);
        }
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
        const teacherGrade = this.currentUser.class;
        
        if (!teacherGrade) {
            gradeAnalytics.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No grade assignment found.</p>';
            return;
        }

        try {
            const response = await APIUtils.getGradeAnalytics(teacherGrade, 'daily');
            if (response.success) {
                this.displayGradeAnalytics(gradeAnalytics, response.analytics, teacherGrade);
            } else {
                gradeAnalytics.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Failed to load grade analytics.</p>';
            }
        } catch (error) {
            console.error('Failed to load grade analytics:', error);
            gradeAnalytics.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Failed to load grade analytics.</p>';
        }
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

    updateDirectorAnalytics() {
        const analyticsContent = document.getElementById('directorAnalytics');
        if (!analyticsContent) return;

        const activeTab = document.querySelector('.analytics-tab.active');
        const period = activeTab ? activeTab.dataset.period : 'daily';

        // This would be implemented to show system-wide analytics
        analyticsContent.innerHTML = `
            <div class="analytics-summary">
                <h4>System Overview - ${period.charAt(0).toUpperCase() + period.slice(1)}</h4>
                <p style="text-align: center; color: #666; padding: 2rem;">
                    Director analytics will show system-wide mood trends, user activity, and comprehensive data insights.
                </p>
            </div>
        `;
    }
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

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
