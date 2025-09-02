// Security utility for password hashing
class SecurityUtils {
    static async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    static async verifyPassword(password, hashedPassword) {
        const hashedInput = await this.hashPassword(password);
        return hashedInput === hashedPassword;
    }

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

// REACT - Mood Check-In App
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
        this.loadUserData();
        this.loadAllUsers();
        this.startMoodEmojiAnimation();
    }

    initializeApp() {
        console.log('Initializing app...');
        
        // Check if user is already logged in
        const savedUser = localStorage.getItem('checkinUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
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
                console.log('Student registration form submitted');
                this.handleStudentRegistration();
            });
        } else {
            console.error('Student registration form not found');
        }

        const teacherRegisterForm = document.getElementById('teacherRegisterForm');
        if (teacherRegisterForm) {
            teacherRegisterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Teacher registration form submitted');
                this.handleTeacherRegistration();
            });
        } else {
            console.error('Teacher registration form not found');
        }

        // Auth screen switching
        const showRegister = document.getElementById('showRegister');
        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Show register clicked');
                this.showRegisterScreen();
            });
        } else {
            console.error('Show register link not found');
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
        if (userTypeBtns.length > 0) {
            userTypeBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    console.log('User type button clicked:', e.target.dataset.type);
                    this.switchUserType(e.target.dataset.type);
                });
            });
        } else {
            console.error('User type buttons not found');
        }

        // Password strength checking
        const studentPassword = document.getElementById('studentPassword');
        const teacherPassword = document.getElementById('teacherPassword');
        
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

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Mood check-in button
        document.getElementById('moodCheckInBtn').addEventListener('click', () => {
            this.showMoodModal();
        });

        // Modal controls
        document.getElementById('closeMoodModal').addEventListener('click', () => {
            this.hideMoodModal();
        });

        // Mood selection
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectMood(e.target.closest('.mood-btn').dataset.mood, e.target.closest('.mood-btn').dataset.emoji);
            });
        });

        // Confirm mood check-in
        document.getElementById('confirmMoodCheckin').addEventListener('click', () => {
            this.handleMoodCheckIn();
        });

        // Close modal when clicking outside
        document.getElementById('moodModal').addEventListener('click', (e) => {
            if (e.target.id === 'moodModal') {
                this.hideMoodModal();
            }
        });

        // Analytics tabs
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAnalyticsTab(e.target.dataset.period);
            });
        });

        // Teacher filters
        const classFilter = document.getElementById('classFilter');
        const houseFilter = document.getElementById('houseFilter');
        const moodFilter = document.getElementById('moodFilter');
        
        if (classFilter) classFilter.addEventListener('change', () => this.updateTeacherView());
        if (houseFilter) houseFilter.addEventListener('change', () => this.updateTeacherView());
        if (moodFilter) moodFilter.addEventListener('change', () => this.updateTeacherView());
    }

    async handleLogin() {
        const email = SecurityUtils.sanitizeInput(document.getElementById('email').value);
        const password = document.getElementById('password').value;

        // Demo authentication (replace with real authentication)
        if (email === 'demo@stpeters.co.za' && password === 'password') {
            this.currentUser = {
                id: 'demo123',
                name: 'Demo Student',
                email: 'demo@stpeters.co.za',
                type: 'student',
                class: 'Grade 6',
                house: 'Mirfield'
            };
            
            localStorage.setItem('checkinUser', JSON.stringify(this.currentUser));
            this.showDashboard();
            this.showMessage('Login successful! Welcome back!', 'success');
            return;
        }

        // Check registered users with secure password verification
        const user = this.allUsers.find(u => u.email === email);
        if (user) {
            const isValidPassword = await SecurityUtils.verifyPassword(password, user.password);
            if (isValidPassword) {
                // Don't store password in current user object
                this.currentUser = {
                    id: user.id,
                    firstName: user.firstName,
                    surname: user.surname,
                    name: user.name,
                    email: user.email,
                    type: user.type,
                    class: user.class,
                    house: user.house,
                    createdAt: user.createdAt
                };
                
                localStorage.setItem('checkinUser', JSON.stringify(this.currentUser));
                this.showDashboard();
                this.showMessage('Login successful! Welcome back!', 'success');
            } else {
                this.showMessage('Invalid credentials. Please try again.', 'error');
            }
        } else {
            this.showMessage('Invalid credentials. Please try again.', 'error');
        }
    }

    async handleStudentRegistration() {
        console.log('handleStudentRegistration called');
        
        const firstName = SecurityUtils.sanitizeInput(document.getElementById('studentFirstName').value);
        const surname = SecurityUtils.sanitizeInput(document.getElementById('studentSurname').value);
        const studentClass = document.getElementById('studentClass').value;
        const house = document.getElementById('studentHouse').value;
        const email = SecurityUtils.sanitizeInput(document.getElementById('studentEmail').value);
        const password = document.getElementById('studentPassword').value;
        const confirmPassword = document.getElementById('studentConfirmPassword').value;

        console.log('Form data:', { firstName, surname, studentClass, house, email });

        // Validation
        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid @stpeters.co.za email address.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match.', 'error');
            return;
        }

        // Enhanced password validation
        const passwordValidation = SecurityUtils.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            this.showMessage(`Password requirements not met: ${passwordValidation.errors.join(', ')}`, 'error');
            return;
        }

        // Check if email already exists
        if (this.allUsers.find(u => u.email === email)) {
            this.showMessage('An account with this email already exists.', 'error');
            return;
        }

        // Hash the password securely
        const hashedPassword = await SecurityUtils.hashPassword(password);

        // Create new student
        const newStudent = {
            id: Date.now().toString(),
            firstName: firstName,
            surname: surname,
            name: `${firstName} ${surname}`,
            email: email,
            password: hashedPassword, // Store hashed password
            type: 'student',
            class: studentClass,
            house: house,
            createdAt: new Date()
        };

        this.allUsers.push(newStudent);
        this.saveAllUsers();
        
        this.showMessage(`Student account created successfully! Password strength: ${passwordValidation.strength}. Please login.`, 'success');
        this.showLoginScreen();
    }

    async handleTeacherRegistration() {
        console.log('handleTeacherRegistration called');
        
        const firstName = SecurityUtils.sanitizeInput(document.getElementById('teacherFirstName').value);
        const surname = SecurityUtils.sanitizeInput(document.getElementById('teacherSurname').value);
        const email = SecurityUtils.sanitizeInput(document.getElementById('teacherEmail').value);
        const password = document.getElementById('teacherPassword').value;
        const confirmPassword = document.getElementById('teacherConfirmPassword').value;

        console.log('Teacher form data:', { firstName, surname, email });

        // Validation
        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid @stpeters.co.za email address.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match.', 'error');
            return;
        }

        // Enhanced password validation
        const passwordValidation = SecurityUtils.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            this.showMessage(`Password requirements not met: ${passwordValidation.errors.join(', ')}`, 'error');
            return;
        }

        // Check if email already exists
        if (this.allUsers.find(u => u.email === email)) {
            this.showMessage('An account with this email already exists.', 'error');
            return;
        }

        // Hash the password securely
        const hashedPassword = await SecurityUtils.hashPassword(password);

        // Create new teacher
        const newTeacher = {
            id: Date.now().toString(),
            firstName: firstName,
            surname: surname,
            name: `${firstName} ${surname}`,
            email: email,
            password: hashedPassword, // Store hashed password
            type: 'teacher',
            createdAt: new Date()
        };

        this.allUsers.push(newTeacher);
        this.saveAllUsers();
        
        this.showMessage(`Teacher account created successfully! Password strength: ${passwordValidation.strength}. Please login.`, 'success');
        this.showLoginScreen();
    }

    validateEmail(email) {
        return email.endsWith('@stpeters.co.za') && email.includes('@');
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('checkinUser');
        localStorage.removeItem('moodHistory');
        this.showLoginScreen();
        this.showMessage('Logged out successfully!', 'success');
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('registerScreen').classList.remove('active');
        document.getElementById('studentDashboardScreen').classList.remove('active');
        document.getElementById('teacherDashboardScreen').classList.remove('active');
        document.getElementById('navUser').style.display = 'none';
        
        // Clear form
        document.getElementById('loginForm').reset();
    }

    showRegisterScreen() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('registerScreen').classList.add('active');
        document.getElementById('studentDashboardScreen').classList.remove('active');
        document.getElementById('teacherDashboardScreen').classList.remove('active');
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
        } else {
            document.getElementById('teacherRegisterForm').classList.add('active');
        }
    }

    showDashboard() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('registerScreen').classList.remove('active');
        document.getElementById('navUser').style.display = 'flex';
        
        if (this.currentUser.type === 'student') {
            this.showStudentDashboard();
        } else {
            this.showTeacherDashboard();
        }
    }

    showStudentDashboard() {
        document.getElementById('studentDashboardScreen').classList.add('active');
        document.getElementById('teacherDashboardScreen').classList.remove('active');
        
        // Update user info
        document.getElementById('studentName').textContent = this.currentUser.name;
        document.getElementById('userName').textContent = this.currentUser.name;
        
        this.updateStatusDisplay();
        this.updateHistoryDisplay();
        this.updateStudentAnalytics();
    }

    showTeacherDashboard() {
        document.getElementById('studentDashboardScreen').classList.remove('active');
        document.getElementById('teacherDashboardScreen').classList.add('active');
        
        // Update user info
        document.getElementById('teacherName').textContent = this.currentUser.name;
        document.getElementById('userName').textContent = this.currentUser.name;
        
        this.updateTeacherView();
        this.updateTeacherAnalytics();
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

    handleMoodCheckIn() {
        if (!this.selectedMood) return;

        const notes = document.getElementById('moodNotes').value;
        const timestamp = new Date();
        
        const moodRecord = {
            id: Date.now(),
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            userClass: this.currentUser.class,
            userHouse: this.currentUser.house,
            mood: this.selectedMood.mood,
            emoji: this.selectedMood.emoji,
            timestamp: timestamp,
            notes: notes,
            type: 'mood-check-in'
        };

        this.moodHistory.unshift(moodRecord);
        this.allMoodHistory.unshift(moodRecord);
        
        this.saveHistory();
        this.saveAllMoodHistory();
        
        this.hideMoodModal();
        this.updateStatusDisplay();
        this.updateHistoryDisplay();
        
        if (this.currentUser.type === 'student') {
            this.updateStudentAnalytics();
        } else {
            this.updateTeacherAnalytics();
        }
        
        this.showMessage(`Mood recorded: ${this.selectedMood.emoji} ${this.selectedMood.mood}!`, 'success');
    }

    updateStatusDisplay() {
        const lastMoodElement = document.getElementById('lastMood');
        const todayCountElement = document.getElementById('todayCount');
        
        // Get the most recent mood check-in
        const lastMoodRecord = this.moodHistory.find(record => record.type === 'mood-check-in');
        
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
            record.type === 'mood-check-in' && 
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

    loadUserData() {
        const savedHistory = localStorage.getItem('moodHistory');
        if (savedHistory) {
            this.moodHistory = JSON.parse(savedHistory).map(record => ({
                ...record,
                timestamp: new Date(record.timestamp)
            }));
        }
    }

    loadAllUsers() {
        const savedUsers = localStorage.getItem('allUsers');
        if (savedUsers) {
            this.allUsers = JSON.parse(savedUsers).map(user => ({
                ...user,
                createdAt: new Date(user.createdAt)
            }));
        } else {
            this.allUsers = [];
        }

        const savedAllHistory = localStorage.getItem('allMoodHistory');
        if (savedAllHistory) {
            this.allMoodHistory = JSON.parse(savedAllHistory).map(record => ({
                ...record,
                timestamp: new Date(record.timestamp)
            }));
        } else {
            this.allMoodHistory = [];
        }
        
        // Add demo students that all teachers can see
        this.addDemoStudents();
    }

    addDemoStudents() {
        const demoStudents = [
            {
                id: 'demo-student-1',
                firstName: 'Emma',
                surname: 'Johnson',
                name: 'Emma Johnson',
                email: 'emma.johnson@stpeters.co.za',
                password: 'hashed-password-1',
                type: 'student',
                class: 'Grade 6',
                house: 'Mirfield',
                createdAt: new Date('2024-01-01')
            },
            {
                id: 'demo-student-2',
                firstName: 'Liam',
                surname: 'Smith',
                name: 'Liam Smith',
                email: 'liam.smith@stpeters.co.za',
                password: 'hashed-password-2',
                type: 'student',
                class: 'Grade 5',
                house: 'Bavin',
                createdAt: new Date('2024-01-01')
            },
            {
                id: 'demo-student-3',
                firstName: 'Sophia',
                surname: 'Brown',
                name: 'Sophia Brown',
                email: 'sophia.brown@stpeters.co.za',
                password: 'hashed-password-3',
                type: 'student',
                class: 'Grade 7',
                house: 'Sage',
                createdAt: new Date('2024-01-01')
            },
            {
                id: 'demo-student-4',
                firstName: 'Noah',
                surname: 'Davis',
                name: 'Noah Davis',
                email: 'noah.davis@stpeters.co.za',
                password: 'hashed-password-4',
                type: 'student',
                class: 'Grade 6',
                house: 'Bishops',
                createdAt: new Date('2024-01-01')
            },
            {
                id: 'demo-student-5',
                firstName: 'Olivia',
                surname: 'Wilson',
                name: 'Olivia Wilson',
                email: 'olivia.wilson@stpeters.co.za',
                password: 'hashed-password-5',
                type: 'student',
                class: 'Grade 5',
                house: 'Dodson',
                createdAt: new Date('2024-01-01')
            }
        ];

        // Only add demo students if they don't already exist
        demoStudents.forEach(demoStudent => {
            if (!this.allUsers.find(user => user.id === demoStudent.id)) {
                this.allUsers.push(demoStudent);
            }
        });

        // Add demo mood history for these students
        this.addDemoMoodHistory();
    }

    addDemoMoodHistory() {
        const demoMoods = [
            { studentId: 'demo-student-1', mood: 'happy', emoji: '😊', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
            { studentId: 'demo-student-2', mood: 'excited', emoji: '🤩', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) },
            { studentId: 'demo-student-3', mood: 'calm', emoji: '😌', timestamp: new Date(Date.now() - 30 * 60 * 1000) },
            { studentId: 'demo-student-4', mood: 'tired', emoji: '😴', timestamp: new Date(Date.now() - 45 * 60 * 1000) },
            { studentId: 'demo-student-5', mood: 'happy', emoji: '😊', timestamp: new Date(Date.now() - 15 * 60 * 1000) }
        ];

        // Only add demo moods if they don't already exist
        demoMoods.forEach(demoMood => {
            if (!this.allMoodHistory.find(mood => 
                mood.studentId === demoMood.studentId && 
                mood.timestamp.getTime() === demoMood.timestamp.getTime()
            )) {
                this.allMoodHistory.push(demoMood);
            }
        });

        this.saveAllMoodHistory();
    }

    saveHistory() {
        localStorage.setItem('moodHistory', JSON.stringify(this.moodHistory));
    }

    saveAllUsers() {
        localStorage.setItem('allUsers', JSON.stringify(this.allUsers));
    }

    saveAllMoodHistory() {
        localStorage.setItem('allMoodHistory', JSON.stringify(this.allMoodHistory));
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
        if (this.currentUser.type === 'student') {
            this.updateStudentAnalytics();
        } else {
            this.updateTeacherAnalytics();
        }
    }

    updateTeacherView() {
        const classFilter = document.getElementById('classFilter').value;
        const houseFilter = document.getElementById('houseFilter').value;
        const moodFilter = document.getElementById('moodFilter').value;

        const studentsList = document.getElementById('studentsList');
        if (!studentsList) return;

        let filteredStudents = this.allUsers.filter(user => user.type === 'student');

        if (classFilter) {
            filteredStudents = filteredStudents.filter(student => student.class === classFilter);
        }

        if (houseFilter) {
            filteredStudents = filteredStudents.filter(student => student.house === houseFilter);
        }

        studentsList.innerHTML = '';

        if (filteredStudents.length === 0) {
            studentsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No students found matching the selected filters.</p>';
            return;
        }

        filteredStudents.forEach(student => {
            const studentItem = document.createElement('div');
            studentItem.className = 'student-item';

            const lastMood = this.getLastMoodForStudent(student.id);
            const moodEmoji = lastMood ? lastMood.emoji : '😐';

            studentItem.innerHTML = `
                <div class="student-info">
                    <h4>${student.name}</h4>
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
    }

    getLastMoodForStudent(studentId) {
        return this.allMoodHistory
            .filter(record => record.userId === studentId)
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

    // Test function for debugging
    testRegistration() {
        console.log('Testing registration...');
        console.log('All users:', this.allUsers);
        console.log('Student form exists:', !!document.getElementById('studentRegisterForm'));
        console.log('Teacher form exists:', !!document.getElementById('teacherRegisterForm'));
        
        // Test student registration
        const testStudent = {
            id: 'test123',
            firstName: 'Test',
            surname: 'Student',
            name: 'Test Student',
            email: 'test@stpeters.co.za',
            password: 'password123',
            type: 'student',
            class: 'Grade 6',
            house: 'Mirfield',
            createdAt: new Date()
        };
        
        this.allUsers.push(testStudent);
        this.saveAllUsers();
        console.log('Test student added:', testStudent);
        this.showMessage('Test student added successfully!', 'success');
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, initializing app...');
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
