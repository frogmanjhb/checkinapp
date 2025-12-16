# REACT - Mood Check-In and Well-Being System

## Comprehensive Application Overview

### Overview

REACT is a comprehensive mood check-in and well-being system designed for educational institutions. The platform enables students, teachers, and directors to track emotional wellness, communicate, and maintain a supportive school environment. Built as a Progressive Web App (PWA) with a modern, responsive design, REACT facilitates emotional awareness and communication across the school community.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [User Roles](#user-roles)
3. [Core Features](#core-features)
4. [Student Features](#student-features)
5. [Teacher Features](#teacher-features)
6. [Director Features](#director-features)
7. [Messaging System](#messaging-system)
8. [Database Schema](#database-schema)
9. [Technology Stack](#technology-stack)
10. [API Endpoints](#api-endpoints)
11. [Security Features](#security-features)
12. [Privacy Features](#privacy-features)

---

## System Architecture

### Frontend
- **Framework**: Vanilla JavaScript (ES6+)
- **UI/UX**: Custom CSS with modern design principles
- **Architecture**: Single Page Application (SPA) with dynamic screen management
- **PWA**: Progressive Web App capabilities with service worker support
- **Responsive Design**: Mobile-first approach, works on all device sizes

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL (deployed on Railway)
- **Authentication**: bcryptjs for password hashing
- **Security**: Helmet.js for security headers, CORS enabled

### Data Flow
```
User Action → Frontend (app-api.js) → API Request → Backend (backend.js) → PostgreSQL Database
                                                           ↓
User Interface ← Response Processing ← JSON Response ← Database Query Results
```

---

## User Roles

### 1. Student
- Primary users who track their daily moods and well-being
- Can check in anonymously (Ghost Mode)
- Access to personal analytics and journal entries
- Ability to message teachers directly

### 2. Teacher
- View aggregated student mood data (anonymized when in Ghost Mode)
- Access to students in assigned grades and houses
- Personal mood tracking and journaling
- Receive and respond to student messages
- View analytics for their assigned students, grades, and house

### 3. Director
- School-wide oversight and analytics
- View all student and teacher data
- Access to comprehensive analytics across all grades and houses
- Receive copies of all student-to-teacher messages
- Full system visibility

---

## Core Features

### Authentication & Registration
- Secure user registration with role-based forms
- Email validation (must be @stpeters.co.za domain)
- Strong password requirements:
  - Minimum 8 characters
  - Uppercase and lowercase letters
  - Numbers and special characters
- Password strength indicator
- Session management with localStorage

### User Management
- Three distinct user types with role-based access
- Student registration: Grade and House assignment
- Teacher registration: Multiple grade assignments and house assignment
- Director registration: Full system access
- Unique email constraint per user

---

## Student Features

### Mood Check-In System

#### Available Moods
Students can select from 8 different moods:
- 😊 **Happy** - Feeling good and positive
- 🤩 **Excited** - Energetic and enthusiastic
- 😌 **Calm** - Peaceful and relaxed
- 😴 **Tired** - Fatigued or sleepy
- 😰 **Anxious** - Worried or nervous
- 😢 **Sad** - Feeling down or upset
- 😠 **Angry** - Frustrated or irritated
- 😕 **Confused** - Uncertain or puzzled

#### Check-In Process
1. **Mood Selection**: Choose primary mood with emoji representation
2. **Emotion Selection**: Select multiple related emotions
3. **Location Tracking**: 
   - School
   - Home
   - Other (with custom input)
4. **Context Reasons**: Select factors affecting mood
   - School reasons: Friends, Teacher, School Work, Tests, Sports, Classmates
   - Home reasons: Parents, Siblings, Family, Sleep, Food, Health
5. **Optional Notes**: Add additional context or thoughts

#### Ghost Mode (Anonymous Check-In)
- Privacy feature allowing anonymous mood tracking
- Teachers see mood data but not student identity
- Toggle available on student dashboard
- Visual indicators throughout check-in process
- Maintains privacy while contributing to aggregate analytics

### Personal Dashboard

#### Bento Grid Layout
Modern card-based layout with:
- **Mood Check-In Card**: Quick access to check-in with status display
- **Mood Analytics Card**: Visual charts and statistics
  - Daily, Weekly, Monthly views
  - Mood distribution charts
  - Trend analysis
- **Recent Activity Card**: History of recent check-ins
- **Journal Entries Card**: List of personal journal entries

#### Status Display
- Last recorded mood with emoji
- Today's check-in count
- Ghost Mode indicator (when active)

### Journal System
- Create personal journal entries
- Timestamped entries with full history
- Character counter
- Private to student (not visible to teachers)
- Encouragement modal after mood check-ins

### Analytics & Insights
- Personal mood trends over time
- Period-based views (Daily, Weekly, Monthly)
- Chart.js integration for data visualization
- Mood distribution analysis
- Historical mood patterns

---

## Teacher Features

### Teacher Dashboard

#### Personal Mood Tracking
- Same mood check-in system as students
- Teacher-specific reason categories:
  - Student Behavior
  - Workload & Planning
  - Colleagues & Staff
  - Administration
  - Parent Communication
  - Curriculum & Standards
  - Resources & Materials
  - Professional Development

#### Student Monitoring

**Filter System:**
- Filter by assigned House
- Filter by assigned Grade(s)
- View students in assigned areas only

**Student List:**
- Clickable student cards showing:
  - Student name
  - Grade and House
  - Last mood check-in
  - Check-in history access

**Analytics Views:**
- **Student Analytics**: Aggregate mood data for assigned students
- **Grade Analytics**: Mood distribution by grade
- **House Analytics**: Mood distribution by house assignment
- All analytics respect Ghost Mode anonymity

### Teacher Assignments
- Multiple grade assignments per teacher
- Single house assignment per teacher
- Assignment-based data access control
- Flexible grade coverage (e.g., Grade 5, 6, 7)

### Personal Journaling
- Private teacher journal entries
- Same journal interface as students
- Personal reflection and note-taking

### Messaging
- Receive messages from students
- Reply functionality
- Unread message notifications
- Message center access from navbar

---

## Director Features

### Director Dashboard

#### Overview Cards
Clickable modal cards for:
- **Grade Cards**: Grade 5, 6, 7
  - Top mood display
  - Student count
  - Click to view detailed analytics
- **House Cards**: Mirfield, Bavin, Sage, Bishops, Dodson
  - House-specific mood data
  - Student distribution
- **Teachers Card**: Overall teacher statistics

#### Comprehensive Analytics

**Charts & Visualizations:**
- Mood distribution by House (large chart)
- Mood distribution by Grade (large chart)
- Chart.js integration for interactive graphs
- Period filtering (Daily, Weekly, Monthly)
- Export functionality for data analysis

**Detailed Views:**
- Click any card for detailed breakdown
- Student-level data access
- Teacher mood tracking visibility
- Time-series analysis

### System-Wide Access
- View all students and teachers
- Access to all mood check-in data
- Complete journal entry visibility (with permissions)
- Full messaging visibility (receives copies of student-teacher messages)

### Data Export
- Export chart data functionality
- Analytics period selection
- Comprehensive reporting capabilities

---

## Messaging System

### Features

#### Student-to-Teacher Messaging
- **Talk to a Teacher** button on student dashboard
- Teacher selection interface
- Direct message composition
- Messages automatically sent to:
  1. Selected teacher
  2. Director (Justin Atlee) - automatic copy

#### Message Center
- **Universal Access**: Available to all user types via navbar
- **Conversation View**: 
  - Grouped by individual conversations
  - Latest message preview
  - Unread message indicators
  - Time-stamped messages
- **Thread View**:
  - Full conversation history
  - Message bubbles (sent/received styling)
  - Reply functionality
  - Automatic read status updates

#### Notifications
- **Navbar Badge**: Unread message count
- **Dashboard Banners**: 
  - Teacher dashboard: Glowing red notification banner
  - Director dashboard: Glowing red notification banner
- **Auto-hide**: Banners disappear when all messages are read

#### Message Features
- Real-time unread count tracking
- Mark as read on view
- Conversation threading
- Message history persistence
- User identification in conversations

---

## Database Schema

### Tables

#### `users`
- User authentication and profile data
- Role-based user types: student, teacher, director
- Fields: id, first_name, surname, email, password_hash, user_type, class, house, created_at, updated_at

#### `teacher_assignments`
- Multiple grade/house assignments for teachers
- Fields: id, teacher_id, grade, house, created_at
- Enables teachers to be assigned to multiple grades

#### `mood_checkins`
- All mood check-in records
- Fields: id, user_id, mood, emoji, notes, location, reasons (array), emotions (array), timestamp, created_at
- Supports rich context data

#### `journal_entries`
- Personal journal entries
- Fields: id, user_id, entry, timestamp, created_at
- Private to user

#### `messages`
- Message communication records
- Fields: id, from_user_id, to_user_id, message, is_read, thread_id, timestamp, created_at
- Supports conversation threading
- Read/unread status tracking

### Indexes
- Performance indexes on frequently queried fields
- Foreign key relationships with CASCADE deletes
- Timestamp indexes for time-based queries

---

## Technology Stack

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with gradients, animations, flexbox, grid
- **JavaScript (ES6+)**: Class-based architecture, async/await, fetch API
- **Chart.js**: Data visualization library
- **PWA**: Service worker, manifest.json, offline capabilities

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **PostgreSQL**: Relational database
- **bcryptjs**: Password hashing
- **pg**: PostgreSQL client library
- **dotenv**: Environment variable management
- **helmet**: Security middleware
- **cors**: Cross-origin resource sharing

### Deployment
- **Railway**: Database hosting (PostgreSQL)
- **Static Hosting**: Frontend and backend on same server
- **Environment Variables**: Secure configuration management

---

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User authentication

### Mood Check-Ins
- `POST /api/mood-checkin` - Create mood check-in
- `GET /api/mood-history/:userId` - Get user's mood history
- `GET /api/all-mood-checkins` - Get all check-ins (teachers)
- `GET /api/director/all-mood-data` - Get all mood data (director)

### Journal Entries
- `POST /api/journal-entry` - Create journal entry
- `GET /api/journal-entries/:userId` - Get user's journal entries
- `GET /api/director/all-journal-entries` - Get all journal entries (director)

### Users & Students
- `GET /api/students` - Get students list (with filters)
- `GET /api/teacher/students/:teacherId` - Get teacher's assigned students
- `GET /api/teacher/assignments/:teacherId` - Get teacher's grade/house assignments
- `GET /api/director/all-users` - Get all users (director)

### Analytics
- `GET /api/teacher/grade-analytics` - Get grade-level analytics

### Messaging
- `GET /api/teachers` - Get all teachers (for student selection)
- `POST /api/messages` - Send a message
- `GET /api/messages/:userId` - Get user's messages
- `PUT /api/messages/:messageId/read` - Mark message as read
- `GET /api/messages/:userId/unread-count` - Get unread message count

---

## Security Features

### Authentication Security
- Password hashing with bcryptjs (10 salt rounds)
- Secure session management
- Email domain validation (@stpeters.co.za required)
- Strong password enforcement

### Data Security
- SQL injection prevention (parameterized queries)
- XSS protection (input sanitization)
- CORS configuration
- Helmet.js security headers
- Environment variable protection

### Access Control
- Role-based access control (RBAC)
- Teacher data scoping (assigned grades/houses only)
- Student data privacy (Ghost Mode)
- Director-only endpoints

---

## Privacy Features

### Ghost Mode (Anonymous Check-In)
- Students can enable anonymous mood tracking
- Teachers see aggregated data without student identity
- Visual indicators throughout interface
- Privacy-first design philosophy
- Maintains data value while protecting identity

### Data Visibility Rules
- **Students**: See only their own data
- **Teachers**: See data for assigned grades/houses only
- **Anonymous Data**: Ghost Mode check-ins show data without identity
- **Director**: Full system access (administrative role)

### Message Privacy
- Direct messaging between students and teachers
- Director receives copies for oversight
- Message history accessible only to participants
- Read status tracking

---

## UI/UX Design

### Design Principles
- **Modern & Clean**: Minimalist design with vibrant colors
- **Responsive**: Mobile-first, works on all screen sizes
- **Accessible**: Clear typography, high contrast, intuitive navigation
- **Engaging**: Emoji-based interactions, smooth animations
- **Professional**: School-appropriate aesthetic

### Color Scheme
- Primary: Blue (#2196F3) - Trust, calm
- Secondary: Purple (#9C27B0) - Creativity, reflection
- Accent: Red/Pink (#FF6B6B) - Energy, emotion
- Success: Green - Positive feedback
- Warning: Orange - Notifications
- Error: Red - Alerts

### Component Library
- Gradient buttons with borders
- Modal dialogs with animations
- Card-based layouts (Bento grid)
- Status indicators
- Badge notifications
- Responsive navigation

---

## File Structure

```
checkinapp/
├── index.html              # Main HTML structure
├── app-api.js             # Frontend JavaScript (main application logic)
├── backend.js             # Backend server (Express.js, API routes)
├── styles.css             # All styling and responsive design
├── package.json           # Node.js dependencies
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker (offline support)
├── migrate-database.js    # Database migration script
├── env.example            # Environment variable template
├── DEPLOYMENT.md          # Deployment documentation
├── README.md              # Quick start guide
├── APP_OVERVIEW.md        # This comprehensive overview
└── icons/                 # PWA icons (multiple sizes)
```

---

## Key Workflows

### Student Check-In Flow
1. Student logs in
2. Navigate to dashboard
3. Click "How are you feeling?" button
4. Select mood → Select emotions → Choose location → Add reasons → Optional notes
5. Submit check-in
6. Optional: Enable Ghost Mode for anonymity
7. View analytics and history

### Teacher Monitoring Flow
1. Teacher logs in
2. View dashboard with assigned students
3. Filter by House or Grade
4. Click student to view details
5. View aggregate analytics
6. Monitor mood trends
7. Receive and respond to student messages

### Director Overview Flow
1. Director logs in
2. View overview cards (Grades, Houses, Teachers)
3. Click card for detailed analytics
4. View charts and visualizations
5. Export data for analysis
6. Monitor all student-teacher communications

### Messaging Flow
1. Student clicks "Talk to a Teacher"
2. Select teacher from list
3. Compose message
4. Send (automatically copied to director)
5. Teacher receives notification banner
6. Teacher views in Message Center
7. Teacher replies
8. Conversation thread maintained

---

## Future Enhancement Ideas

### Gamification (Planned)
- Badge/achievement system
- Streak tracking rewards
- Milestone celebrations
- Progress indicators

### Analytics Enhancements
- Predictive analytics
- Trend forecasting
- Comparative analysis
- Custom report generation

### Communication Features
- Push notifications
- Email notifications
- Parent portal access
- Group messaging

### Additional Features
- Mood reminders/scheduling
- Wellness resources integration
- Crisis intervention workflows
- Multi-language support
- Dark mode theme
- Advanced filtering options

---

## Support & Maintenance

### Demo Credentials
- **Student**: demo@stpeters.co.za / password
- **Teacher**: teacher@stpeters.co.za / teacher123!
- **Director**: jatlee@stpeters.co.za / director123!

### Database Management
- Automatic table initialization on server start
- Migration script available for schema updates
- Index optimization for performance
- Connection pooling for efficiency

### Error Handling
- Comprehensive error logging
- User-friendly error messages
- Graceful degradation
- Database connection error handling

---

## Technical Specifications

### Performance
- Optimized database queries with indexes
- Efficient data loading strategies
- Chart.js for performant visualizations
- Responsive image loading

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- PWA support requirements
- Progressive enhancement approach

### Accessibility
- Semantic HTML structure
- Keyboard navigation support
- Screen reader considerations
- High contrast color schemes
- Clear focus indicators

---

## Development Notes

### Code Organization
- Modular class-based architecture
- Separation of concerns (API, UI, data)
- Reusable utility functions
- Consistent naming conventions

### Best Practices
- Parameterized SQL queries
- Input validation and sanitization
- Error handling and logging
- Responsive design patterns
- Accessibility considerations

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained by**: REACT Development Team

