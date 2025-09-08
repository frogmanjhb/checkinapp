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
        this.isGhostMode = false;
        this.selectedEmotions = [];
        this.selectedReasons = [];
        
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
        let firstNameElement, surnameElement, gradeElement, houseElement, emailElement, passwordElement, confirmPasswordElement;
        
        for (let i = 0; i < 3; i++) {
            firstNameElement = document.getElementById('teacherFirstName');
            surnameElement = document.getElementById('teacherSurname');
            gradeElement = document.getElementById('teacherGrade');
            houseElement = document.getElementById('teacherHouse');
            emailElement = document.getElementById('teacherEmail');
            passwordElement = document.getElementById('teacherPassword');
            confirmPasswordElement = document.getElementById('teacherConfirmPassword');
            
            if (firstNameElement && surnameElement && gradeElement && houseElement && 
                emailElement && passwordElement && confirmPasswordElement) {
                break;
            }
            
            if (i < 2) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        if (!firstNameElement || !surnameElement || !gradeElement || !houseElement || 
            !emailElement || !passwordElement || !confirmPasswordElement) {
            console.error('Teacher registration form elements not found in DOM');
            
            this.showMessage('Registration form not ready. Please refresh the page and try again.', 'error');
            return;
        }
        
        const firstName = SecurityUtils.sanitizeInput(firstNameElement.value);
        const surname = SecurityUtils.sanitizeInput(surnameElement.value);
        const grade = gradeElement.value;
        const house = houseElement.value;
        const email = SecurityUtils.sanitizeInput(emailElement.value);
        const password = passwordElement.value;
        const confirmPassword = confirmPasswordElement.value;

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
        const firstNameElement = document.getElementById('directorFirstName');
        const surnameElement = document.getElementById('directorSurname');
        const emailElement = document.getElementById('directorEmail');
        const passwordElement = document.getElementById('directorPassword');
        const confirmPasswordElement = document.getElementById('directorConfirmPassword');
        
        if (!firstNameElement || !surnameElement || !emailElement || 
            !passwordElement || !confirmPasswordElement) {
            console.error('Director registration form elements not found in DOM');
            this.showMessage('Registration form not ready. Please refresh the page and try again.', 'error');
            return;
        }
        
        const firstName = SecurityUtils.sanitizeInput(firstNameElement.value);
        const surname = SecurityUtils.sanitizeInput(surnameElement.value);
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
        const loginScreen = document.getElementById('loginScreen');
        const registerScreen = document.getElementById('registerScreen');
        const studentScreen = document.getElementById('studentDashboardScreen');
        const teacherScreen = document.getElementById('teacherDashboardScreen');
        const directorScreen = document.getElementById('directorDashboardScreen');
        const navUser = document.getElementById('navUser');
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
        const teacherAssignedGradeElement = document.getElementById('teacherAssignedGrade');
        const teacherAssignedHouseElement = document.getElementById('teacherAssignedHouse');
        
        if (teacherNameElement) {
            teacherNameElement.textContent = `${this.currentUser.first_name} ${this.currentUser.surname}`;
        }
        if (userNameElement) {
            userNameElement.textContent = `${this.currentUser.first_name} ${this.currentUser.surname}`;
        }
        if (teacherAssignedGradeElement) {
            teacherAssignedGradeElement.textContent = this.currentUser.class || 'Not assigned';
        }
        if (teacherAssignedHouseElement) {
            teacherAssignedHouseElement.textContent = this.currentUser.house || 'Not assigned';
        }
        
        this.updateTeacherView();
        this.updateTeacherAnalytics();
        this.updateTeacherJournalList();
        this.updateGradeAnalytics();
    }

    showDirectorDashboard() {
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
                this.hideJournalingEncouragementModal();
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
        
        // Show/hide reason sections and other location input
        const schoolReasons = document.getElementById('schoolReasons');
        const homeReasons = document.getElementById('homeReasons');
        const otherLocationInput = document.getElementById('otherLocationInput');
        
        if (schoolReasons) {
            schoolReasons.style.display = location === 'school' ? 'block' : 'none';
        }
        if (homeReasons) {
            homeReasons.style.display = location === 'home' ? 'block' : 'none';
        }
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
            
            
            const response = await APIUtils.saveMoodCheckin(moodData);

            if (response.success) {
                const moodRecord = {
                    ...response.checkin,
                    timestamp: new Date(response.checkin.timestamp)
                };

                this.moodHistory.unshift(moodRecord);
                this.allMoodHistory.unshift(moodRecord);
                
                this.hideLocationModal(); // Hide location modal
                this.updateStatusDisplay();
                this.updateHistoryDisplay();
                
                if (this.currentUser.user_type === 'student') {
                    this.updateStudentAnalytics();
                } else {
                    this.updateTeacherAnalytics();
                }
                
                this.showMessage(`Mood recorded: ${this.selectedMood.emoji} ${this.selectedMood.mood}!`, 'success');
                
                // Show journaling encouragement modal after successful check-in
                setTimeout(() => {
                    this.showJournalingEncouragementModal();
                }, 1000);
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
        
        const recentHistory = this.moodHistory.slice(0, 5); // Show only 5 for orbital layout
        
        if (recentHistory.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No mood check-ins yet.</p>';
            return;
        }
        
        recentHistory.forEach(record => {
            const historyItem = document.createElement('div');
            historyItem.className = 'orbital-mood-item';
            
            const time = record.timestamp.toLocaleString();
            const mood = record.mood.charAt(0).toUpperCase() + record.mood.slice(1);
            
            // Create orbital elements
            const orbitalElements = this.createOrbitalElements(record);
            
            historyItem.innerHTML = `
                <div class="orbital-mood-center">
                    <div class="orbital-mood-emoji">${record.emoji}</div>
                    <div class="orbital-mood-text">${mood}</div>
                    <div class="orbital-mood-time">${time}</div>
                </div>
                ${orbitalElements}
            `;
            
            historyList.appendChild(historyItem);
        });
    }

    createOrbitalElements(record) {
        const elements = [];
        const positions = [
            'orbital-top-left', 'orbital-top-right', 'orbital-middle-left', 
            'orbital-middle-right', 'orbital-bottom-left', 'orbital-bottom-right',
            'orbital-top-center', 'orbital-bottom-center'
        ];
        let positionIndex = 0;

        // Add location element
        if (record.location) {
            const locationDisplay = this.getLocationDisplay(record.location);
            elements.push(`
                <div class="orbital-element orbital-location ${positions[positionIndex % positions.length]}">
                    ${locationDisplay}
                </div>
            `);
            positionIndex++;
        }

        // Add emotion elements
        if (record.emotions && record.emotions.length > 0) {
            record.emotions.forEach(emotion => {
                const emotionDisplay = this.getEmotionDisplay(emotion);
                elements.push(`
                    <div class="orbital-element orbital-emotion ${positions[positionIndex % positions.length]}">
                        ${emotionDisplay}
                    </div>
                `);
                positionIndex++;
            });
        }

        // Add reason elements
        if (record.reasons && record.reasons.length > 0) {
            record.reasons.forEach(reason => {
                const reasonDisplay = this.getReasonDisplay(reason);
                elements.push(`
                    <div class="orbital-element orbital-reason ${positions[positionIndex % positions.length]}">
                        ${reasonDisplay}
                    </div>
                `);
                positionIndex++;
            });
        }

        // Add notes element
        if (record.notes) {
            elements.push(`
                <div class="orbital-element orbital-notes ${positions[positionIndex % positions.length]}">
                    📝 ${record.notes}
                </div>
            `);
        }

        return elements.join('');
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
            // Fetch fresh data from database for all users
            const response = await APIUtils.getAllMoodCheckins(period);
            if (response.success) {
                const moodCounts = this.getMoodCounts(response.checkins);
                analyticsContent.innerHTML = this.generateAnalyticsHTML(moodCounts, period);
            } else {
                // Fallback to local data if database fails
                const filteredHistory = this.getFilteredHistory(period, true);
                const moodCounts = this.getMoodCounts(filteredHistory);
                analyticsContent.innerHTML = this.generateAnalyticsHTML(moodCounts, period);
            }
        } catch (error) {
            console.error('Teacher analytics error:', error);
            // Fallback to local data
            const filteredHistory = this.getFilteredHistory(period, true);
            const moodCounts = this.getMoodCounts(filteredHistory);
            analyticsContent.innerHTML = this.generateAnalyticsHTML(moodCounts, period);
        }
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
};

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
