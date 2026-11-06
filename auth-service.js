// J.A.R.V.I.S. Authentication & RBAC Security Engine
const crypto = require('node:crypto');
const db = require('./db.js');

const SUPER_ADMIN_DEFAULT_USER = 'owner';
const SUPER_ADMIN_DEFAULT_PASS = 'Admin@Jarvis2026!';

// Helper: Hash password with PBKDF2
function hashPassword(password, salt = null) {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

function verifyPassword(password, hash, salt) {
  const calculated = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
}

// Generate Secure Session Token
function generateSessionToken() {
  return 'jst_' + crypto.randomBytes(32).toString('hex');
}

// Ensure Super Admin Owner account exists
function ensureSuperAdmin() {
  const existing = db.getUserByUsername(SUPER_ADMIN_DEFAULT_USER);
  if (!existing) {
    const { hash, salt } = hashPassword(SUPER_ADMIN_DEFAULT_PASS);
    const ownerId = 'usr_owner_master';
    const permissions = {
      all: true,
      can_chat: true,
      can_voice: true,
      can_image: true,
      can_camera: true,
      can_gallery: true,
      can_location: true,
      can_dev: true,
      can_admin: true,
      can_manage_users: true
    };

    db.createUser({
      id: ownerId,
      username: SUPER_ADMIN_DEFAULT_USER,
      displayName: 'Master Owner (Super Admin)',
      passwordHash: hash,
      salt,
      role: 'super_admin',
      permissions
    });

    db.logAuditAction(ownerId, SUPER_ADMIN_DEFAULT_USER, 'SYSTEM_INIT', 'Super Admin Master Account Created', '127.0.0.1');
    console.log('👑 Super Admin Master Account created [User: "owner"]');
  }
}

// User Login with Rate Limiting & Account Lockout
async function login(username, password, ipAddress = '', userAgent = '') {
  const cleanUsername = (username || '').toLowerCase().trim();

  // Check brute-force attempts (Max 5 failed attempts in 15 mins)
  const failedAttempts = db.getRecentFailedAttempts(ipAddress, cleanUsername);
  if (failedAttempts >= 5) {
    throw new Error('Account temporarily locked due to multiple failed login attempts. Try again in 15 minutes.');
  }

  const user = db.getUserByUsername(cleanUsername);
  if (!user || user.status !== 'active') {
    db.recordLoginAttempt(ipAddress, cleanUsername, false);
    throw new Error('Invalid username or password');
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    db.recordLoginAttempt(ipAddress, cleanUsername, false);
    db.logAuditAction(user.id, user.username, 'LOGIN_FAILED', 'Failed password attempt', ipAddress);
    throw new Error('Invalid username or password');
  }

  // Record successful login
  db.recordLoginAttempt(ipAddress, cleanUsername, true);

  // Create Crypto Auth Session
  const token = generateSessionToken();
  const session = db.createAuthSession(token, user.id, ipAddress, userAgent);

  db.logAuditAction(user.id, user.username, 'LOGIN_SUCCESS', 'Session created', ipAddress);

  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      permissions: user.permissions,
      isOwner: user.role === 'super_admin'
    },
    expiresAt: session.expiresAt
  };
}

// Extract Authenticated User from Request
function authenticateRequest(req) {
  let token = null;

  // 1. From Authorization Header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // 2. From Custom Header
  if (!token && req.headers['x-session-token']) {
    token = req.headers['x-session-token'];
  }

  // 3. From URL Query parameter (?token=...)
  if (!token && req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      token = parsed.searchParams.get('token');
    } catch (e) {}
  }

  if (!token) {
    // Return Anonymous / Default Normal User
    return {
      authenticated: false,
      user: {
        id: 'usr_guest',
        username: 'guest',
        displayName: 'Guest User',
        role: 'user',
        permissions: {
          can_chat: true,
          can_voice: true,
          can_image: true,
          can_camera: true,
          can_gallery: true,
          can_location: true,
          can_dev: false,
          can_admin: false
        },
        isOwner: false
      }
    };
  }

  const session = db.getAuthSession(token);
  if (!session) {
    return {
      authenticated: false,
      user: {
        id: 'usr_guest',
        username: 'guest',
        displayName: 'Guest User',
        role: 'user',
        permissions: { can_chat: true, can_voice: true, can_image: true, can_dev: false },
        isOwner: false
      }
    };
  }

  const user = db.getUserById(session.user_id);
  if (!user || user.status !== 'active') {
    db.deleteAuthSession(token);
    return { authenticated: false, user: null };
  }

  return {
    authenticated: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      permissions: user.permissions,
      isOwner: user.role === 'super_admin'
    }
  };
}

// Middleware: Require one of allowed roles
function requireRole(req, allowedRoles = []) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    const err = new Error('Authentication required. Please log in.');
    err.statusCode = 401;
    throw err;
  }

  // Super admin always has bypass access
  if (auth.user.role === 'super_admin') {
    return auth.user;
  }

  if (!allowedRoles.includes(auth.user.role)) {
    const err = new Error(`Access forbidden. Required role: ${allowedRoles.join(' or ')}`);
    err.statusCode = 403;
    throw err;
  }

  return auth.user;
}

// Middleware: Require specific permission
function requirePermission(req, permKey) {
  const auth = authenticateRequest(req);
  if (!auth.user) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }

  if (auth.user.role === 'super_admin') return auth.user;

  if (!auth.user.permissions || !auth.user.permissions[permKey]) {
    const err = new Error(`Permission denied: "${permKey}" is disabled for your account`);
    err.statusCode = 403;
    throw err;
  }

  return auth.user;
}

// Initialize Super Admin on load
ensureSuperAdmin();

module.exports = {
  SUPER_ADMIN_DEFAULT_USER,
  SUPER_ADMIN_DEFAULT_PASS,
  hashPassword,
  verifyPassword,
  login,
  authenticateRequest,
  requireRole,
  requirePermission
};
