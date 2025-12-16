# 📚 Its OK - Student Check-In App

A modern, responsive web application for student check-ins at school and home. Built as a Progressive Web App (PWA) that can be installed on mobile devices and deployed to app stores.

## ✨ Features

- 🔐 **Secure Login System** - Student authentication with demo credentials
- 📍 **Location-Based Check-In** - Check in at school or home
- 📊 **Real-Time Dashboard** - View current status and recent activity
- 📱 **Mobile-First Design** - Responsive design that works on all devices
- 🚀 **PWA Ready** - Can be installed as a native app
- 💾 **Offline Support** - Works even without internet connection
- 🎨 **Modern UI/UX** - Beautiful, intuitive interface

## 🚀 Getting Started

### Prerequisites
- Node.js (version 10.15.3 or higher)
- npm (version 6.4.1 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd checkinapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Railway Postgres (so local server uses Railway data)**

   - In Railway, open your **Postgres** plugin → **Connect**
   - Copy the **public** connection string (you must be able to reach it from your laptop)
   - In this repo root, create a `.env` file by copying `env.example`:

   ```bash
   # macOS/Linux
   cp env.example .env
   ```

   Then edit `.env` and set:

   ```text
   DATABASE_URL=postgresql://...
   DATABASE_SSL=true
   ```

   **Windows PowerShell (one-off, no .env file):**
   ```powershell
   $env:DATABASE_URL="postgresql://..."
   $env:DATABASE_SSL="true"
   npm run dev
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`
   - The app will automatically open in your default browser

## 🧱 Database migrations (optional)

If you need to apply schema changes to the Railway database:

```bash
npm run migrate
```

## 🔑 Demo Credentials

For testing purposes, use these demo credentials:
- **Student ID:** `demo123`
- **Password:** `password`

## 📱 PWA Installation

### On Mobile Devices:
1. Open the app in your mobile browser
2. Look for "Add to Home Screen" or "Install App" option
3. Tap to install the app on your device

### On Desktop:
1. Open the app in Chrome/Edge
2. Look for the install icon in the address bar
3. Click to install as a desktop app

## 🛠️ Building for Production

```bash
npm run build
```

This will create an optimized build ready for deployment.

## 📦 Play Store Deployment

This app is built as a PWA and can be packaged for the Google Play Store using tools like:
- **PWA Builder** (https://www.pwabuilder.com/)
- **Capacitor** (https://capacitorjs.com/)
- **Cordova** (https://cordova.apache.org/)

## 🎯 Features Overview

### Student Dashboard
- Welcome message with current time
- Check-in status for school and home
- Quick check-in/check-out buttons
- Recent activity history

### Check-In Process
- Select location (School or Home)
- Add optional notes
- Automatic timestamp recording
- Location permission request for future features

### Data Persistence
- Local storage for user sessions
- Check-in history tracking
- Offline functionality

## 🔧 Customization

### Adding New Users
Edit the `handleLogin()` function in `app.js` to add more demo users or integrate with a real authentication system.

### Styling
Modify `styles.css` to customize the app's appearance, colors, and layout.

### Features
Extend the `CheckInApp` class in `app.js` to add new functionality like:
- Parent/teacher dashboards
- Attendance reports
- Push notifications
- Real-time synchronization

## 📱 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

## 🚀 Future Enhancements

- [ ] Real user authentication system
- [ ] Parent/teacher dashboard
- [ ] Attendance reports and analytics
- [ ] Push notifications for reminders
- [ ] Real-time data synchronization
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] QR code check-in
- [ ] GPS location verification

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support or questions, please open an issue in the repository or contact the development team.

---

**Built with ❤️ for students and educators**
