const { getAdmins, saveAdmin } = require('../services/dataService');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const admins = await getAdmins();
    const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase());

    if (admin && admin.password === password) {
      return res.json({
        success: true,
        message: 'Login successful',
        user: { email: admin.email, role: 'Administrator' }
      });
    }

    // Default demo fallback
    if (email === 'admin@example.com' && password === 'admin') {
      return res.json({
        success: true,
        message: 'Login successful',
        user: { email, role: 'Administrator' }
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    next(err);
  }
};

const signup = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const admins = await getAdmins();
    if (admins.some(a => a.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    await saveAdmin(email, password);

    return res.json({
      success: true,
      message: 'Registration successful. You can now log in.',
      user: { email, role: 'Administrator' }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  signup
};
