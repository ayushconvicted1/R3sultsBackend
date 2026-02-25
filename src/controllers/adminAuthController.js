const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ─── POST /login ───
exports.post_auth_login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await prisma.opsUser.findFirst({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Your account is not active. Please contact administrator.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const displayName = user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    const token = generateToken({
      userId: user.id.toString(),
      email: user.email,
      role: user.role,
      name: displayName,
    });

    // Set HTTP-only cookie
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: displayName,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.profilePhoto || user.avatar,
          status: user.status,
        },
        token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── GET /me ───
exports.get_auth_me = async (req, res, next) => {
  try {
    const tokenPayload = req.user;

    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Support both 'id' and 'userId' from different token formats
    const userId = tokenPayload.userId || tokenPayload.id;
    const user = await prisma.opsUser.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const name = user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.profilePhoto || user.avatar,
          status: user.status,
          address: user.address,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── POST /logout ───
exports.post_auth_logout = async (req, res, next) => {
  res.clearCookie('auth-token', { path: '/' });
  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
};
