/**
 * Auth routes: register, login, me, logout.
 * Factory: pass pool, config, and optional authLimiter (for login).
 */
const express = require('express');
const bcrypt = require('bcryptjs');

function createAuthRouter({ pool, config, authLimiter }) {
  const router = express.Router();

  const registrationPasswordRequired = config.auth.registrationPassword;

  router.post('/register', async (req, res) => {
    if (!pool) {
      return res.status(503).json({ success: false, error: 'Database not available' });
    }
    try {
      const { firstName, surname, email, password, userType, class: studentClass, house, grades, registrationPassword } = req.body;

      if (!firstName || !surname || !email || !password || !userType) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      if (!email.endsWith('@stpeters.co.za')) {
        return res.status(400).json({ success: false, error: 'Email must be a @stpeters.co.za address' });
      }
      if (userType === 'teacher' || userType === 'director') {
        if (!registrationPassword) {
          return res.status(400).json({ success: false, error: 'Registration password is required for teacher and director accounts' });
        }
        if (!registrationPasswordRequired || registrationPassword !== registrationPasswordRequired) {
          return res.status(403).json({ success: false, error: 'Invalid registration password' });
        }
      }
      if (userType === 'teacher' && (!grades || !Array.isArray(grades) || grades.length === 0 || !house)) {
        return res.status(400).json({ success: false, error: 'Teachers must specify at least one grade and house assignment' });
      }

      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'User with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userClass = userType === 'teacher' ? grades[0] : studentClass;
      const result = await pool.query(
        'INSERT INTO users (first_name, surname, email, password_hash, user_type, class, house) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, first_name, surname, email, user_type, class, house, created_at',
        [firstName, surname, email, passwordHash, userType, userClass, house]
      );
      const userId = result.rows[0].id;

      if (userType === 'teacher') {
        for (const grade of grades) {
          await pool.query(
            'INSERT INTO teacher_assignments (teacher_id, grade, house) VALUES ($1, $2, $3)',
            [userId, grade, house]
          );
        }
      }

      res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const loginHandler = async (req, res) => {
    if (!pool) {
      return res.status(503).json({ success: false, error: 'Database not available' });
    }
    try {
      const email = (req.body.email && typeof req.body.email === 'string') ? req.body.email.trim() : '';
      const password = req.body.password;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }
      if (password.length > 500) {
        return res.status(400).json({ success: false, error: 'Invalid request' });
      }

      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const { password_hash, ...userWithoutPassword } = user;
      req.session.user = userWithoutPassword;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  if (authLimiter) {
    router.post('/login', authLimiter, loginHandler);
  } else {
    router.post('/login', loginHandler);
  }

  router.get('/me', (req, res) => {
    if (req.session && req.session.user) {
      return res.json({ success: true, user: req.session.user });
    }
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout session destroy error:', err);
        return res.status(500).json({ success: false, error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  return router;
}

module.exports = { createAuthRouter };
