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
        let firstNameElement, surnameElement, gradeCheckboxes, houseElement, emailElement, passwordElement, confirmPasswordElement;
        
        for (let i = 0; i < 3; i++) {
            firstNameElement = document.getElementById('teacherFirstName');
            surnameElement = document.getElementById('teacherSurname');
            gradeCheckboxes = document.querySelectorAll('input[name="teacherGrade"]:checked');
            houseElement = document.getElementById('teacherHouse');
            emailElement = document.getElementById('teacherEmail');
            passwordElement = document.getElementById('teacherPassword');
            confirmPasswordElement = document.getElementById('teacherConfirmPassword');
            
            if (firstNameElement && surnameElement && gradeCheckboxes.length > 0 && houseElement && 
                emailElement && passwordElement && confirmPasswordElement) {
                break;
            }
            
            if (i < 2) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        if (!firstNameElement || !surnameElement || gradeCheckboxes.length === 0 || !houseElement || 
            !emailElement || !passwordElement || !confirmPasswordElement) {
            console.error('Teacher registration form elements not found in DOM');
            
            this.showMessage('Registration form not ready. Please refresh the page and try again.', 'error');
            return;
        }
        
        const firstName = SecurityUtils.sanitizeInput(firstNameElement.value);
        const surname = SecurityUtils.sanitizeInput(surnameElement.value);
        const grades = Array.from(gradeCheckboxes).map(checkbox => checkbox.value);
        const house = houseElement.value;
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
                house
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
        
        // Update teacher filters with a delay to ensure DOM is ready
        setTimeout(() => {
            updateTeacherFilters();
        }, 200);
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
        document.getElementById('directorName').textContent = this.currentUser.first_name;
        document.getElementById('userName').textContent = this.currentUser.first_name;
        
        // Update date and time
        this.updateDirectorDateTime();
        
        // Load and display modal card data
        this.updateDirectorModalCards();
        
        // Setup modal card click handlers
        this.setupDirectorModalHandlers();
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
                    this.updateStudentJournalList();
                } else if (this.currentUser.user_type === 'teacher') {
                    this.updateTeacherJournalList();
                    this.updateTeacherStatusDisplay(); // Update the journal counter
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
            
            // Save to database
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
                    this.updateStudentJournalList();
                } else if (this.currentUser.user_type === 'teacher') {
                    this.updateTeacherJournalList();
                    this.updateTeacherStatusDisplay(); // Update the journal counter
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
        const students = users.filter(user => user.user_type === 'student' && user.class === gradeValue);
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
        
        // Setup modal close handlers
        const groupModal = document.getElementById('directorGroupDetailModal');
        const studentModal = document.getElementById('directorStudentDetailModal');
        const closeGroupBtn = document.getElementById('closeDirectorGroupDetailModal');
        const closeStudentBtn = document.getElementById('closeDirectorStudentDetailModal');
        
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
                    groupUsers = users.filter(user => user.user_type === 'student' && user.class === gradeValue);
                } else if (groupType === 'house') {
                    groupUsers = users.filter(user => 
                        user.user_type === 'student' && user.house && user.house.toLowerCase() === groupId
                    );
                } else if (groupType === 'teachers') {
                    groupUsers = users.filter(user => user.user_type === 'teacher');
                }
                
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
        
        contentElement.innerHTML = `
            <div class="director-group-detail-content">
                <div class="director-group-summary">
                    <div class="group-emoji">${groupType === 'teachers' ? '👨‍🏫' : '🎓'}</div>
                    <div class="director-group-info">
                        <h4>${contentElement.closest('.modal').querySelector('h3').textContent}</h4>
                        <div class="director-group-stats">
                            <div class="director-stat-item">
                                <div class="director-stat-label">Total Members</div>
                                <div class="director-stat-value">${users.length}</div>
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
                
                <div class="director-students-list" id="groupStudentsList">
                    ${this.generateStudentsListHTML(users, moodData)}
                </div>
            </div>
        `;
        
        // Setup student click handlers
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
                            ${user.class || user.house || 'Teacher'} • ${user.email}
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
            
            // Load user and mood data
            console.log('Loading user and mood data...');
            const usersResponse = await APIUtils.getAllUsers();
            const moodResponse = await APIUtils.getAllMoodData('daily');
            const journalResponse = await APIUtils.getAllJournalEntries('daily');
            
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
                
                const userMoods = moodData.filter(mood => mood.user_id == userId); // Use == for type coercion
                const userJournals = journalData.filter(journal => journal.user_id == userId); // Use == for type coercion
                
                console.log('User moods:', userMoods.length, 'User journals:', userJournals.length);
                
                this.displayStudentDetailContent(contentElement, user, userMoods, userJournals);
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
                            ${user.class || user.house || 'Teacher'} • ${user.email}
                            <br>
                            Latest Mood: ${moodEmoji} ${latestMood ? latestMood.mood : 'No recent mood'}
                        </div>
                    </div>
                </div>
                
                <div class="director-student-checkins">
                    <h5>Recent Check-ins (${moodData.length})</h5>
                    ${this.generateCheckinsHTML(moodData)}
                </div>
                
                <div class="director-student-journal">
                    <h5>Journal Entries (${journalData.length})</h5>
                    ${this.generateJournalHTML(journalData)}
                </div>
            </div>
        `;
        
        console.log('Setting content HTML, length:', contentHTML.length);
        contentElement.innerHTML = contentHTML;
        console.log('Content set successfully');
    }

    // Generate check-ins HTML
    generateCheckinsHTML(moodData) {
        if (moodData.length === 0) {
            return '<div class="no-checkins">No recent check-ins</div>';
        }
        
        return moodData.slice(-5).reverse().map(mood => {
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
            
            return `
                <div class="director-journal-item">
                    <div class="director-journal-header">
                        <div class="director-journal-mood">
                            <span>📝 Journal Entry</span>
                        </div>
                        <div class="director-journal-date">${date}</div>
                    </div>
                    <div class="director-journal-content">
                        ${journal.content}
                    </div>
                </div>
            `;
        }).join('');
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
            !houseButton.contains(e.target) && !gradeButton.contains(e.target)) {
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
