// netlify/functions/lib/password.js
// Helper bcrypt per password hashing
// Tierra OS v9.5 — Security Hardening

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;
const MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH || '12', 10);

/**
 * Genera hash bcrypt di una password.
 * @param {string} plainPassword
 * @returns {Promise<string>} hash bcrypt
 */
async function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length < MIN_LENGTH) {
    throw new Error(`Password must be at least ${MIN_LENGTH} characters`);
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verifica password contro hash bcrypt.
 * @param {string} plainPassword
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plainPassword, hash) {
  if (!plainPassword || !hash) return false;
  try {
    return await bcrypt.compare(plainPassword, hash);
  } catch (err) {
    return false;
  }
}

/**
 * Valida requisiti policy password (lunghezza minima + mix char).
 * @param {string} password
 * @returns {{ok:boolean, error?:string}}
 */
function validatePasswordPolicy(password) {
  if (typeof password !== 'string') {
    return { ok: false, error: 'Password non valida' };
  }
  if (password.length < MIN_LENGTH) {
    return { ok: false, error: `Password deve essere almeno ${MIN_LENGTH} caratteri` };
  }
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const score = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (score < 3) {
    return {
      ok: false,
      error: 'Password deve contenere almeno 3 tra: minuscole, maiuscole, numeri, simboli',
    };
  }
  return { ok: true };
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  MIN_LENGTH,
  SALT_ROUNDS,
};
